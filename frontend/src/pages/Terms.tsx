import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function TermsPage() {
  const { t } = useT();
  const pageSeo = usePageSeo('/terms');
  useSEO({
    title: pageSeo.editable?.title || t('terms.pageTitle'),
    description: pageSeo.editable?.description || t('terms.pageSub'),
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates
  });

  const articles = Array.from({ length: 16 }, (_, i) => i + 1);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0.1,
      }
    );

    articles.forEach((artNum) => {
      const el = document.getElementById(`art${artNum}`);
      if (el) observer.observe(el);
    });

    return () => {
      articles.forEach((artNum) => {
        const el = document.getElementById(`art${artNum}`);
        if (el) observer.unobserve(el);
      });
    };
  }, [articles]);

  return (
    <div className="container-app section-pad max-w-6xl">
      <header className="mb-12 pb-8 border-b border-line text-center md:text-left">
        <p className="eyebrow mb-2">GoPeptides Legal</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink mb-3 tracking-tight">
          {pageSeo.editable?.h1 || t('terms.pageTitle')}
        </h1>
        <p className="text-sm text-ink-muted">{t('terms.lastUpdated')}</p>
      </header>

      <div className="grid md:grid-cols-[280px_1fr] gap-10 items-start">
        {/* Sidebar Navigation */}
        <aside className="sticky top-28 hidden md:block border-r border-line pr-6 max-h-[calc(100vh-140px)] overflow-y-auto pb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink mb-4 pl-3">
            Inhoudsopgave
          </h3>
          <nav className="flex flex-col gap-1 border-l border-lineSoft">
            {articles.map((artNum) => {
              const id = `art${artNum}`;
              const isActive = activeId === id;
              return (
                <a
                  key={artNum}
                  href={`#${id}`}
                  className={`block truncate text-sm font-semibold px-4 py-2 border-l-2 -ml-[1.5px] transition-all duration-200 ${
                    isActive
                      ? 'text-primary-dark border-primary bg-primary/5 font-bold'
                      : 'text-ink-muted border-transparent hover:text-ink hover:bg-surfaceAlt/60'
                  }`}
                  title={pageSeo.editable?.h2?.[artNum - 1] || t(`terms.art${artNum}.title`)}
                >
                  {pageSeo.editable?.h2?.[artNum - 1] || t(`terms.art${artNum}.title`)}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Content Document Card */}
        <div className="bg-surface shadow-card border border-line rounded-card p-6 md:p-12 space-y-10">
          {/* Company details block */}
          <div className="p-6 bg-surfaceAlt/85 border-l-4 border-primary rounded-r-xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                <Icon name="document" size={18} className="text-primary-dark" />
              </div>
              <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
                Bedrijfsgegevens
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-[15px] text-ink leading-relaxed">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-0.5">Handelsnaam</p>
                <p className="font-semibold">GoPeptides</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-0.5">Email</p>
                <a href={`mailto:${t('terms.email')}`} className="font-semibold text-primary-dark hover:underline">{t('terms.email')}</a>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-0.5">Adres</p>
                <p className="font-semibold">{t('terms.address')}</p>
              </div>
            </div>
            <div className="h-px bg-line" />
            <p className="text-xs text-ink-muted leading-relaxed italic">{t('terms.intro')}</p>
          </div>

          {/* Legal articles */}
          <div className="space-y-12">
            {articles.map((artNum) => {
              const isPrivacy = artNum === 13;
              return (
                <section
                  key={artNum}
                  id={`art${artNum}`}
                  className={`scroll-mt-28 transition-all duration-300 ${
                    isPrivacy
                      ? 'p-6 md:p-8 bg-primary/[0.04] border border-primary/20 rounded-2xl shadow-sm'
                      : 'pb-10 border-b border-lineSoft last:border-0 last:pb-0'
                  }`}
                >
                  <h2 className={`text-xl font-extrabold text-ink mb-4 flex items-center ${
                    isPrivacy ? 'text-primary-dark' : 'border-l-4 border-primary pl-4'
                  }`}>
                    {isPrivacy && (
                      <span className="mr-3 p-1.5 bg-primary/10 text-primary-dark rounded-lg inline-flex items-center justify-center">
                        <Icon name="shield" size={18} />
                      </span>
                    )}
                    {pageSeo.editable?.h2?.[artNum - 1] || t(`terms.art${artNum}.title`)}
                  </h2>
                  <p className="text-[16px] md:text-[18px] text-ink leading-relaxed whitespace-pre-line font-medium pl-3 md:pl-4">
                    {t(`terms.art${artNum}.body`)}
                    {isPrivacy && (
                      <>
                        {' '}
                        <Link to="/privacy" className="text-primary font-bold hover:underline">
                          {t('footer.privacy')}
                        </Link>
                        .
                      </>
                    )}
                  </p>
                </section>
              );
            })}
          </div>
        </div>
      </div>
      
      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}

