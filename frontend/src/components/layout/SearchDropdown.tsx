import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { useUiStore } from '@/stores/uiStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { productImage } from '@/utils/helpers';
import { formatCompactCurrency } from '@/utils/formatCurrency';

export function SearchDropdown() {
  const { t } = useT();
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => productService.list({ search: debounced, limit: 6 }),
    enabled: open && debounced.trim().length > 1,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  if (!open) return null;

  const results = data?.data || [];

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-2 px-4">
      <div
        ref={containerRef}
        className="max-w-2xl mx-auto bg-surface border border-line rounded-card shadow-card overflow-hidden animate-fadeIn"
      >
        <form
          className="flex items-center gap-3 px-5 py-4 border-b border-line"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) {
              navigate(`/shop?search=${encodeURIComponent(q)}`);
              setOpen(false);
            }
          }}
        >
          <Icon name="search" size={18} className="text-ink-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-ink placeholder:text-ink-dim text-sm focus:outline-none"
          />
          {isFetching && <Spinner size={14} className="text-ink-muted" />}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-line text-[10px] text-ink-muted">
            ESC
          </kbd>
        </form>
        <div className="max-h-[60vh] overflow-y-auto">
          {debounced.trim().length <= 1 && (
            <p className="px-5 py-6 text-sm text-ink-muted">{t('search.typeMore')}</p>
          )}
          {debounced.trim().length > 1 && !isFetching && results.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink-muted">{t('search.noMatches', { q: debounced })}</p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                navigate(`/${p.slug}`);
                setOpen(false);
              }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-surfaceAlt transition-colors text-left border-b border-line last:border-0"
            >
              <div className="w-12 h-12 rounded-md bg-bg border border-line flex-shrink-0 overflow-hidden">
                {productImage(p) ? (
                  <img
                    src={productImage(p) || ''}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
                <p className="text-xs text-ink-muted truncate">{p.purity} • {p.weight}</p>
              </div>
              <span className="text-sm font-bold text-primary flex-shrink-0">{formatCompactCurrency(p.price)}</span>
            </button>
          ))}
          {results.length > 0 && (
            <button
              type="button"
              onClick={() => {
                navigate(`/shop?search=${encodeURIComponent(q)}`);
                setOpen(false);
              }}
              className="w-full px-5 py-3 text-xs font-semibold text-primary hover:bg-primary/5 text-center"
            >
              {t('search.seeAll', { q })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
