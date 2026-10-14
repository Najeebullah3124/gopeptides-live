import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/hooks/useT';
import { fadeUp, stagger, viewport } from '@/utils/animations';

export function FAQSection() {
  const navigate = useNavigate();
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(0);

  const FAQ: Array<[string, string]> = [
    [t('faq.q1'), t('faq.a1')],
    [t('faq.q2'), t('faq.a2')],
    [t('faq.q3'), t('faq.a3')],
    [t('faq.q4'), t('faq.a4')],
  ];

  return (
    <motion.section
      className="section-pad faq-section-border"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      <div className="faq-grid">
        <motion.div variants={fadeUp}>
          <div className="eyebrow">{t('faq.eyebrow')}</div>
          <h2 className="section-h2 faq-title">
            {t('faq.title')}
          </h2>
          <p className="faq-subtitle">{t('faq.subtitle')}</p>
          <button className="btn-out" onClick={() => navigate('/faq')}>
            {t('faq.viewAll')}
          </button>
        </motion.div>

        <motion.div variants={fadeUp}>
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={q} className="faq-row" onClick={() => setOpen(isOpen ? null : i)}>
                <div className="faq-row-header">
                  <span className="faq-question">{q}</span>
                  <span className={`faq-toggle${isOpen ? ' faq-toggle-open' : ''}`}>
                    +
                  </span>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="faq-answer">{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </motion.section>
  );
}
