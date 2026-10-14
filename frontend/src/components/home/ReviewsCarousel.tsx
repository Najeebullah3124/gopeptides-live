import { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stars } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { reviewService } from '@/services/reviewService';
import { useT } from '@/hooks/useT';
import type { Review } from '@/types/review';
import { fadeUp, stagger, viewport } from '@/utils/animations';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function displayName(r: Review): string {
  if (r.user) return `${r.user.firstName} ${r.user.lastName.charAt(0)}.`;
  return r.guestName || 'Researcher';
}

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

export function ReviewsCarousel({ h2 }: { h2?: string }) {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const [fetchReviews, setFetchReviews] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setFetchReviews(true);
          io.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'home-approved', lang],
    queryFn: () => reviewService.listApproved(1, 20, lang),
    staleTime: 5 * 60_000,
    enabled: fetchReviews,
  });

  const { data: approvedCount } = useQuery({
    queryKey: ['reviews', 'approved-count', lang],
    queryFn: () => reviewService.listApproved(1, 1, lang),
    staleTime: 5 * 60_000,
  });

  const { data: googleMeta } = useQuery({
    queryKey: ['reviews', 'google-meta'],
    queryFn: reviewService.googleSummary,
    staleTime: 5 * 60_000,
    enabled: fetchReviews,
  });

  const offsetsRef = useRef<number[]>([]);
  const scrollBy = (dir: 1 | -1) => scrollToCard(scrollerRef.current, offsetsRef.current, dir);

  const [isPaused, setIsPaused] = useState(false);

  const dbReviews = data?.data ?? [];
  const reviewsCount = dbReviews.length + (googleMeta?.reviews?.length ?? 0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => { offsetsRef.current = measureCardOffsets(el); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading, reviewsCount]);

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
  const productReviewCount = data?.meta.totalCount ?? approvedCount?.meta.totalCount ?? 0;
  const productAverageRating = data?.meta.averageRating ?? approvedCount?.meta.averageRating ?? 0;
  const googleCount = googleMeta?.reviewCount || 0;
  const googleRating = googleMeta?.rating || 0;
  const aggregateCount = googleCount + productReviewCount;
  const aggregateRating = aggregateCount > 0
    ? (googleRating * googleCount + productAverageRating * productReviewCount) / aggregateCount
    : 5;
  const googleReviews = (googleMeta?.reviews || []).map((gr, i) => ({
    id: `google-${i}`,
    productId: '',
    rating: gr.rating,
    title: 'Google Review',
    body: gr.text?.text || '',
    guestName: gr.authorAttribution?.displayName || 'Google User',
    verified: true,
    approved: true,
    createdAt: new Date().toISOString(),
    product: undefined,
    user: null,
    isGoogle: true,
  }));

  const reviews = [...googleReviews, ...dbReviews];

  return (
    <motion.section
      ref={sectionRef}
      className="section-pad reviews-section-border"
      variants={stagger}
      initial={false}
      whileInView="visible"
      viewport={viewport}
    >
      <motion.div className="reviews-header" variants={fadeUp}>
        <div className="eyebrow">{t('reviews.eyebrow')}</div>
        <h2 className="section-h2">{h2 || t('reviews.title')}</h2>
        <div className="reviews-aggregate">
          <Stars rating={aggregateRating} size={14} />
          <span className="reviews-score">{aggregateRating.toFixed(1)}</span>
          <span className="reviews-aggregate-text">{t('reviews.aggregateText', { count: aggregateCount })}</span>
        </div>
      </motion.div>

      <div className="hidden sm:flex reviews-scroll-controls">
        <button onClick={() => scrollBy(-1)} aria-label="Scroll left" className="btn-ghost sm">
          <Icon name="arrowLeft" size={14} />
        </button>
        <button onClick={() => scrollBy(1)} aria-label="Scroll right" className="btn-ghost sm">
          <Icon name="arrowRight" size={14} />
        </button>
      </div>

      <motion.div
        ref={scrollerRef}
        className="h-scroller reviews-scroller"
        variants={fadeUp}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="reviews-card-slot">
                <div className="skeleton reviews-skeleton" />
              </div>
            ))
          : reviews.length === 0
          ? (
            <p className="reviews-empty">
              {t('reviews.empty')}
            </p>
          )
          : reviews.map((r) => (
              <article
                key={r.id}
                className="review-card reviews-card-slot reviews-card-body"
                style={{ cursor: r.product ? 'pointer' : 'default' }}
                onClick={() => {
                  if (r.product?.slug) navigate(`/${r.product.slug}`);
                }}
                title={r.product ? `View ${r.product.name}` : undefined}
              >
                <div className="review-author-row">
                  <div className="review-avatar">
                    {(r as any).isGoogle ? (
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </div>
                    ) : initials(displayName(r))}
                  </div>
                  <div className="review-author-info">
                    <div className="review-author-name">
                      {displayName(r)}
                    </div>
                    <div className="review-verified-label">{r.verified ? t('reviews.verified') : ''}</div>
                  </div>
                </div>
                <Stars rating={r.rating} size={13} />
                <p className="review-body">
                  "{r.body}"
                </p>
                {r.product && (
                  <div className="review-product-tag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {r.product.name.toUpperCase()}
                    <span style={{ opacity: 0.7, fontSize: '10px' }}>→</span>
                  </div>
                )}
              </article>
            ))}
      </motion.div>

      <p className="sm:hidden reviews-swipe-hint">
        ← {t('reviews.swipe')} →
      </p>
    </motion.section>
  );
}
