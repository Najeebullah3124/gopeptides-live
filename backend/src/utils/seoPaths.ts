import { siteUrl } from '../services/seoService';

export type StoreLang = 'en' | 'nl' | 'de';

export type SeoPageKey =
  | 'home'
  | 'shop'
  | 'labresults'
  | 'blog'
  | 'faq'
  | 'contact'
  | 'reviews'
  | 'terms'
  | 'shipping'
  | 'about'
  | 'privacy';

const VALID_LANGS = new Set<StoreLang>(['en', 'nl', 'de']);

/** Fixed storefront segments per language (req #2). Cart/checkout/admin stay English. */
export const PAGE_PATHS: Record<Exclude<SeoPageKey, 'home'>, Record<StoreLang, string>> = {
  shop: { en: 'shop', nl: 'winkel', de: 'shop' },
  labresults: { en: 'lab-results', nl: 'labresultaten', de: 'laborergebnisse' },
  blog: { en: 'blog', nl: 'blog', de: 'blog' },
  faq: { en: 'faq', nl: 'veelgestelde-vragen', de: 'faq' },
  contact: { en: 'contact', nl: 'contact', de: 'kontakt' },
  reviews: { en: 'reviews', nl: 'reviews', de: 'bewertungen' },
  terms: { en: 'terms', nl: 'voorwaarden', de: 'agb' },
  shipping: { en: 'shipping', nl: 'verzending', de: 'versand' },
  about: { en: 'about', nl: 'over-ons', de: 'ueber-uns' },
  privacy: { en: 'privacy', nl: 'privacy', de: 'datenschutz' },
};

/** All first-path segments that are pages (not product slugs), any language. */
export const RESERVED_PAGE_SEGMENTS: string[] = Array.from(
  new Set(Object.values(PAGE_PATHS).flatMap((m) => Object.values(m))),
);

const SEGMENT_TO_KEY = new Map<string, SeoPageKey>();
for (const [key, byLang] of Object.entries(PAGE_PATHS) as Array<[Exclude<SeoPageKey, 'home'>, Record<StoreLang, string>]>) {
  for (const seg of Object.values(byLang)) SEGMENT_TO_KEY.set(seg, key);
}

export function pathForLang(pageKey: SeoPageKey, lang: StoreLang, rest?: string): string {
  if (pageKey === 'home') return '/';
  const seg = PAGE_PATHS[pageKey][lang];
  const r = rest?.replace(/^\/+|\/+$/g, '');
  return r ? `/${seg}/${r}` : `/${seg}`;
}

export function categoryPath(lang: StoreLang, slugForLang: string): string {
  return pathForLang('shop', lang, slugForLang);
}

export function blogPath(lang: StoreLang, slugForLang?: string): string {
  return pathForLang('blog', lang, slugForLang);
}

export function labResultsPath(lang: StoreLang, slug?: string): string {
  return pathForLang('labresults', lang, slug);
}

export interface ResolvedLocalizedPath {
  pageKey: SeoPageKey | null;
  /** First segment if it matched a known page key */
  segment: string | null;
  /** Remainder after the page segment (category slug, post slug, …) */
  rest: string;
  /** Path using English canonical segments (for internal SEO matchers) */
  canonicalInner: string;
}

/**
 * Map any-language pathname to a page key + rest.
 * Unknown first segments → pageKey null (product PDP / other).
 */
export function resolveLocalizedPath(pathname: string): ResolvedLocalizedPath {
  const raw = (pathname || '/').split('?')[0] || '/';
  const parts = raw.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length === 0) {
    return { pageKey: 'home', segment: null, rest: '', canonicalInner: '/' };
  }
  const seg = parts[0].toLowerCase();
  const pageKey = SEGMENT_TO_KEY.get(seg) ?? null;
  if (!pageKey) {
    return { pageKey: null, segment: seg, rest: parts.slice(1).join('/'), canonicalInner: `/${parts.join('/')}` };
  }
  const rest = parts.slice(1).join('/');
  const enSeg = pageKey === 'home' ? '' : PAGE_PATHS[pageKey].en;
  const canonicalInner = rest ? `/${enSeg}/${rest}` : `/${enSeg}`;
  return { pageKey, segment: seg, rest, canonicalInner };
}

/** Rewrite a path's localized segments into the target language (keeps rest slug as-is). */
export function rewritePathForLang(pathname: string, lang: StoreLang): string {
  const { pageKey, rest } = resolveLocalizedPath(pathname);
  if (!pageKey || pageKey === 'home') return pageKey === 'home' ? '/' : pathname;
  return pathForLang(pageKey, lang, rest || undefined);
}

/** Default locale per TLD — bare URL without ?lang= maps to this language. */
export function defaultLangForHost(host?: string): StoreLang {
  const bare = host?.replace(/^www\./i, '').split(':')[0].toLowerCase() ?? '';
  if (bare.endsWith('.de')) return 'de';
  if (bare.endsWith('.eu')) return 'en';
  return 'nl';
}

/** Read lang from ?lang=, else TLD default (.de→de, .eu→en, else nl). */
export function parseStoreUrl(pathname: string, search = '', host?: string): { lang: StoreLang; path: string } {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const raw = params.get('lang') ?? '';
  if (VALID_LANGS.has(raw as StoreLang)) {
    return { lang: raw as StoreLang, path: pathname || '/' };
  }
  const bare = host?.replace(/^www\./i, '').split(':')[0].toLowerCase() ?? '';
  if (bare.endsWith('.de')) return { lang: 'de', path: pathname || '/' };
  if (bare.endsWith('.eu')) return { lang: 'en', path: pathname || '/' };
  return { lang: 'nl', path: pathname || '/' };
}

/**
 * Merge lang into the query string and rewrite storefront segments for that lang.
 * Host default -> bare URL without ?lang=.
 */
export function localizedPath(innerPath: string, lang: StoreLang, existingQuery = '', host?: string): string {
  const rewritten = rewritePathForLang(innerPath.split('?')[0] || '/', lang);
  const params = new URLSearchParams(existingQuery.replace(/^\?/, ''));
  const defaultLang = defaultLangForHost(host);
  if (lang === defaultLang) {
    params.delete('lang');
  } else {
    params.set('lang', lang);
  }
  const q = params.toString();
  return q ? `${rewritten}?${q}` : rewritten;
}

export function absoluteUrl(innerPath: string, lang: StoreLang, existingQuery = '', base?: string): string {
  const host = base ? new URL(base).hostname : undefined;
  return `${base ?? siteUrl()}${localizedPath(innerPath, lang, existingQuery, host)}`;
}

const LANG_CANONICAL_DOMAIN: Partial<Record<StoreLang, string>> = {
  de: 'gopeptides.de',
  en: 'gopeptides.eu',
};

/** Fixed canonical base URL for a language, independent of the requesting host. */
export function canonicalBaseForLang(lang: StoreLang): string {
  const domain = LANG_CANONICAL_DOMAIN[lang];
  return domain ? `https://${domain}` : siteUrl();
}

/** @deprecated Prefer categoryPath(lang, slug). Kept for call sites mid-migration. */
export function categoryShopPath(slug: string, lang: StoreLang = 'en'): string {
  return categoryPath(lang, slug);
}

/** Strip ?category= from query; category belongs in the path. */
export function queryWithoutCategory(existingQuery = ''): string {
  const params = new URLSearchParams(existingQuery.replace(/^\?/, ''));
  params.delete('category');
  const q = params.toString();
  return q ? `?${q}` : '';
}

export interface SeoAlternate {
  hreflang: string;
  href: string;
}

/**
 * Hreflang for a path: rewrite segments per language.
 * Optional restByLang supplies per-lang category/blog slugs.
 */
export function hreflangAlternates(
  innerPath: string,
  existingQuery = '',
  restByLang?: Partial<Record<StoreLang, string>>,
): SeoAlternate[] {
  const resolved = resolveLocalizedPath(innerPath);
  const langs: StoreLang[] = ['en', 'nl', 'de'];
  const alts: SeoAlternate[] = langs.map((lang) => {
    let path: string;
    if (resolved.pageKey && resolved.pageKey !== 'home') {
      const rest = restByLang?.[lang] ?? resolved.rest;
      path = pathForLang(resolved.pageKey, lang, rest || undefined);
    } else if (resolved.pageKey === 'home') {
      path = '/';
    } else {
      // Product PDP etc. — shared path
      path = resolved.canonicalInner.startsWith('/') ? resolved.canonicalInner : `/${resolved.canonicalInner}`;
    }
    return {
      hreflang: lang,
      href: absoluteUrl(path, lang, existingQuery, canonicalBaseForLang(lang)),
    };
  });
  const nlPath =
    resolved.pageKey && resolved.pageKey !== 'home'
      ? pathForLang(resolved.pageKey, 'nl', (restByLang?.nl ?? resolved.rest) || undefined)
      : resolved.pageKey === 'home'
        ? '/'
        : resolved.canonicalInner;
  alts.push({
    hreflang: 'x-default',
    href: absoluteUrl(nlPath, 'nl', existingQuery, canonicalBaseForLang('nl')),
  });
  return alts;
}

export function hreflangAlternatesForKey(
  pageKey: SeoPageKey,
  restByLang?: Partial<Record<StoreLang, string>>,
  existingQuery = '',
): SeoAlternate[] {
  const sample = pathForLang(pageKey, 'en', restByLang?.en);
  return hreflangAlternates(sample, existingQuery, restByLang);
}

/** Pick slug for a lang from seoData-style fields; fall back to primary. */
export function slugForLang(
  primary: string,
  seo: { slugEn?: string | null; slugDe?: string | null } | null | undefined,
  lang: StoreLang,
): string {
  if (lang === 'en' && seo?.slugEn?.trim()) return seo.slugEn.trim();
  if (lang === 'de' && seo?.slugDe?.trim()) return seo.slugDe.trim();
  return primary;
}

/** @deprecated No-op — kept so old call sites compile without changes. */
export function stripLangPrefix(pathname: string): string {
  return pathname;
}
