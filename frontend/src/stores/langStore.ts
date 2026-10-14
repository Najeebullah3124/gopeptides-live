import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LANGS, type Lang } from '@/i18n/translations';

const STORAGE_KEY = 'gp-lang';

const NATIVE_LANGS: Lang[] = ['en', 'nl', 'de'];

/** Whether a lang code has full manual translations */
export function isNativeLang(lang: Lang): boolean {
  return NATIVE_LANGS.includes(lang);
}

function domainLang(): Lang | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host.endsWith('.de')) return 'de';
  if (host.endsWith('.nl') || host.endsWith('.be')) return 'nl';
  if (host.endsWith('.eu')) return 'en';
  return null;
}

const validCodes = new Set(LANGS.map((l) => l.code));

function langFromUrl(): Lang | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('lang');
  if (raw && validCodes.has(raw as Lang)) return raw as Lang;
  return domainLang();
}

function initialLang(): Lang {
  const fromUrl = langFromUrl();
  if (fromUrl) return fromUrl;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const lang = (parsed as { state?: { lang?: string } })?.state?.lang as Lang | undefined;
      if (lang && validCodes.has(lang)) return lang;
    }
  } catch {
    // ignore parse errors
  }
  return 'nl';
}

function applyDocumentLang(lang: Lang): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = isNativeLang(lang) ? lang : 'en';
  }
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: initialLang(),
      setLang: (lang) => {
        set({ lang });
        applyDocumentLang(lang);
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        const lang = langFromUrl() ?? state?.lang ?? 'nl';
        if (state) state.lang = lang;
        applyDocumentLang(lang);
      },
    },
  ),
);
