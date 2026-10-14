import { useLangStore } from '@/stores/langStore';
import { LANGS, type Lang } from '@/i18n/translations';
import { useSetLang } from '@/hooks/useSetLang';
import { cn } from '@/utils/helpers';

interface LangToggleProps {
  variant?: 'pill' | 'select';
}

export function LangToggle({ variant = 'pill' }: LangToggleProps) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useSetLang();

  if (variant === 'select') {
    return (
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="field lang-select-compact notranslate"
        translate="no"
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option className="notranslate" translate="no" key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="lang-toggle-group notranslate"
      translate="no"
    >
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={cn('lang-pill notranslate', lang === l.code && 'active')}
          translate="no"
        >
          <span className="notranslate" translate="no">{l.flag}</span>
        </button>
      ))}
    </div>
  );
}
