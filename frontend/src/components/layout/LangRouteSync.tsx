import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLangStore, isNativeLang } from '@/stores/langStore';
import { resolveNavLang } from '@/utils/seoPaths';
import type { Lang } from '@/i18n/translations';

/** Syncs lang store on navigation and preserves user choice across internal links. */
export function LangRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const setLang = useLangStore((s) => s.setLang);

  useEffect(() => {
    const { lang, syncPath } = resolveNavLang(
      location.pathname,
      location.search,
      useLangStore.getState().lang,
    );

    if (syncPath) {
      navigate(`${syncPath}${location.hash}`, { replace: true });
      return;
    }

    setLang(lang as Lang);
    document.documentElement.lang = isNativeLang(lang as Lang) ? lang : 'en';
  }, [location.pathname, location.search, location.hash, setLang, navigate]);

  return null;
}
