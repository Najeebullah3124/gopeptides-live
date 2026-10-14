export type StoreLang = 'en' | 'nl' | 'de';

const VALID_LANGS = new Set<StoreLang>(['en', 'nl', 'de']);

export function defaultLangForHost(host?: string): StoreLang {
  const bare = host?.replace(/^www\./i, '').split(':')[0].toLowerCase() ?? '';
  if (bare.endsWith('.de')) return 'de';
  return 'nl';
}

function currentHost(): string {
  return typeof window !== 'undefined' ? window.location.hostname : '';
}

/** Read lang from ?lang=, else TLD default (.de→de, else nl). */
export function parseStoreUrl(pathname: string, search = ''): { lang: StoreLang; path: string } {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const raw = params.get('lang') ?? '';
  if (VALID_LANGS.has(raw as StoreLang)) {
    return { lang: raw as StoreLang, path: pathname || '/' };
  }
  return { lang: defaultLangForHost(currentHost()), path: pathname || '/' };
}

export function localizedPath(innerPath: string, lang: StoreLang, existingQuery = '', host?: string): string {
  const p = innerPath.startsWith('/') ? innerPath : `/${innerPath}`;
  const params = new URLSearchParams(existingQuery.replace(/^\?/, ''));
  const defaultLang = defaultLangForHost(host ?? currentHost());
  if (lang === defaultLang) {
    params.delete('lang');
  } else {
    params.set('lang', lang);
  }
  const q = params.toString();
  return q ? `${p}?${q}` : p;
}

export interface SeoAlternate {
  hreflang: string;
  href: string;
}

export function hreflangAlternates(innerPath: string, existingQuery = ''): SeoAlternate[] {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const host = origin ? new URL(origin).hostname : undefined;
  const defaultLang = defaultLangForHost(host);
  const langs: StoreLang[] = ['en', 'nl', 'de'];
  const alts: SeoAlternate[] = langs.map((lang) => ({
    hreflang: lang,
    href: `${origin}${localizedPath(innerPath, lang, existingQuery, host)}`,
  }));
  alts.push({
    hreflang: 'x-default',
    href: `${origin}${localizedPath(innerPath, defaultLang, existingQuery, host)}`,
  });
  return alts;
}

export function pageCanonical(pathname: string, search = ''): string {
  const { lang } = parseStoreUrl(pathname, search);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${localizedPath(pathname, lang, search, origin ? new URL(origin).hostname : undefined)}`;
}

const PRIVATE_PATH = /^\/(admin|account|login|register|verify-email|reset-password|checkout|cart)/;

/** Keep user-selected lang across SPA navigations; sync ?lang= when needed. */
export function resolveNavLang(
  pathname: string,
  search: string,
  storeLang: string,
  host?: string,
): { lang: string; syncPath?: string } {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const explicit = params.get('lang');
  const defaultLang = defaultLangForHost(host);

  if (explicit && VALID_LANGS.has(explicit as StoreLang)) {
    return { lang: explicit };
  }

  if (VALID_LANGS.has(storeLang as StoreLang)) {
    const native = storeLang as StoreLang;
    if (native !== defaultLang && !PRIVATE_PATH.test(pathname)) {
      const target = localizedPath(pathname, native, search, host);
      const current = `${pathname}${search}`;
      if (target !== current) return { lang: native, syncPath: target };
    }
    return { lang: native };
  }

  // ponytail: extended EU langs (fr, es, …) use Google Translate — no ?lang= in URL
  return { lang: storeLang };
}

/** @deprecated No-op — kept for compatibility. */
export function stripLangPrefix(pathname: string): string {
  return pathname;
}
