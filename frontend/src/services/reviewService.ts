import { api, unwrap } from './api';
import type { GoogleReviewSummary, Review, ReviewInput, ReviewListResponse } from '@/types/review';

type RawGoogleReviewSummary = Partial<GoogleReviewSummary> & { userRatingCount?: number };

export const reviewService = {
  listForProduct(productId: string, page = 1, limit = 10, lang = 'en'): Promise<ReviewListResponse> {
    return api
      .get<ReviewListResponse>(`/reviews/product/${productId}`, {
        params: { page, limit, ...(lang !== 'en' ? { lang } : {}) },
      })
      .then((r) => r.data);
  },
  listApproved(page = 1, limit = 24, lang = 'en'): Promise<{ data: Review[]; meta: { totalCount: number; totalPages: number; averageRating?: number } }> {
    return api
      .get<{ data: Review[]; meta: { totalCount: number; totalPages: number; averageRating?: number } }>('/reviews/approved', {
        params: { page, limit, ...(lang !== 'en' ? { lang } : {}) },
      })
      .then((r) => r.data);
  },
  googleSummary(): Promise<GoogleReviewSummary> {
    return unwrap<RawGoogleReviewSummary>(api.get('/reviews/google-meta')).then((data) => ({
      name: data.name || 'GoPeptides',
      rating: Number(data.rating ?? 5),
      reviewCount: Number(data.reviewCount ?? data.userRatingCount ?? 0),
      url: data.url || 'https://search.google.com/local/reviews?placeid=ChIJP40W2xoLxkcR1VHaE5jeXLw',
      address: data.address || '',
      placeId: data.placeId || '',
      source: data.source || 'live',
      reviews: data.reviews,
    }));
  },
  create(payload: ReviewInput): Promise<Review> {
    return unwrap(api.post('/reviews', payload));
  },
  adminList(approved?: boolean | null, page = 1): Promise<{ data: Review[]; meta: { totalCount: number; totalPages: number } }> {
    return api
      .get<{ data: Review[]; meta: { totalCount: number; totalPages: number } }>('/reviews', {
        params: { approved: approved === null ? undefined : approved, page },
      })
      .then((r) => r.data);
  },
  approve(id: string): Promise<Review> {
    return unwrap(api.put(`/reviews/${id}/approve`));
  },
  unapprove(id: string): Promise<Review> {
    return unwrap(api.put(`/reviews/${id}/unapprove`));
  },
  delete(id: string): Promise<unknown> {
    return api.delete(`/reviews/${id}`);
  },
};
