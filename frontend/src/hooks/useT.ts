import { useCallback } from 'react';
import { useLangStore } from '@/stores/langStore';
import { tr, type Lang } from '@/i18n/translations';

export function useT() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => tr(lang, key, vars),
    [lang],
  );

  return { t, lang, setLang } as { t: typeof t; lang: Lang; setLang: (l: Lang) => void };
}
