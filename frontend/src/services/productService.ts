import { api, unwrap } from './api';
import type { Category, Product, ProductDetail, ProductListFilters } from '@/types/product';
import type { PaginationMeta } from '@/types/api';

export interface ProductListResponse {
  data: Product[];
  meta: PaginationMeta;
}

export type LabResultCard = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  purity: string;
  weight: string;
  images: Array<{ url: string; isPrimary?: boolean }>;
  batch: string;
  testDate: string | null;
  reportUrl: string | null;
  reportImages?: string[];
  dosage?: string;
  tests: Array<{ label: string; value: string; url?: string }>;
  verified: boolean;
  familySlugs?: string[];
};

export const productService = {
  async list(filters: ProductListFilters = {}, lang = 'en'): Promise<ProductListResponse> {
    const params: Record<string, string | number | boolean> = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params[k] = v as string | number | boolean;
    });
    if (lang && lang !== 'en') params.lang = lang;
    const r = await api.get<{ data: Product[]; meta: PaginationMeta }>('/products', { params });
    return { data: r.data.data, meta: r.data.meta };
  },

  labResults(): Promise<LabResultCard[]> {
    return unwrap(api.get('/products/lab-results'));
  },

  featured(lang = 'en'): Promise<Product[]> {
    return unwrap(api.get('/products/featured', { params: lang !== 'en' ? { lang } : {} }));
  },

  categories(lang = 'en'): Promise<(Category & { _count: { products: number } })[]> {
    return unwrap(api.get('/products/categories', { params: lang !== 'en' ? { lang } : {} }));
  },

  bySlug(slug: string, lang = 'en'): Promise<ProductDetail> {
    return unwrap(api.get(`/products/${encodeURIComponent(slug)}`, { params: lang !== 'en' ? { lang } : {} }));
  },

  related(id: string, lang = 'en'): Promise<Product[]> {
    return unwrap(api.get(`/products/${id}/related`, { params: lang !== 'en' ? { lang } : {} }));
  },

  byCategory(slug: string, page = 1, limit = 12, lang = 'en'): Promise<{ category: Category; products: Product[]; meta: PaginationMeta }> {
    return api
      .get<{ data: { category: Category; products: Product[] }; meta: PaginationMeta }>(`/products/category/${slug}`, {
        params: { page, limit, ...(lang !== 'en' ? { lang } : {}) },
      })
      .then((r) => ({ ...r.data.data, meta: r.data.meta }));
  },

  trackView(id: string): Promise<void> {
    return api.post(`/products/${id}/view`).then(() => undefined);
  },
};
