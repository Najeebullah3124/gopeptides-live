import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { FAQPage, WithContext } from 'schema-dts';
import { JsonLd } from '@/components/seo/JsonLd';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useSEO } from '@/hooks/useSEO';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/helpers';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function FAQPage() {
  const { t, lang } = useT();
  const pageSeo = usePageSeo('/faq');
  const seo = lang === 'nl'
    ? { title: 'FAQ Onderzoekspeptiden en COA | GoPeptides', description: 'Vind antwoorden over HPLC-geteste onderzoekspeptiden, COA-documenten, verzending en bestellingen bij GoPeptides. Ons supportteam helpt graag verder.' }
    : lang === 'de'
      ? { title: 'FAQ Forschungspeptide und COA | GoPeptides', description: 'Antworten zu HPLC-geprueften Forschungspeptiden, COA-Dokumenten, Versand und Bestellungen bei GoPeptides. Unser Supportteam hilft gern weiter.' }
      : { title: 'Research Peptide FAQ and COA Help | GoPeptides', description: 'Find answers about HPLC-tested research peptides, COA documents, shipping, and orders at GoPeptides. Our support team is ready to help.' };
  useSEO({
    title: pageSeo.editable?.title || seo.title,
    description: pageSeo.editable?.description || seo.description,
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates
  });
  const [open, setOpen] = useState<number | null>(0);

  const items: Array<[string, string]> = [
    [t('faq.q1'), t('faq.a1')],
    [t('faq.q2'), t('faq.a2')],
    [t('faq.q3'), t('faq.a3')],
    [t('faq.q4'), t('faq.a4')],
    [t('faq.q5'), t('faq.a5')],
    [t('faq.q6'), t('faq.a6')],
    [t('faq.q7'), t('faq.a7')],
    [t('faq.q8'), t('faq.a8')],
    [t('faq.q9'), t('faq.a9')],
  ];

  const faqJsonLd: WithContext<FAQPage> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url: pageSeo.canonical,
  };

  return (
    <div className="container-app section-pad max-w-3xl">
      <JsonLd data={[faqJsonLd, pageJsonLd]} />
      <header className="text-center mb-10">
        <p className="eyebrow">{t('faq.pageEyebrow')}</p>
        <h1 className="text-4xl font-extrabold text-ink mb-3 faq-page-title">
          {pageSeo.editable?.h1 || t('faq.pageTitle')}
        </h1>
        <p className="text-ink-muted max-w-xl mx-auto">
          {t('faq.pageSub')}{' '}
          <Link to="/contact" className="text-primary hover:text-primary-light font-semibold">
            {t('nav.contact')}
          </Link>
        </p>
      </header>

      <div className="space-y-2.5">
        {items.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div
              key={q}
              className={cn('faq-row', isOpen && 'border-primary/40')}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[15px] font-bold text-ink">{pageSeo.editable?.h2?.[i] || q}</h2>
                <span className={cn('text-primary text-lg transition-transform flex-shrink-0', isOpen && 'rotate-45')}>
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
                    <p className="text-sm text-ink-muted leading-relaxed pt-3">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="card p-6 mt-10 text-center bg-gradient-to-br from-primary/[0.06] to-surface">
        <h3 className="text-lg font-bold text-ink mb-2">{t('faq.cta.title')}</h3>
        <p className="text-sm text-ink-muted mb-4">{t('faq.cta.desc')}</p>
        <Link to="/contact" className="btn-cta inline-flex">
          {t('faq.cta.btn')}
          <Icon name="arrowRight" size={14} />
        </Link>
      </div>

      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}
