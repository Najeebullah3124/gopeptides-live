import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { fadeUp, stagger, viewport } from '@/utils/animations';

interface Feature {
  title: string;
  desc: string;
  icon: string;
  cta: string;
  to: string;
  photo: string;
  alt?: string;
}

export function WhyUs({ h2 }: { h2?: string }) {
  const { t } = useT();
  const navigate = useNavigate();

  const FEATURES: Feature[] = [
    {
      title: t('why.tested.title'),
      desc: t('why.tested.desc'),
      icon: 'beaker',
      cta: t('why.tested.cta'),
      to: '/shop',
      photo: '/photos/why-tested.webp?v=2',
      alt: 'Extern labresultaat — peptiden getest op zuiverheid met HPLC en massaspectrometrie.',
    },
    {
      title: t('why.docs.title'),
      desc: t('why.docs.desc'),
      icon: 'document',
      cta: t('why.docs.cta'),
      to: '/labresults',
      photo: '/photos/why-docs.webp?v=2',
      alt: 'Analysecertificaat (CoA) met chromatogram en batchnummer voor peptiden',
    },
    {
      title: t('why.logistics.title'),
      desc: t('why.logistics.desc'),
      icon: 'truck',
      cta: t('why.logistics.cta'),
      to: '/shop',
      photo: '/photos/why-logistics.webp?v=2',
      alt: 'Peptiden op voorraad in een Nederlands magazijn, klaar voor snelle verzending',
    },
  ];

  return (
    <motion.section
      className="section-pad why-section-border"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <motion.div className="why-header" variants={fadeUp}>
        <div className="eyebrow">{t('why.eyebrow')}</div>
        <h2 className="section-h2" dangerouslySetInnerHTML={{ __html: h2 || t('why.title') }} />
      </motion.div>

      <div className="why-grid">
        {FEATURES.map((f) => (
          <motion.div key={f.icon} className="card-static why-feature-card" variants={fadeUp}>
            <div className="why-feature-photo">
              <img
                src={f.photo}
                alt={f.alt ?? ''}
                loading="lazy"
                decoding="async"
                width={640}
                height={420}
                className="why-feature-photo-img"
              />
              <div className="why-feature-photo-overlay" />
              <span className="why-feature-photo-icon">
                <Icon name={f.icon} size={24} />
              </span>
            </div>
            <div className="why-feature-content">
              <h3 className="why-feature-title">{f.title}</h3>
              <p className="why-feature-desc">{f.desc}</p>
              <button className="btn-out why-feature-btn" onClick={() => navigate(f.to)}>
                {f.cta}
                <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
