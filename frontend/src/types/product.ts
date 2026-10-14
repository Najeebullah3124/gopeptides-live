export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoData?: string;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt?: string | null;
  isPrimary: boolean;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  sku: string;
  purity: string;
  weight: string;
  casNumber: string;
  categoryId: string;
  category?: Category;
  images: ProductImage[];
  badge?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sequence?: string | null;
  storage?: string | null;
  benefits: string[];
  translations?: string;
  seoData?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  /** Description with internal links marked \uE000label\uE001href\uE002 (backend linkifyDescription). */
  descriptionLinked?: string;
  reviews: ProductReviewSummary[];
  stats: {
    averageRating: number;
    reviewCount: number;
  };
}

export interface ProductReviewSummary {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
  user: { firstName: string; lastName: string } | null;
  guestName: string | null;
}

export interface ProductListFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: 'featured' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  purity?: string;
}
