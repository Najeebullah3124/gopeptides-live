import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters } from '@/components/product/ProductFilters';
import { Select } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useDebounce } from '@/hooks/useDebounce';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { cn } from '@/utils/helpers';
import type { ProductListFilters } from '@/types/product';
import { normalizeSlug } from '@/utils/slugTranslator';
import { categoryLabel } from '@/utils/categoryLabel';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';
import { AeoAnswer } from '@/components/seo/AeoAnswer';
import { aeoPageAnswer } from '@/content/aeoContent';
import type { AeoLang } from '@/content/aeoContent';
import { parseSeoData } from '@/utils/seoMeta';

export default function ShopPage() {
  const { t, lang } = useT();
  const aeoLang = (lang === 'de' || lang === 'en' ? lang : 'nl') as AeoLang;
  const { categorySlug: categoryFromPath } = useParams<{ categorySlug?: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryQuery = categoryFromPath || params.get('category') || '';
  const pageSeo = usePageSeo(
    categoryFromPath ? `/shop/${categoryFromPath}` : '/shop',
    params.toString() ? `?${params.toString()}` : '',
  );
  const [searchInput, setSearchInput] = useState(params.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filters: ProductListFilters = useMemo(
    () => ({
      page: parseInt(params.get('page') || '1', 10),
      limit: 12,
      search: debouncedSearch || undefined,
      category: categoryQuery || undefined,
      sort: (params.get('sort') as ProductListFilters['sort']) || 'featured',
      minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
      maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
      inStock: params.get('inStock') === 'true' || undefined,
      purity: params.get('purity') || undefined,
    }),
    [categoryQuery, debouncedSearch, params],
  );

  const updateParams = (next: Partial<ProductListFilters>) => {
    const updated = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === false) updated.delete(k);
      else if (k !== 'category') updated.set(k, String(v));
    });
    if (!('page' in next)) updated.delete('page');
    if ('category' in next) {
      updated.delete('category');
      const search = updated.toString();
      // Use DB slug as-is. normalizeSlug maps NL live slugs → English keys that don't exist in DB.
      const cat = next.category ? String(next.category) : '';
      navigate(cat ? { pathname: `/shop/${cat}`, search: search ? `?${search}` : '' } : { pathname: '/shop', search: search ? `?${search}` : '' }, { replace: true });
      return;
    }
    setParams(updated, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch === (params.get('search') || '')) return;
    updateParams({ search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useProducts(filters);
  const { data: categories } = useCategories();

  const sortOptions = [
    { value: 'featured', label: t('shop.sort.featured') },
    { value: 'newest', label: t('shop.sort.newest') },
    { value: 'price_asc', label: t('shop.sort.priceAsc') },
    { value: 'price_desc', label: t('shop.sort.priceDesc') },
    { value: 'rating', label: t('shop.sort.rating') },
  ];

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  
  const origCategory = filters.category || '';
  const matchingCat = (categories || []).find(
    (c) =>
      c.slug === origCategory ||
      normalizeSlug(c.slug, 'category') === normalizeSlug(origCategory, 'category') ||
      c.slug === normalizeSlug(origCategory, 'category'),
  );
  const catSeo = parseSeoData(matchingCat?.seoData);
  const catNameRaw = matchingCat ? matchingCat.name : (origCategory ? origCategory.replace(/-/g, ' ') : '');

  const seo = lang === 'nl'
    ? { title: 'Koop HPLC-geteste Onderzoekspeptiden | GoPeptides', description: 'Bekijk HPLC-geteste onderzoekspeptiden per categorie met batchdocumentatie en Certificate of Analysis. Bestel bij GoPeptides met snelle EU-verzending.' }
    : lang === 'de'
      ? { title: 'HPLC-gepruefte Forschungspeptide | GoPeptides', description: 'Entdecken Sie HPLC-gepruefte Forschungspeptide nach Kategorie mit Chargendokumentation und Certificate of Analysis bei GoPeptides.' }
      : { title: 'Shop HPLC-Tested Research Peptides | GoPeptides', description: 'Browse HPLC-tested research peptides by category with batch documentation and Certificates of Analysis from GoPeptides. Fast EU shipping available.' };
  useSEO({
    title: catSeo.title || pageSeo.editable?.title || (filters.category && catNameRaw ? `${catNameRaw} | GoPeptides` : seo.title),
    description: catSeo.description || pageSeo.editable?.description || seo.description,
    keywords: catSeo.focusKeywords || pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates,
  });
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: catSeo.title || (filters.category && catNameRaw ? `${catNameRaw} | GoPeptides` : seo.title),
    description: catSeo.description || seo.description,
    url: pageSeo.canonical,
  };

  if (filters.category) {
    const categoryName = categoryLabel(t, origCategory || filters.category, catNameRaw);
    activeChips.push({
      label: t('filter.chip.category', { value: categoryName }),
      clear: () => updateParams({ category: undefined }),
    });
  }
  if (filters.purity)
    activeChips.push({ label: t('filter.chip.purity', { value: filters.purity }), clear: () => updateParams({ purity: undefined }) });
  if (filters.minPrice)
    activeChips.push({ label: t('filter.chip.minPrice', { value: filters.minPrice }), clear: () => updateParams({ minPrice: undefined }) });
  if (filters.maxPrice)
    activeChips.push({ label: t('filter.chip.maxPrice', { value: filters.maxPrice }), clear: () => updateParams({ maxPrice: undefined }) });
  if (filters.inStock) activeChips.push({ label: t('filter.chip.inStock'), clear: () => updateParams({ inStock: undefined }) });
  if (filters.search)
    activeChips.push({
      label: t('filter.chip.search', { value: filters.search }),
      clear: () => {
        setSearchInput('');
        updateParams({ search: undefined });
      },
    });

  const reset = () => {
    setSearchInput('');
    navigate('/shop', { replace: true });
  };

  const totalPages = data?.meta.totalPages || 1;
  const currentPage = filters.page || 1;
  const total = data?.meta.totalCount ?? 0;

  return (
    <div className="section-pad shop-page-top">
      <JsonLd data={pageJsonLd} />
      <div className="shop-heading-block">
        <h1 className="shop-title">
          {catSeo.h1 || pageSeo.editable?.h1 || (filters.category && catNameRaw ? catNameRaw : t('shop.title'))}
        </h1>
        <AeoAnswer text={aeoPageAnswer('shop', aeoLang)} />
        <p className="shop-count">
          {data
            ? total === 1
              ? t('shop.results', { n: total })
              : t('shop.resultsPlural', { n: total })
            : t('shop.loading')}
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <div className="hidden lg:block">
          <ProductFilters filters={filters} onChange={updateParams} onReset={reset} />
        </div>

        {showMobileFilters && (
          <div className="lg:hidden fixed inset-0 z-[70] bg-bg/80 backdrop-blur p-4">
            <div className="bg-surface border border-line rounded-card max-w-md mx-auto mt-12 p-1">
              <ProductFilters
                filters={filters}
                onChange={(n) => {
                  updateParams(n);
                  setShowMobileFilters(false);
                }}
                onReset={reset}
              />
              <Button fullWidth variant="secondary" className="m-3" onClick={() => setShowMobileFilters(false)}>
                {t('filter.close')}
              </Button>
            </div>
          </div>
        )}

        <div>
          <div className="flex flex-wrap gap-3 items-center mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('shop.searchPlaceholder')}
                className="field pl-10 pr-10"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  aria-label="Clear"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setShowMobileFilters(true)} className="btn-out lg:hidden">
              <Icon name="filter" size={14} />
              {t('filter.filters')}
            </button>
            <Select
              value={filters.sort}
              onChange={(e) => updateParams({ sort: e.target.value as ProductListFilters['sort'] })}
              options={sortOptions}
              className="w-auto min-w-[160px]"
            />
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {activeChips.map((c) => (
                <button key={c.label} onClick={c.clear} className="chip hover:bg-primary/20">
                  {c.label}
                  <Icon name="close" size={12} />
                </button>
              ))}
              <button onClick={reset} className="text-xs text-ink-muted hover:text-danger px-2">
                {t('shop.clearAll')}
              </button>
            </div>
          )}

          <div className={cn('relative', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
            <ProductGrid
              products={data?.data}
              loading={isLoading}
              skeletonCount={12}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
              empty={
                <div className="card p-12 text-center">
                  <p className="text-ink-muted">{t('shop.empty')}</p>
                </div>
              }
            />
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-10">
              <button
                onClick={() => updateParams({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage <= 1}
                className="btn-out btn-sm disabled:opacity-30"
              >
                <Icon name="arrowLeft" size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-ink-dim">…</span>}
                    <button
                      onClick={() => updateParams({ page: p })}
                      className={cn(
                        'min-w-[36px] h-9 rounded-md text-sm font-semibold transition-colors',
                        p === currentPage
                          ? 'bg-primary text-bg'
                          : 'text-ink-muted hover:text-ink hover:bg-surfaceHi',
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => updateParams({ page: Math.min(totalPages, currentPage + 1) })}
                disabled={currentPage >= totalPages}
                className="btn-out btn-sm disabled:opacity-30"
              >
                <Icon name="arrowRight" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <SeoContentBlock seo={filters.category ? catSeo : pageSeo.editable} />
    </div>
  );
}
