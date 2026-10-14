import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useLangStore } from '@/stores/langStore';

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text) return text;
  const { data } = await api.post('/translate', {
    title: text,
    excerpt: '',
    content: '',
    targetLang,
  });
  return (data as { data?: { title?: string } }).data?.title ?? text;
}

/**
 * Auto-translates a single string using the free Google Translate backend.
 * Returns the original text immediately and updates once the translation arrives.
 * Caches by (text, lang) so the same string is never translated twice per session.
 */
export function useAutoTranslate(text: string): string {
  const lang = useLangStore((s) => s.lang);
  // nl and de have manual content translations; en is the base language.
  // Extended EU langs are handled by the Google Translate widget, not the API.
  const needsTranslation = (lang === 'nl' || lang === 'de');

  const { data } = useQuery({
    queryKey: ['translate', lang, text?.slice(0, 80)],
    queryFn: () => translateText(text, lang),
    enabled: needsTranslation && !!text && text.length > 3,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  return data ?? text;
}
