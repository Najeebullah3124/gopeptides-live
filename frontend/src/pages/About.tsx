import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Vial } from '@/components/product/Vial';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function AboutPage() {
  const { t } = useT();
  const pageSeo = usePageSeo('/about');
  useSEO({
    title: pageSeo.editable?.title || t('nav.about'),
    description: pageSeo.editable?.description || t('about.p1'),
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates
  });

  const values: Array<{ icon: 'beaker' | 'document' | 'truck' | 'shield'; title: string; desc: string }> = [
    { icon: 'beaker', title: t('about.v1.title'), desc: t('about.v1.desc') },
    { icon: 'document', title: t('about.v2.title'), desc: t('about.v2.desc') },
    { icon: 'truck', title: t('about.v3.title'), desc: t('about.v3.desc') },
    { icon: 'shield', title: t('about.v4.title'), desc: t('about.v4.desc') },
  ];

  const stats = [
    ['99%+', t('hero.stat.purity')],
    ['773+', t('hero.stat.reviews')],
    ['48h', t('hero.stat.delivery')],
    ['14d', 'Money back'],
  ];

  return (
    <div className="overflow-hidden">
      <section className="section-pad relative">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <p className="eyebrow">{t('about.eyebrow')}</p>
            <h1 className="hero-h1 about-headline">
              {pageSeo.editable?.h1 || t('about.title')}
            </h1>
            <p className="about-p1">{t('about.p1')}</p>
            <p className="about-p2">{t('about.p2')}</p>
          </div>
          <div className="hidden lg:flex justify-center">
            <Vial color="#5CC0BE" size={300} />
          </div>
        </div>
      </section>

      <section className="about-stats-section">
        <div className="container-app about-stats-inner">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-4xl font-extrabold text-primary mb-1">{v}</div>
                <div className="text-[10px] uppercase tracking-[1.5px] text-ink-muted font-semibold">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="eyebrow">{t('about.values.eyebrow')}</p>
          <h2 className="section-h2 about-values-title">
            {pageSeo.editable?.h2?.[0] || t('about.values.title')}
          </h2>
          <p className="text-ink-muted">{t('about.values.desc')}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {values.map((v) => (
            <article key={v.title} className="card p-7">
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                <Icon name={v.icon} size={22} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">{v.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{v.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-pad">
        <div className="card p-8 lg:p-12 text-center about-cta-card">
          <h2 className="section-h2 about-cta-title">
            {t('about.cta.title')}
          </h2>
          <p className="text-ink-muted mb-6 max-w-md mx-auto">{t('about.cta.desc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/shop" className="btn-cta lg">
              {t('about.cta.browse')}
            </Link>
            <Link to="/contact" className="btn-out lg">
              {t('about.cta.talk')}
            </Link>
          </div>
        </div>
      </section>

      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}
