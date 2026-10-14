import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useLangStore, isNativeLang } from '@/stores/langStore';
import { localizedPath } from '@/utils/seoPaths';
import type { Lang } from '@/i18n/translations';
import type { StoreLang } from '@/utils/seoPaths';

const LANG_DOMAIN: Partial<Record<StoreLang, string>> = { de: 'gopeptides.de', en: 'gopeptides.eu' };

/**
 * Each language lives on its own domain and the server redirects there. Carry GA4's cross-domain
 * linker parameter (_gl) along so the visit stays one session instead of a new "(direct)" one.
 * gtag adds _gl to a link on mousedown, so a hidden link to the target domain is used to obtain it.
 */
function withGaLinker(target: string, lang: StoreLang, pathname: string): string {
  try {
    const link = document.createElement('a');
    link.href = `https://${LANG_DOMAIN[lang] || 'gopeptides.nl'}${pathname}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    const gl = new URL(link.href).searchParams.get('_gl');
    document.body.removeChild(link);
    if (!gl) return target;
    const url = new URL(target);
    url.searchParams.set('_gl', gl);
    return url.toString();
  } catch {
    return target;
  }
}

export function useSetLang() {
  const location = useLocation();
  const setLang = useLangStore((s) => s.setLang);

  return useCallback((lang: Lang) => {
    setLang(lang);
    if (isNativeLang(lang)) {
      const isPrivate = /^\/(admin|account|login|register|verify-email|reset-password|checkout|cart)/.test(location.pathname);
      if (!isPrivate) {
        const target = `${window.location.origin}${localizedPath(location.pathname, lang as StoreLang, location.search)}${location.hash}`;
        const current = `${window.location.origin}${location.pathname}${location.search}`;
        if (target.split('#')[0] !== current) {
          window.location.assign(withGaLinker(target, lang as StoreLang, location.pathname));
        }
      }
    }
  }, [setLang, location.pathname, location.search, location.hash]);
}
