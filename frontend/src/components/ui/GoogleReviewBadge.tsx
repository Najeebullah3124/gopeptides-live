import { useQuery } from '@tanstack/react-query';
import { reviewService } from '@/services/reviewService';
import { cn } from '@/utils/helpers';
import { useT } from '@/hooks/useT';

function GoogleGlyph({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      'rounded-full bg-white flex items-center justify-center shrink-0',
      compact ? 'w-5 h-5' : 'w-8 h-8',
    )}>
      <svg viewBox="0 0 24 24" className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    </div>
  );
}

function Stars({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={cn(size, 'fill-current')} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
        </svg>
      ))}
    </>
  );
}

export function GoogleReviewBadge({
  compact = false,
  className = '',
  aggregate = false,
  labelType = 'google',
}: {
  compact?: boolean;
  className?: string;
  aggregate?: boolean;
  labelType?: 'google' | 'combined';
}) {
  const { t, lang } = useT();
  const { data } = useQuery({
    queryKey: ['reviews', 'google-meta'],
    queryFn: reviewService.googleSummary,
    staleTime: 30 * 60 * 1000,
  });
  const { data: approved } = useQuery({
    queryKey: ['reviews', 'approved-count', lang],
    queryFn: () => reviewService.listApproved(1, 1, lang),
    staleTime: 5 * 60_000,
    enabled: aggregate,
  });

  const googleRating = Number(data?.rating ?? 5.0);
  const googleCount = Number(data?.reviewCount ?? 0);
  const productCount = aggregate ? Number(approved?.meta.totalCount ?? 0) : 0;
  const productRating = aggregate ? Number(approved?.meta.averageRating ?? 0) : 0;
  const reviewCount = googleCount + productCount;
  const ratingValue = reviewCount > 0
    ? (googleRating * googleCount + productRating * productCount) / reviewCount
    : googleRating;
  const rating = ratingValue.toFixed(1);
  const href = data?.url || 'https://search.google.com/local/reviews?placeid=ChIJP40W2xoLxkcR1VHaE5jeXLw';

  if (compact) {
    if (labelType === 'combined') {
      return (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white border border-white/10',
            className,
          )}
        >
          <div className="flex items-center text-[#FFD700]">
            <Stars compact />
          </div>
          <span className="ml-1 text-[10px]">{rating} ({reviewCount}) {t('googleReview.combinedLabel')}</span>
        </div>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors px-2.5 py-1 rounded-full text-[10px] font-bold text-white no-underline border border-white/10',
          className,
        )}
      >
        <GoogleGlyph compact />
        <div className="flex items-center text-[#FFD700]">
          <Stars compact />
        </div>
        <span className="ml-1 text-[10px]">Google {rating} ({reviewCount})</span>
      </a>
    );
  }

  if (labelType === 'combined') {
    return (
      <div
        className={cn(
          'bg-white rounded-xl shadow-xl p-3 flex items-center gap-3',
          className,
        )}
      >
        <div className="flex flex-col">
          <div className="flex items-center text-[#FFD700]">
            <Stars />
            <span className="text-gray-900 font-bold ml-1 text-sm tracking-wide">{rating}</span>
          </div>
          <div className="text-gray-900 font-bold text-[13px] leading-tight">{t('reviews.title')}</div>
          <div className="text-gray-500 text-[10px]">{t('googleReview.combinedBasedOn', { count: reviewCount })}</div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'bg-white rounded-xl shadow-xl p-3 flex items-center gap-3 hover:scale-105 transition-transform duration-300 no-underline',
        className,
      )}
    >
      <GoogleGlyph />
      <div className="flex flex-col">
        <div className="flex items-center text-[#FFD700]">
          <Stars />
          <span className="text-gray-900 font-bold ml-1 text-sm tracking-wide">{rating}</span>
        </div>
        <div className="text-gray-900 font-bold text-[13px] leading-tight">{t('googleReview.topRated')}</div>
        <div className="text-gray-500 text-[10px]">{t('googleReview.basedOn', { count: reviewCount })}</div>
      </div>
    </a>
  );
}
