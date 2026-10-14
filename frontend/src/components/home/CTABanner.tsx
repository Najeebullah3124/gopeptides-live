import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '@/hooks/useT';
import { scaleIn, viewport } from '@/utils/animations';

export function CTABanner() {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <section className="section-pad cta-section-border">
      <motion.div
        className="cta-banner cta-banner-inner"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <div className="cta-text-block">
          <h2 className="section-h2 cta-title">
            {t('cta.title')}
          </h2>
          <p className="cta-subtitle">{t('cta.subtitle')}</p>
        </div>
        <button className="btn-cta lg" onClick={() => navigate('/shop')}>
          {t('cta.button')}
        </button>
      </motion.div>
    </section>
  );
}
