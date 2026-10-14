import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useT } from '@/hooks/useT';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';

/** Card left-offsets are measured once (on mount/resize) and cached, so auto-scroll ticks never force a synchronous layout read. */
function measureCardOffsets(el: HTMLDivElement): number[] {
  const cards = Array.from(el.children) as HTMLElement[];
  if (!cards.length) return [];
  const first = cards[0].offsetLeft;
  return cards.map((c) => c.offsetLeft - first);
}

function scrollToCard(el: HTMLDivElement | null, offsets: number[], dir: 1 | -1) {
  if (!el || !offsets.length) return;
  const current = offsets.reduce((best, off, i) => (
    Math.abs(off - el.scrollLeft) < Math.abs(offsets[best] - el.scrollLeft) ? i : best
  ), 0);
  const next = dir > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 10 ? 0 : Math.max(0, Math.min(offsets.length - 1, current + dir));
  el.scrollTo({ left: offsets[next], behavior: 'smooth' });
}

export function FeaturedProducts({ h2 }: { h2?: string }) {
  const navigate = useNavigate();
  const { t } = useT();
  const { data, isLoading } = useProducts({ limit: 12, sort: 'featured' });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const offsetsRef = useRef<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const products = data?.data ?? [];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => { offsetsRef.current = measureCardOffsets(el); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading, products.length]);

  const scrollBy = (dir: 1 | -1) => scrollToCard(scrollerRef.current, offsetsRef.current, dir);

  useEffect(() => {
    const first = setTimeout(() => {
      if (!isPaused) scrollToCard(scrollerRef.current, offsetsRef.current, 1);
    }, 1200);
    const interval = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || isPaused) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollToCard(el, offsetsRef.current, 1);
      }
    }, 3500);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [isPaused]);

  return (
    <section className="section-pad">
      <div className="featured-header">
        <div>
          <div className="eyebrow">{t('featured.eyebrow')}</div>
          <h2 className="section-h2" dangerouslySetInnerHTML={{ __html: h2 || t('featured.title') }} />
        </div>
        <div className="featured-controls">
          <div className="hidden sm:flex featured-scroll-btns">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Scroll left"
              className="btn-ghost sm"
            >
              <Icon name="arrowLeft" size={14} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Scroll right"
              className="btn-ghost sm"
            >
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <button className="btn-out" onClick={() => navigate('/shop')}>
            {t('featured.viewAll')}
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="h-scroller featured-scroller"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {(isLoading ? Array.from({ length: 6 }) : products).map((p, i) => (
          <div
            key={p && typeof p === 'object' && 'id' in p ? (p as { id: string }).id : i}
            className="featured-card-slot"
          >
            {isLoading ? <ProductCardSkeleton /> : <ProductCard product={p as never} />}
          </div>
        ))}
      </div>

      <p className="sm:hidden featured-swipe-hint">
        {`<- ${t('featured.swipe')} ->`}
      </p>
    </section>
  );
}
