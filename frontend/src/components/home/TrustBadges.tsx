import { useT } from '@/hooks/useT';

export function TrustBadges() {
  const { t, lang } = useT();

  const BADGES: Array<{ label: string; sub: string; noTranslate?: boolean }> = [
    { label: t('trust.hplc'), sub: t('trust.hplc.sub') },
    { label: t('trust.purity'), sub: t('trust.purity.sub') },
    { label: t('trust.coa'), sub: t('trust.coa.sub'), noTranslate: lang === 'nl' },
    { label: t('trust.delivery'), sub: t('trust.delivery.sub') },
  ];

  return (
    <section className="trust-bar trust-bar-bordered">
      <div className="trust-badges-list">
        {BADGES.map((badge, idx) => (
          <div
            key={idx}
            className={badge.noTranslate ? 'trust-badge-item notranslate' : 'trust-badge-item'}
            translate={badge.noTranslate ? 'no' : undefined}
          >
            <div className="trust-badge-label">
              <span className="trust-badge-dot" />
              {badge.label}
            </div>
            <div className="trust-badge-sub">{badge.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
