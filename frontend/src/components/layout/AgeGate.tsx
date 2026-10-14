import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { useT } from '@/hooks/useT';

const STORAGE_KEY = 'gp-age-verified';

export function AgeGate() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    try {
      // Prevent search engine crawlers from getting locked out of page content and indexing the agegate text
      const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent);
      if (isBot) {
        setOpen(false);
        return;
      }
      if (localStorage.getItem(STORAGE_KEY) !== 'yes') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  // Prevent the page behind the gate from scrolling while it is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'yes');
    } catch {
      /* ignore */
    }
    setOpen(false);
    window.dispatchEvent(new CustomEvent('age-verified'));
  };

  return (
    <>
      {open && (
        <div
          className="agegate-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agegate-title"
        >
          <div className="agegate-card">
            <div className="agegate-logo">
              <Logo large />
            </div>
            <div className="agegate-badge">18+</div>
            <h2 id="agegate-title" className="agegate-title">
              {t('agegate.title')}
            </h2>
            <p className="agegate-text">{t('agegate.body')}</p>
            <p className="agegate-note">{t('agegate.research')}</p>

            {!denied ? (
              <div className="agegate-actions">
                <button className="btn-cta lg agegate-btn" onClick={accept}>
                  {t('agegate.confirm')}
                </button>
                <button className="btn-out agegate-btn" onClick={() => setDenied(true)}>
                  {t('agegate.deny')}
                </button>
              </div>
            ) : (
              <div className="agegate-denied">{t('agegate.deniedMsg')}</div>
            )}

            <p className="agegate-legal">{t('agegate.legal')}</p>
          </div>
        </div>
      )}
    </>
  );
}
