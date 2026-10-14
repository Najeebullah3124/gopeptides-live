import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { Icon } from '@/components/ui/Icon';
import { productService, type LabResultCard } from '@/services/productService';
import { resolveImageUrl } from '@/utils/helpers';
import { useState } from 'react';

function hasLabContent(card: LabResultCard): boolean {
  return Boolean(card.tests?.length || card.reportUrl || card.reportImages?.length || (card.purity && card.testDate));
}

export default function LabReportDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useT();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['products-labresults'],
    queryFn: () => productService.labResults(),
  });
  const [thumbFailed, setThumbFailed] = useState(false);

  const card = (cards || []).find(
    (c) => c.slug === slug || c.familySlugs?.includes(slug),
  );

  useSEO({
    title: card
      ? `${card.name} | ${t('labresults.reportTitle')} | GoPeptides`
      : `${t('labresults.reportTitle')} | GoPeptides`,
    description: t('labresults.intro'),
    canonical: `https://gopeptides.nl/labresults/${encodeURIComponent(slug)}${lang === 'en' || lang === 'de' ? `?lang=${lang}` : ''}`,
  });

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-slate-100">
        <div className="container mx-auto px-4 max-w-6xl animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-8" />
          <div className="grid lg:grid-cols-[1fr_280px] gap-6">
            <div className="bg-white rounded-2xl h-[520px]" />
            <div className="bg-slate-900 rounded-2xl h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!card || !hasLabContent(card)) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-slate-100">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{t('labresults.reportMissing')}</h1>
          <p className="text-slate-600 mb-6">{t('labresults.reportMissingDesc')}</p>
          <Link to="/labresults" className="btn-cta inline-flex">
            {t('labresults.backToList')}
          </Link>
        </div>
      </div>
    );
  }

  const thumb = card.images?.[0]?.url;
  const rows =
    card.tests?.length > 0
      ? card.tests
      : [
          { label: t('labresults.purityLabel'), value: card.purity || '—' },
          { label: t('labresults.contentLabel'), value: card.weight || '—' },
          { label: t('labresults.testDateLabel'), value: card.testDate || '—' },
        ];

  return (
    <div className="pt-24 pb-16 min-h-screen bg-slate-100">
      <div className="container mx-auto px-4 max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/labresults')}
          className="text-sm font-semibold text-primary hover:underline mb-6 inline-flex items-center gap-1"
        >
          ← {t('labresults.backToList')}
        </button>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Document */}
          <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <header className="px-6 md:px-10 pt-8 pb-6 border-b border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-[2px] text-slate-400 mb-2">
                {t('labresults.reportTitle')}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {card.name}
              </h1>
              <p className="text-sm text-slate-500 mt-2">
                {card.batch}
                {card.testDate ? ` · ${card.testDate}` : ''}
              </p>
            </header>

            <div className="px-6 md:px-10 py-6 flex flex-col sm:flex-row gap-6 border-b border-slate-100">
              <div className="w-28 h-28 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {thumb && !thumbFailed ? (
                  <img
                    src={resolveImageUrl(thumb)}
                    alt={card.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover mix-blend-multiply"
                    onError={() => setThumbFailed(true)}
                  />
                ) : (
                  <Icon name="flask" size={32} className="text-slate-300" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.batchLabel')}</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{card.batch}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.testDateLabel')}</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{card.testDate || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.contentLabel')}</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{card.weight || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.purityLabel')}</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{card.purity || '—'}</p>
                </div>
              </div>
            </div>

            <div className="px-6 md:px-10 py-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
                {t('labresults.testsRequested')}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-600">{t('labresults.colTest')}</th>
                      <th className="px-4 py-3 font-bold text-slate-600">{t('labresults.colResult')}</th>
                      <th className="px-4 py-3 font-bold text-slate-600 text-right">{t('labresults.colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{row.label}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.value}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
                            {t('labresults.pass')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mt-6">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.purityLabel')}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">{card.purity || '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.contentLabel')}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">{card.weight || '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{t('labresults.batchLabel')}</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1 truncate">{card.batch}</p>
                </div>
              </div>

              {(card.reportImages?.length ?? 0) > 0 && (
                <div className="mt-10">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
                    {t('labresults.scanTitle')}
                  </h2>
                  <div className="space-y-4">
                    {card.reportImages!.map((src) => (
                      <a
                        key={src}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-primary/40 transition-colors"
                      >
                        <img
                          src={src}
                          alt={`${card.name} lab report`}
                          className="w-full h-auto object-contain"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">{t('labresults.scanHint')}</p>
                </div>
              )}
            </div>
          </article>

          {/* Sidebar */}
          <aside className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-6">
              <Icon name="check" size={14} />
              {t('labresults.certified')}
            </div>

            <dl className="space-y-4 text-sm mb-8">
              <div>
                <dt className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">{t('labresults.contentLabel')}</dt>
                <dd className="font-semibold mt-1">{card.weight || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">{t('labresults.batchLabel')}</dt>
                <dd className="font-semibold mt-1">{card.batch}</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">{t('labresults.testDateLabel')}</dt>
                <dd className="font-semibold mt-1">{card.testDate || '—'}</dd>
              </div>
            </dl>

            {card.reportUrl ? (
              <a
                href={card.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 mb-3"
              >
                <Icon name="external" size={16} />
                {t('labresults.openExternal')}
              </a>
            ) : (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {t('labresults.verifyHint')}
              </p>
            )}

            <Link
              to={`/${card.slug}`}
              className="w-full py-3 rounded-xl border border-slate-600 text-slate-200 font-semibold flex items-center justify-center gap-2 hover:bg-slate-800"
            >
              {t('labresults.viewProduct')}
            </Link>

            <p className="text-[11px] text-slate-500 mt-6 leading-relaxed">
              {t('labresults.historicalNote')}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
