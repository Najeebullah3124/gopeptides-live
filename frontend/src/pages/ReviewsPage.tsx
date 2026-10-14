import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { reviewService } from '@/services/reviewService';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { Stars } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { timeAgo } from '@/utils/helpers';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function ReviewsPage() {
  const { t, lang } = useT();
  const pageSeo = usePageSeo('/reviews');
  useSEO({
    title: pageSeo.editable?.title || t('reviews.allTitle'),
    description: pageSeo.editable?.description || t('reviews.subtitle'),
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates,
  });

  // DB / website reviews
  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'all-approved', lang],
    queryFn: () => reviewService.listApproved(1, 24, lang),
    staleTime: 5 * 60_000,
  });

  // Google reviews
  const { data: googleMeta, isLoading: isLoadingGoogle } = useQuery({
    queryKey: ['reviews', 'google-meta'],
    queryFn: reviewService.googleSummary,
    staleTime: 5 * 60_000,
  });

  const googleReviews = googleMeta?.reviews || [];
  const dbReviews = data?.data || [];
  const hasGoogle = googleReviews.length > 0;
  const hasDb = dbReviews.length > 0;

  return (
    <div className="container-app section-pad max-w-5xl">
      <header className="text-center mb-10">
        <p className="eyebrow">{t('reviews.allEyebrow')}</p>
        <h1 className="text-4xl font-extrabold text-ink mb-3" style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}>
          {pageSeo.editable?.h1 || t('reviews.allTitle')}
        </h1>
        <p className="text-ink-muted max-w-xl mx-auto">{t('reviews.allDesc')}</p>
      </header>

      {/* Google Reviews Section */}
      {(isLoadingGoogle || hasGoogle) && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              {/* Google G icon */}
              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-bold text-ink text-lg">Google Reviews</span>
            </div>
            {googleMeta && (
              <div className="flex items-center gap-2 ml-2">
                <Stars rating={googleMeta.rating || 5} size={14} />
                <span className="font-bold text-primary">{(googleMeta.rating || 5).toFixed(1)}</span>
                <span className="text-ink-muted text-sm">({googleMeta.reviewCount || 0})</span>
              </div>
            )}
          </div>

          {isLoadingGoogle ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {[0, 1].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : hasGoogle ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {googleReviews.map((gr, i) => (
                <article key={`g-${i}`} className="card p-6 flex flex-col border-l-4 border-[#4285F4]">
                  <div className="flex items-center justify-between mb-3">
                    <Stars rating={gr.rating} size={14} />
                    <span className="flex items-center gap-1 text-xs text-ink-muted font-medium">
                      <svg viewBox="0 0 24 24" width="12" height="12" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </span>
                  </div>
                  {gr.text?.text && (
                    <p className="text-sm text-ink-muted leading-relaxed flex-1 mb-4">"{gr.text.text}"</p>
                  )}
                  <div className="pt-4 border-t border-lineSoft flex items-center gap-3">
                    {gr.authorAttribution?.photoUri && (
                      <img
                        src={gr.authorAttribution.photoUri}
                        alt={gr.authorAttribution.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <p className="text-xs font-semibold text-ink">
                      {gr.authorAttribution?.displayName || 'Google User'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-ink-muted text-sm">
              Google reviews are syncing — check back soon.
            </div>
          )}
        </section>
      )}

      {/* Divider */}
      {(hasGoogle || isLoadingGoogle) && (
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-lineSoft" />
          <span className="text-xs uppercase tracking-widest text-ink-muted font-semibold">Verified Purchase Reviews</span>
          <div className="flex-1 h-px bg-lineSoft" />
        </div>
      )}

      {/* DB / Website Reviews */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !hasDb ? (
        <div className="card p-12 text-center">
          <p className="text-ink-muted">{t('reviews.empty')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {dbReviews.map((r) => (
            <article key={r.id} className="card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <Stars rating={r.rating} size={14} />
                {r.verified && (
                  <span className="badge bg-success/10 text-success border border-success/30">
                    {t('reviews.verified')}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-ink mb-2">{r.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed flex-1 mb-4">"{r.body}"</p>
              <div className="pt-4 border-t border-lineSoft flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {r.user ? `${r.user.firstName} ${r.user.lastName.charAt(0)}.` : r.guestName}
                  </p>
                  <p className="text-[10px] text-ink-muted mt-0.5">{timeAgo(r.createdAt)}</p>
                </div>
                {r.product && (
                  <Link
                    to={`/${r.product.slug}`}
                    className="text-[11px] font-semibold text-primary hover:text-primary-light flex items-center gap-1"
                  >
                    {r.product.name}
                    <Icon name="arrowRight" size={10} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <Link to="/shop" className="btn-cta lg">
          {t('about.cta.browse')}
          <Icon name="arrowRight" size={14} />
        </Link>
      </div>

      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}
