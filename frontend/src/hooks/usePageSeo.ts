import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLangStore, isNativeLang } from '@/stores/langStore';
import { hreflangAlternates, localizedPath, pageCanonical, type StoreLang } from '@/utils/seoPaths';
import { useSettingsStore } from '@/stores/settingsStore';

const pathToKey: Record<string, string> = {
  '/': 'home',
  '/shop': 'shop',
  '/blog': 'blog',
  '/faq': 'faq',
  '/contact': 'contact',
  '/labresults': 'labresults',
  '/reviews': 'reviews',
  '/terms': 'terms',
  '/shipping': 'shipping',
  '/about': 'about',
};

export function usePageSeo(innerPath?: string, query = '') {
  const location = useLocation();
  const lang = useLangStore((s) => s.lang);
  const seoOverrides = useSettingsStore((s) => s.seoOverrides);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const fetched = useSettingsStore((s) => s.fetched);

  useEffect(() => {
    if (!fetched) fetchSettings();
  }, [fetched, fetchSettings]);

  return useMemo(() => {
    const path = innerPath ?? location.pathname;
    const search = query || location.search;
    const activeLang: StoreLang = isNativeLang(lang) ? (lang as StoreLang) : 'nl';
    const canonical = pageCanonical(path, search);
    const alternates = hreflangAlternates(path, search);

    const baseRoute = path.split('?')[0];
    const key = pathToKey[baseRoute] || '';
    const editable = key && seoOverrides[key] ? seoOverrides[key][activeLang] : undefined;

    return { canonical, alternates, path, editable, pageKey: key || undefined };
  }, [innerPath, query, location.pathname, location.search, lang, seoOverrides]);
}
