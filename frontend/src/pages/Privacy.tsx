import { useState, useEffect } from 'react';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

const ARTICLES = Array.from({ length: 13 }, (_, i) => i + 1);

export default function PrivacyPage() {
  const { t } = useT();
  const pageSeo = usePageSeo('/privacy');
  useSEO({
    title: pageSeo.editable?.title || t('privacy.title'),
    description: pageSeo.editable?.description || t('privacy.intro'),
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates,
  });

  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0.1 },
    );

    ARTICLES.forEach((n) => {
      const el = document.getElementById(`privacy-art${n}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="container-app section-pad max-w-6xl">
      <header className="mb-12 pb-8 border-b border-line text-center md:text-left">
        <p className="eyebrow mb-2">GoPeptides Legal</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink mb-3 tracking-tight">
          {pageSeo.editable?.h1 || t('privacy.title')}
        </h1>
        <p className="text-sm text-ink-muted">{t('privacy.lastUpdated')}</p>
      </header>

      <div className="grid md:grid-cols-[280px_1fr] gap-10 items-start">
        <aside className="sticky top-28 hidden md:block border-r border-line pr-6 max-h-[calc(100vh-140px)] overflow-y-auto pb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink mb-4 pl-3">
            {t('privacy.toc')}
          </h3>
          <nav className="flex flex-col gap-1 border-l border-lineSoft">
            {ARTICLES.map((n) => {
              const id = `privacy-art${n}`;
              const isActive = activeId === id;
              const label = pageSeo.editable?.h2?.[n - 1] || t(`privacy.art${n}.title`);
              return (
                <a
                  key={n}
                  href={`#${id}`}
                  className={`block truncate text-sm font-semibold px-4 py-2 border-l-2 -ml-[1.5px] transition-all duration-200 ${
                    isActive
                      ? 'text-primary-dark border-primary bg-primary/5 font-bold'
                      : 'text-ink-muted border-transparent hover:text-ink hover:bg-surfaceAlt/60'
                  }`}
                  title={label}
                >
                  {label}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="bg-surface shadow-card border border-line rounded-card p-6 md:p-12 space-y-10">
          <div className="p-6 bg-surfaceAlt/85 border-l-4 border-primary rounded-r-xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                <Icon name="shield" size={18} className="text-primary-dark" />
              </div>
              <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
                {t('privacy.companyTitle')}
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-[15px] text-ink leading-relaxed">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-0.5">
                  {t('privacy.field.email')}
                </p>
                <a
                  href={`mailto:${t('privacy.email')}`}
                  className="font-semibold text-primary-dark hover:underline"
                >
                  {t('privacy.email')}
                </a>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-0.5">
                  {t('privacy.field.kvk')}
                </p>
                <p className="font-semibold">{t('privacy.kvk')}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-0.5">
                  {t('privacy.field.address')}
                </p>
                <p className="font-semibold">{t('privacy.address')}</p>
              </div>
            </div>
            <div className="h-px bg-line" />
            <p className="text-xs text-ink-muted leading-relaxed italic">{t('privacy.intro')}</p>
          </div>

          <div className="space-y-12">
            {ARTICLES.map((n) => (
              <section
                key={n}
                id={`privacy-art${n}`}
                className="scroll-mt-28 pb-10 border-b border-lineSoft last:border-0 last:pb-0"
              >
                <h2 className="text-xl font-extrabold text-ink mb-4 border-l-4 border-primary pl-4">
                  {pageSeo.editable?.h2?.[n - 1] || t(`privacy.art${n}.title`)}
                </h2>
                {n === 3 ? (
                  <div className="pl-3 md:pl-4 space-y-4">
                    <p className="text-[16px] md:text-[18px] text-ink leading-relaxed font-medium">
                      {t('privacy.art3.lead')}
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full text-sm md:text-[15px] text-left">
                        <thead className="bg-surfaceAlt text-ink">
                          <tr>
                            <th className="px-4 py-3 font-bold border-b border-line">
                              {t('privacy.art3.colPurpose')}
                            </th>
                            <th className="px-4 py-3 font-bold border-b border-line">
                              {t('privacy.art3.colBasis')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-ink-muted">
                          {Array.from({ length: 8 }, (_, i) => i + 1).map((row) => (
                            <tr key={row} className="border-b border-lineSoft last:border-0">
                              <td className="px-4 py-3 align-top font-medium text-ink">
                                {t(`privacy.art3.row${row}.purpose`)}
                              </td>
                              <td className="px-4 py-3 align-top">
                                {t(`privacy.art3.row${row}.basis`)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-[16px] md:text-[18px] text-ink leading-relaxed whitespace-pre-line font-medium pl-3 md:pl-4">
                    {t(`privacy.art${n}.body`)}
                  </p>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>

      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}
