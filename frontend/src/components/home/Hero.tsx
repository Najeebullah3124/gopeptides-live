import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/hooks/useT';
import { GoogleReviewBadge } from '@/components/ui/GoogleReviewBadge';

export function Hero({ h1 }: { h1?: string }) {
  const navigate = useNavigate();
  const { t } = useT();
  const [allowVideo, setAllowVideo] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // Client wants bottle hero video on mobile too (was desktop-only for PageSpeed).
    // Still skip when browser Save-Data is on.
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setAllowVideo(!connection?.saveData);
  }, []);

  // Mount the (1.6MB, autoplaying) video only after the page has fully loaded, so its
  // download never competes with LCP — the gradient fallback has no image/video element,
  // so it's never picked as the LCP candidate while this is pending.
  useEffect(() => {
    if (!allowVideo) {
      setShowVideo(false);
      return;
    }
    if (document.readyState === 'complete') {
      setShowVideo(true);
      return;
    }
    const onLoad = () => setShowVideo(true);
    window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, [allowVideo]);

  // 3 stats: purity, delivery (24h with sub-label), CoA — reviews removed per client
  const STATS: Array<{ value: string; label: string }> = [
    { value: '99%+', label: t('hero.stat.purity') },
    { value: t('hero.stat.delivery'), label: t('hero.stat.deliverySub') },
    { value: 'CoA', label: t('hero.stat.coa') },
  ];

  return (
    <section className="hero-section hero-section-clip">
      {/* Background */}
      <div className="hero-bg-layer">
        {showVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/logo-336.webp"
            className="hero-bg-video"
            src="/hero-background.mp4"
            aria-hidden="true"
          />
        ) : (
          <div className="hero-bg-still" aria-hidden="true" />
        )}
        <div className="hero-bg-overlay" />
      </div>

      <GoogleReviewBadge aggregate={false} labelType="google" className="hidden lg:flex absolute top-8 right-8 z-20" />

      {/* Text content */}
      <div className="hero-content">
        <div className="eyebrow hero-eyebrow">
          {t('hero.eyebrow')}
        </div>

        <h1 className="hero-h1 hero-headline">
          {h1 ? h1 : (
            <>
              {t('hero.headline1')}
              <br />
              <span className="text-grad">{t('hero.headline2')}</span>
            </>
          )}
        </h1>

        <p className="hero-subtitle">
          {t('hero.subtitle')}
        </p>

        <div className="hero-cta-row">
          <button className="btn-cta lg" onClick={() => navigate('/shop')}>
            {t('hero.cta')}
          </button>
          <button
            className="btn-out hero-lab-btn"
            style={{ backgroundColor: '#FFFFFF', color: '#0D7377', borderColor: '#0D7377', border: '2px solid #0D7377', fontWeight: '700' }}
            onClick={() => navigate('/labresults')}
          >
            {t('hero.lab')}
          </button>
        </div>

        <div className="hero-stats-row">
          {STATS.map((s) => (
            <div key={s.value} className="hero-stat">
              <div className="hero-stat-value">{s.value}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
