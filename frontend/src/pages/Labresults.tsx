import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { Icon } from '@/components/ui/Icon';
import { AeoAnswer } from '@/components/seo/AeoAnswer';
import { aeoPageAnswer } from '@/content/aeoContent';
import type { AeoLang } from '@/content/aeoContent';
import { useQuery } from '@tanstack/react-query';
import { productService, type LabResultCard } from '@/services/productService';
import { resolveImageUrl } from '@/utils/helpers';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function rowsFor(card: LabResultCard, t: (k: string) => string): Array<{ label: string; value: string; url?: string }> {
  if (card.tests?.length) {
    return card.tests.map((row) => ({
      label: row.label,
      value: row.value,
      url: row.url,
    }));
  }
  return [
    { label: t('labresults.purityLabel'), value: card.purity || t('labresults.awaitingLab') },
    { label: t('labresults.contentLabel'), value: card.weight || t('labresults.awaitingLab') },
    {
      label: t('labresults.testDateLabel'),
      value: card.testDate || t('labresults.pending'),
    },
  ];
}

function ProductThumb({ url, alt }: { url?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return <Icon name="flask" className="text-gray-400" size={24} />;
  }
  return (
    <img
      src={resolveImageUrl(url)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover mix-blend-multiply"
      onError={() => setFailed(true)}
    />
  );
}

function hasLabContent(card: LabResultCard): boolean {
  return Boolean(card.tests?.length || card.reportUrl || card.reportImages?.length || (card.purity && card.testDate));
}

export function Labresults() {
  const { t, lang } = useT();
  const aeoLang = (lang === 'de' || lang === 'en' ? lang : 'nl') as AeoLang;
  const { data: cards, isLoading } = useQuery({
    queryKey: ['products-labresults'],
    queryFn: () => productService.labResults(),
  });

  const seoTitle =
    lang === 'de'
      ? 'Laborergebnisse | Drittanbieter-Testergebnisse | GoPeptides'
      : lang === 'en'
        ? 'Lab Results | Third-Party Purity Testing | GoPeptides'
        : 'Laborresultaten | Onafhankelijke Zuiverheidstest | GoPeptides';

  const seoDesc =
    lang === 'de'
      ? 'Unabhängige HPLC- und Massenspektrometrie-Ergebnisse für alle GoPeptides Forschungspeptide. Vollständige Chargenberichte ab Janoshik.'
      : lang === 'en'
        ? 'Independent HPLC and mass spectrometry lab results for all GoPeptides research peptides. Full batch reports from Janoshik lab.'
        : 'Onafhankelijke HPLC- en massaspectrometrie-resultaten voor alle GoPeptides-onderzoekspeptiden. Volledig chargenrapport van Janoshik.';

  const canonical =
    lang === 'de'
      ? 'https://gopeptides.nl/labresults?lang=de'
      : lang === 'en'
        ? 'https://gopeptides.nl/labresults?lang=en'
        : 'https://gopeptides.nl/labresults';

  useSEO({
    title: seoTitle,
    description: seoDesc,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: seoTitle,
      description: seoDesc,
      url: canonical,
    },
  });

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Icon name="shield" size={16} />
            <span>{t('labresults.badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            {t('labresults.h1')}
          </h1>
          <div className="max-w-2xl mx-auto mb-4 text-left sm:text-center">
            <AeoAnswer text={aeoPageAnswer('labresults', aeoLang)} />
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t('labresults.intro')}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {(cards || []).map((card) => {
            const rows = rowsFor(card, t);
            const thumb = card.images?.[0]?.url;
            return (
              <div key={card.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{card.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {t('labresults.batchLabel')}: {card.batch}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden">
                    <ProductThumb url={thumb} alt={card.name} />
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-grow">
                  {rows.map((row) => (
                    <div key={row.label} className="flex justify-between items-center gap-3 py-2 border-b border-gray-50">
                      <span className="text-slate-500 text-sm">{row.label}</span>
                      <span className="font-medium text-slate-900 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>

                {hasLabContent(card) ? (
                  <Link
                    to={`/labresults/${card.slug}`}
                    className="w-full py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                  >
                    <Icon name="document" size={18} />
                    {t('labresults.viewReport')}
                  </Link>
                ) : (
                  <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-medium flex items-center justify-center gap-2 transition-colors cursor-not-allowed">
                    <Icon name="document" size={18} />
                    {t('labresults.resultsPending')}
                  </button>
                )}
              </div>
            );
          })}

          {isLoading && (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-8"></div>
                <div className="space-y-4 mb-8">
                  <div className="h-4 bg-gray-50 rounded w-full"></div>
                  <div className="h-4 bg-gray-50 rounded w-full"></div>
                  <div className="h-4 bg-gray-50 rounded w-full"></div>
                </div>
                <div className="h-12 bg-gray-100 rounded-xl w-full mt-auto"></div>
              </div>
            ))
          )}
        </motion.div>

        <div className="mt-16 bg-slate-900 rounded-3xl p-8 md:p-12 text-center shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('labresults.whyTitle')}</h2>
          <p className="text-slate-300 max-w-3xl mx-auto mb-8 text-lg">
            {t('labresults.whyDesc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <Icon name="checkCircle" className="text-primary mx-auto mb-3" size={32} />
              <h4 className="text-white font-bold mb-2">{t('labresults.featureUnbiasedTitle')}</h4>
              <p className="text-slate-400 text-sm">{t('labresults.featureUnbiasedDesc')}</p>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <Icon name="chartBar" className="text-primary mx-auto mb-3" size={32} />
              <h4 className="text-white font-bold mb-2">{t('labresults.featurePurityTitle')}</h4>
              <p className="text-slate-400 text-sm">{t('labresults.featurePurityDesc')}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Labresults;
