import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SITE_NAME } from '@/constants';
import { useLangStore, isNativeLang } from '@/stores/langStore';
import type { StoreLang } from '@/utils/seoPaths';
import { parseStoreUrl } from '@/utils/seoPaths';

const OG_LOCALE: Record<string, string> = { en: 'en_GB', nl: 'nl_NL', de: 'de_DE' };

export interface SEOOptions {
  title: string;
  description?: string;
  image?: string;
  canonical?: string;
  keywords?: string[];
  noindex?: boolean;
  alternates?: Array<{ hreflang: string; href: string }>;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

interface SeoContextValue {
  setOptions: (options: SEOOptions | null) => void;
}

const SeoContext = createContext<SeoContextValue | null>(null);

function formatTitle(title: string): string {
  const clean = title.trim();
  if (!clean) return SITE_NAME;
  if (clean.toLowerCase().includes(SITE_NAME.toLowerCase())) return clean;
  if (clean.length > 58) return clean;
  return `${clean} — ${SITE_NAME}`;
}

function syncSeoHead(options: SEOOptions | null): void {
  if (typeof document === 'undefined') return;

  // ponytail: drop SSR head tags before client-managed SEO to avoid duplicate canonical/hreflang
  document.head.querySelectorAll('[data-seo-ssr="true"]').forEach((node) => node.remove());

  const { lang } = parseStoreUrl(window.location.pathname, window.location.search);
  const storeLang = useLangStore.getState().lang;
  const seoLang: StoreLang = isNativeLang(storeLang) ? (storeLang as StoreLang) : lang;
  document.documentElement.lang = isNativeLang(storeLang) ? storeLang : 'en';

  const title = formatTitle(options?.title || SITE_NAME);
  document.title = title;

  const removeManaged = () => {
    document.head.querySelectorAll('[data-seo-managed="true"]').forEach((node) => node.remove());
  };

  const removeManagedJsonLd = () => {
    document.head.querySelectorAll('script[type="application/ld+json"][data-seo-managed="true"]').forEach((node) => node.remove());
  };

  if (!options) {
    removeManaged();
    removeManagedJsonLd();
    return;
  }

  const ensureMeta = (selector: string, create: () => HTMLMetaElement, content: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = create();
      el.dataset.seoManaged = 'true';
      document.head.appendChild(el);
    }
    el.dataset.seoManaged = 'true';
    el.setAttribute('content', content);
  };

  const ensureLink = (selector: string, create: () => HTMLLinkElement, href: string) => {
    let el = document.head.querySelector<HTMLLinkElement>(selector);
    if (!el) {
      el = create();
      el.dataset.seoManaged = 'true';
      document.head.appendChild(el);
    }
    el.dataset.seoManaged = 'true';
    el.href = href;
  };

  ensureMeta('meta[http-equiv="content-language"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('http-equiv', 'content-language');
    return el;
  }, seoLang);

  ensureMeta('meta[property="og:locale"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:locale');
    return el;
  }, OG_LOCALE[seoLang] || 'nl_NL');

  ensureMeta('meta[name="description"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'description');
    return el;
  }, options.description || '');

  if (options.keywords?.length) {
    ensureMeta('meta[name="keywords"]', () => {
      const el = document.createElement('meta');
      el.setAttribute('name', 'keywords');
      return el;
    }, options.keywords.join(', '));
  }

  ensureMeta('meta[name="robots"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    return el;
  }, options.noindex ? 'noindex,nofollow' : 'index,follow');

  ensureMeta('meta[property="og:title"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:title');
    return el;
  }, title);

  ensureMeta('meta[property="og:type"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:type');
    return el;
  }, 'website');

  ensureMeta('meta[property="og:site_name"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:site_name');
    return el;
  }, SITE_NAME);

  ensureMeta('meta[property="og:description"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:description');
    return el;
  }, options.description || '');

  ensureMeta('meta[property="og:image"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:image');
    return el;
  }, options.image || `${window.location.origin}/logo.jpeg`);

  ensureMeta('meta[name="twitter:card"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:card');
    return el;
  }, options.image ? 'summary_large_image' : 'summary');

  ensureMeta('meta[name="twitter:title"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:title');
    return el;
  }, title);

  ensureMeta('meta[name="twitter:description"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:description');
    return el;
  }, options.description || '');

  ensureMeta('meta[name="twitter:image"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:image');
    return el;
  }, options.image || `${window.location.origin}/logo.jpeg`);

  if (options.canonical) {
    ensureLink('link[rel="canonical"]', () => {
      const el = document.createElement('link');
      el.rel = 'canonical';
      return el;
    }, options.canonical);
  }

  for (const alt of options.alternates || []) {
    ensureLink(`link[rel="alternate"][hreflang="${alt.hreflang}"]`, () => {
      const el = document.createElement('link');
      el.rel = 'alternate';
      el.hreflang = alt.hreflang;
      return el;
    }, alt.href);
  }

  document.head.querySelectorAll('link[rel="alternate"][data-seo-managed="true"]').forEach((link) => {
    const hreflang = link.getAttribute('hreflang');
    if (!hreflang) return;
    if (!options.alternates?.some((alt) => alt.hreflang === hreflang)) link.remove();
  });

  removeManagedJsonLd();
  const jsonLd = Array.isArray(options.jsonLd) ? options.jsonLd : options.jsonLd ? [options.jsonLd] : [];
  for (const item of jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoManaged = 'true';
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}

export function SeoProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<SEOOptions | null>(null);
  const value = useMemo(() => ({ setOptions }), []);

  useEffect(() => {
    document.getElementById('seo-prerender')?.remove();
  }, []);

  useEffect(() => {
    syncSeoHead(options);
  }, [options]);

  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

export function useSEO(options: SEOOptions): void {
  const ctx = useContext(SeoContext);
  useEffect(() => {
    if (!ctx) return undefined;
    ctx.setOptions(options);
    return () => ctx.setOptions(null);
  }, [ctx, options.title, options.description, options.image, options.canonical, options.noindex, options.keywords?.join(','), options.alternates?.map((a) => `${a.hreflang}:${a.href}`).join('|'), Array.isArray(options.jsonLd) ? JSON.stringify(options.jsonLd) : JSON.stringify(options.jsonLd)]);
}
