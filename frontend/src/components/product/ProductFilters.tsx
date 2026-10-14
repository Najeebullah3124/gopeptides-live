import { useCategories } from '@/hooks/useProducts';
import { useT } from '@/hooks/useT';
import { PURITY_LEVELS } from '@/constants';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/helpers';
import type { ProductListFilters } from '@/types/product';
import { normalizeSlug } from '@/utils/slugTranslator';
import { categoryLabel } from '@/utils/categoryLabel';

interface ProductFiltersProps {
  filters: ProductListFilters;
  onChange: (next: Partial<ProductListFilters>) => void;
  onReset: () => void;
}

function CategoryText({ slug, name }: { slug: string; name: string }) {
  const { t } = useT();
  return <span>{categoryLabel(t, slug, name)}</span>;
}

export function ProductFilters({ filters, onChange, onReset }: ProductFiltersProps) {
  const { t } = useT();
  const { data: categories } = useCategories();

  const setMinPrice = (v: number) => onChange({ minPrice: v || undefined });
  const setMaxPrice = (v: number) => onChange({ maxPrice: v || undefined });

  return (
    <aside className="card p-5 lg:p-6 lg:sticky lg:top-24 self-start">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold uppercase tracking-[1.5px] text-ink flex items-center gap-2">
          <Icon name="filter" size={14} className="text-primary" />
          {t('filter.title')}
        </h3>
        <button onClick={onReset} className="text-[11px] text-primary hover:text-primary-light font-semibold">
          {t('filter.reset')}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="label">{t('filter.category')}</h4>
          <div className="space-y-1.5">
            <button
              onClick={() => onChange({ category: undefined })}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center',
                !filters.category ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:text-ink hover:bg-surfaceAlt',
              )}
            >
              <span>{t('filter.allCategories')}</span>
            </button>
            {(categories || []).map((c) => {
              const isSelected =
                filters.category === c.slug ||
                (!!filters.category &&
                  (normalizeSlug(filters.category, 'category') === c.slug ||
                    normalizeSlug(filters.category, 'category') === normalizeSlug(c.slug, 'category')));
              return (
                <button
                  key={c.id}
                  onClick={() => onChange({ category: c.slug })}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'text-ink-muted hover:text-ink hover:bg-surfaceAlt',
                  )}
                >
                  <CategoryText slug={c.slug} name={c.name} />
                  <span className="text-[10px] text-ink-dim">{c._count?.products ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="label">{t('filter.priceRange')}</h4>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              placeholder={t('filter.min')}
              value={filters.minPrice ?? ''}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              className="field text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder={t('filter.max')}
              value={filters.maxPrice ?? ''}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="field text-sm"
            />
          </div>
          <div className="flex gap-2 mt-2">
            {[
              // Catalog starts ~€45; weight-management from ~€80 — old <40 / 40-60 presets were empty.
              { l: '< €80', max: 80 },
              { l: '€80-150', min: 80, max: 150 },
              { l: '> €150', min: 150 },
            ].map((p) => {
              const active =
                (filters.minPrice ?? undefined) === p.min &&
                (filters.maxPrice ?? undefined) === p.max;
              return (
                <button
                  key={p.l}
                  type="button"
                  onClick={() => onChange({ minPrice: p.min, maxPrice: p.max })}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded border transition-colors',
                    active
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'text-ink-muted hover:text-primary border-line hover:border-primary/40',
                  )}
                >
                  {p.l}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="label">{t('filter.purity')}</h4>
          <div className="flex flex-wrap gap-2">
            {PURITY_LEVELS.map((p) => (
              <button
                key={p}
                onClick={() => onChange({ purity: filters.purity === p ? undefined : p })}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-colors',
                  filters.purity === p
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-line text-ink-muted hover:border-primary/40 hover:text-ink',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-ink">
          <input
            type="checkbox"
            checked={!!filters.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked || undefined })}
            className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30"
          />
          {t('filter.inStock')}
        </label>
      </div>
    </aside>
  );
}
