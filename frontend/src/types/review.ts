export interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
  guestName: string | null;
  user: { firstName: string; lastName: string } | null;
  product?: { name: string; slug: string };
}

export interface ReviewListResponse {
  data: Review[];
  meta: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    averageRating: number;
    reviewCount: number;
  };
}

export interface ReviewInput {
  productId: string;
  rating: number;
  title: string;
  body: string;
  guestName?: string;
  guestEmail?: string;
}

export interface GoogleReviewSummary {
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  address: string;
  placeId: string;
  source: 'live' | 'fallback';
  reviews?: Array<{
    authorAttribution?: { displayName: string; photoUri: string };
    rating: number;
    text?: { text: string };
    relativePublishTimeDescription?: string;
  }>;
}
