import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/hooks/useT';

const STORAGE_KEY = 'gp_cookie_consent_v1';

export type CookieConsentValue = 'accepted' | 'rejected';

export function getCookieConsent(): CookieConsentValue | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function CookieConsent({ onChange }: { onChange?: (v: CookieConsentValue) => void }) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getCookieConsent());
  }, []);

  const choose = (v: CookieConsentValue) => {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    setVisible(false);
    onChange?.(v);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('cookies.title')}
      className="fixed bottom-0 inset-x-0 z-[90] p-4 md:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 md:p-6">
        <h2 className="text-base font-bold text-ink mb-2">{t('cookies.title')}</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-4">
          {t('cookies.body')}{' '}
          <Link to="/privacy" className="text-primary font-semibold underline-offset-2 hover:underline">
            {t('cookies.privacyLink')}
          </Link>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => choose('rejected')}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-ink-muted hover:bg-slate-50"
          >
            {t('cookies.reject')}
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary-dark"
          >
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
