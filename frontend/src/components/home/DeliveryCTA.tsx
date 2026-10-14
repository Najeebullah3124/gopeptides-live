import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { fadeUp, stagger, viewport } from '@/utils/animations';

export function DeliveryCTA() {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <motion.section
      className="delivery-cta-section"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      {/* Background photo — delivery box image provided by client */}
      <div
        className="delivery-cta-bg"
        style={{ backgroundImage: 'url(/photos/subscribe.webp)' }}
        role="img"
        aria-label="GoPeptides snelle levering — pakket klaar voor verzending"
      />
      <div className="delivery-cta-overlay" />

      <motion.div className="delivery-cta-content" variants={fadeUp}>
        <div className="eyebrow delivery-cta-eyebrow">{t('trust.delivery')}</div>
        <h2 className="delivery-cta-title">
          {t('cta.title')}
        </h2>
        <p className="delivery-cta-sub">
          {t('cta.subtitle')}
        </p>
        <button className="btn-cta lg delivery-cta-btn" onClick={() => navigate('/shop')}>
          {t('btn.browseAll')}
          <Icon name="arrowRight" size={16} />
        </button>
      </motion.div>
    </motion.section>
  );
}
