import { Link, useLocation } from 'react-router-dom';
import { useT } from '@/hooks/useT';
import { useEffect, useState } from 'react';

export default function NotFoundPage() {
  const { t } = useT();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(`/api/seo/check-redirect?path=${encodeURIComponent(location.pathname)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.redirect) {
          window.location.replace(data.redirect);
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [location.pathname]);

  if (checking) return null;

  return (
    <div className="container-app py-24 text-center" style={{ padding: 'clamp(48px, 8vw, 96px) clamp(16px, 5vw, 40px)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-4">{t('notFound.code')}</p>
      <h1 className="text-5xl font-extrabold text-ink mb-4" style={{ fontSize: 'clamp(32px, 6vw, 56px)' }}>
        {t('notFound.title')}
      </h1>
      <p className="text-ink-muted mb-8 max-w-md mx-auto">{t('notFound.desc')}</p>
      <Link to="/" className="btn-cta lg">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
