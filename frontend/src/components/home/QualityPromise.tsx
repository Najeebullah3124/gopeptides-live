import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { fadeUp, stagger, viewport } from '@/utils/animations';

export function QualityPromise({ h2s }: { h2s?: [string | undefined, string | undefined] }) {
  const { t } = useT();
  const navigate = useNavigate();

  const CARDS: Array<{ title: string; desc: string; cta: string; to: string; photo: string; alt: string }> = [
    {
      title: h2s?.[0] || t('quality.s1.title'),
      desc: t('quality.s1.desc'),
      cta: t('quality.s1.cta'),
      to: '/blog',
      photo: '/photos/quality-tested.webp',
      alt: 'Peptiden als ketens van aminozuren, de bouwstenen van eiwitten',
    },
    {
      title: h2s?.[1] || t('quality.s2.title'),
      desc: t('quality.s2.desc'),
      cta: t('quality.s2.cta'),
      to: '/shop',
      photo: '/photos/quality-consistent.webp',
      alt: 'Gelyofiliseerde peptiden bewaard in de vriezer bij -20°C voor maximale stabiliteit',
    },
  ];

  return (
    <motion.section
      className="section-pad quality-section"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <div className="quality-grid">
        {CARDS.map((c) => (
          <motion.div
            key={c.photo}
            className="quality-card"
            variants={fadeUp}
            style={{ backgroundImage: `url(${c.photo})` }}
          >
            <div className="quality-card-overlay" />
            <div className="quality-card-content">
              <h2 className="quality-card-title">{c.title}</h2>
              <p className="quality-card-desc">{c.desc}</p>
              <button className="btn-cta quality-card-btn" onClick={() => navigate(c.to)}>
                {c.cta}
                <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
