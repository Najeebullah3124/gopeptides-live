import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function ShippingPage() {
  const { t } = useT();
  const pageSeo = usePageSeo('/shipping');
  useSEO({
    title: pageSeo.editable?.title || t('shipping.pageTitle'),
    description: pageSeo.editable?.description || t('shipping.pageSub'),
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates
  });

  return (
    <div className="container-app section-pad max-w-6xl">
      <header className="mb-12 pb-8 border-b border-line text-center md:text-left">
        <p className="eyebrow mb-2">GoPeptides Shipping</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink mb-3 tracking-tight">
          {pageSeo.editable?.h1 || t('shipping.pageTitle')}
        </h1>
        <p className="text-sm text-ink-muted">{t('shipping.lastUpdated')}</p>
      </header>

      {/* Main Layout Grid */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        
        {/* Left Column: Main Policy Cards */}
        <div className="space-y-8">
          
          {/* Section 1: Shipping Details */}
          <div className="bg-surface shadow-card border border-line rounded-card p-6 md:p-10 space-y-8">
            <div className="flex items-center gap-3.5 border-b border-lineSoft pb-6">
              <div className="p-2.5 bg-primary/10 text-primary-dark rounded-xl">
                <Icon name="truck" size={24} className="text-primary-dark" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-ink tracking-tight">
                  {pageSeo.editable?.h2?.[0] || t('shipping.title1')}
                </h2>
                <p className="text-sm text-ink-muted mt-0.5">Informatie over verzendwijzen en levertijden</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Core Delivery Flow (1.1 to 1.4) */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Processing Time */}
                <div className="p-5 bg-surfaceAlt/60 border border-lineSoft rounded-xl space-y-2">
                  <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                    <span className="p-1 bg-primary/10 text-primary-dark rounded">
                      <Icon name="clock" size={14} />
                    </span>
                    {t('shipping.title1.3')}
                  </h3>
                  <p className="text-[15px] md:text-[16px] text-ink leading-relaxed font-medium">
                    {t('shipping.desc1.3')}
                  </p>
                </div>

                {/* Shipping Carriers */}
                <div className="p-5 bg-surfaceAlt/60 border border-lineSoft rounded-xl space-y-2">
                  <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                    <span className="p-1 bg-primary/10 text-primary-dark rounded">
                      <Icon name="package" size={14} />
                    </span>
                    {t('shipping.title1.2')}
                  </h3>
                  <p className="text-[15px] md:text-[16px] text-ink leading-relaxed font-medium">
                    {t('shipping.desc1.2')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['PostNL', 'DHL', 'FedEx'].map((carrier) => (
                      <span key={carrier} className="inline-flex items-center px-2 py-0.5 bg-surface border border-line rounded text-[10px] font-extrabold text-ink-muted tracking-wide">
                        🚚 {carrier}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Where we ship */}
                <div className="md:col-span-2 p-5 bg-surfaceAlt/60 border border-lineSoft rounded-xl space-y-2">
                  <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                    <span className="p-1 bg-primary/10 text-primary-dark rounded">
                      <Icon name="globe" size={14} />
                    </span>
                    {t('shipping.title1.1')}
                  </h3>
                  <p className="text-[15px] md:text-[16px] text-ink leading-relaxed font-medium">
                    {t('shipping.desc1.1')}
                  </p>
                </div>

                {/* Delivery Times & Table */}
                <div className="md:col-span-2 p-5 bg-surfaceAlt/60 border border-lineSoft rounded-xl space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                      <span className="p-1 bg-primary/10 text-primary-dark rounded">
                        <Icon name="calendar" size={14} />
                      </span>
                      {t('shipping.title1.4')}
                    </h3>
                    <p className="text-[15px] md:text-[16px] text-ink leading-relaxed font-medium">
                      {t('shipping.desc1.4')}
                    </p>
                  </div>

                  <div className="overflow-hidden border border-lineSoft rounded-xl shadow-sm bg-surface max-w-xl">
                    <table className="min-w-full divide-y divide-lineSoft">
                      <thead className="bg-surfaceAlt">
                        <tr>
                          <th className="px-5 py-3 text-left text-sm font-bold text-ink uppercase tracking-wider">{t('shipping.table.dest')}</th>
                          <th className="px-5 py-3 text-left text-sm font-bold text-ink uppercase tracking-wider">{t('shipping.table.time')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface divide-y divide-lineSoft">
                        <tr className="hover:bg-surfaceAlt/30 transition-colors">
                          <td className="px-5 py-3 text-[15px] font-bold text-ink">{t('shipping.table.nl')}</td>
                          <td className="px-5 py-3 text-[15px] font-medium text-ink-muted">{t('shipping.table.nl.time')}</td>
                        </tr>
                        <tr className="hover:bg-surfaceAlt/30 transition-colors">
                          <td className="px-5 py-3 text-[15px] font-bold text-ink">{t('shipping.table.be')}</td>
                          <td className="px-5 py-3 text-[15px] font-medium text-ink-muted">{t('shipping.table.be.time')}</td>
                        </tr>
                        <tr className="hover:bg-surfaceAlt/30 transition-colors">
                          <td className="px-5 py-3 text-[15px] font-bold text-ink">{t('shipping.table.eu')}</td>
                          <td className="px-5 py-3 text-[15px] font-medium text-ink-muted">{t('shipping.table.eu.time')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-ink-muted italic pl-1">{t('shipping.desc1.4.note')}</p>
                </div>
              </div>

              {/* Additional Delivery Terms Grid (1.5 to 1.9) */}
              <div className="border-t border-lineSoft pt-8">
                <h4 className="text-sm font-extrabold uppercase tracking-widest text-ink mb-6 flex items-center gap-2 pl-1">
                  <Icon name="info" size={14} className="text-primary" />
                  Aanvullende verzendvoorwaarden
                </h4>
                <div className="grid sm:grid-cols-2 gap-6">
                  {[5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="p-5 bg-surfaceAlt/30 border border-lineSoft rounded-xl hover:border-line transition-all duration-200 space-y-1.5">
                      <h5 className="text-[15px] font-bold text-ink">
                        {t(`shipping.title1.${num}`)}
                      </h5>
                      <p className="text-[14px] text-ink-muted leading-relaxed font-medium">
                        {t(`shipping.desc1.${num}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Returns & Refunds */}
          <div className="bg-surface shadow-card border border-line rounded-card p-6 md:p-10 space-y-8">
            <div className="flex items-center gap-3.5 border-b border-lineSoft pb-6">
              <div className="p-2.5 bg-primary/10 text-primary-dark rounded-xl">
                <Icon name="refresh" size={24} className="text-primary-dark" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-ink tracking-tight">
                  {pageSeo.editable?.h2?.[1] || t('shipping.title2')}
                </h2>
                <p className="text-sm text-ink-muted mt-0.5">Ons beleid omtrent retourzendingen en claims</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Warning block - Returns not possible */}
              <div className="p-5 md:p-6 bg-danger/5 border border-danger/20 rounded-2xl flex gap-4 items-start">
                <div className="p-2 bg-danger/10 text-danger rounded-xl shrink-0 mt-0.5">
                  <Icon name="warning" size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-danger">
                    {t('shipping.title2.1')}
                  </h3>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-relaxed font-medium">
                    {t('shipping.desc2.1')}
                  </p>
                </div>
              </div>

              {/* Exception block - incorrect delivery / damage */}
              <div className="p-5 md:p-6 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4 items-start">
                <div className="p-2 bg-primary/10 text-primary-dark rounded-xl shrink-0 mt-0.5">
                  <Icon name="info" size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-primary-dark">
                    {t('shipping.title2.2')}
                  </h3>
                  <p className="text-[15px] md:text-[16px] text-ink-muted leading-relaxed font-medium">
                    {t('shipping.desc2.2')}
                  </p>
                </div>
              </div>

              {/* Procedure block */}
              <div className="p-5 border-l-4 border-primary bg-surfaceAlt/30 rounded-r-xl space-y-1.5">
                <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider">
                  {t('shipping.title2.3')}
                </h3>
                <p className="text-[15px] md:text-[16px] text-ink leading-relaxed font-medium">
                  {t('shipping.desc2.3')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar Policy widgets */}
        <div className="space-y-6">
          
          {/* Collection Info */}
          <div className="bg-surface shadow-card border border-line rounded-card p-6 space-y-4 hover:shadow-cardHover transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                <Icon name="pin" size={18} />
              </div>
              <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider">{t('shipping.title3')}</h3>
            </div>
            <p className="text-[15px] text-ink-muted leading-relaxed font-medium">
              {t('shipping.desc3')}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-surface shadow-card border border-line rounded-card p-6 space-y-4 hover:shadow-cardHover transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                <Icon name="info" size={18} />
              </div>
              <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider">{t('shipping.title4')}</h3>
            </div>
            <p className="text-[15px] text-ink-muted leading-relaxed font-medium">
              {t('shipping.desc4')}
            </p>
          </div>

          {/* Contact widget */}
          <div className="bg-surface shadow-card border border-line rounded-card p-6 space-y-4 hover:shadow-cardHover transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary-dark rounded-lg">
                <Icon name="mail" size={18} />
              </div>
              <h3 className="text-sm font-extrabold text-ink uppercase tracking-wider">{t('shipping.title5')}</h3>
            </div>
            <p className="text-[15px] text-ink-muted leading-relaxed font-medium">
              {t('shipping.desc5')}
            </p>
            <div className="pt-2">
              <a
                href="mailto:info@gopeptides.nl"
                className="w-full btn-primary btn-sm flex items-center justify-center gap-2 rounded-lg font-bold"
              >
                <Icon name="mail" size={14} />
                Stuur een email
              </a>
            </div>
          </div>
          
        </div>
      </div>
      
      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}

