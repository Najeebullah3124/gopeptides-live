import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { useLangStore } from '@/stores/langStore';
import type { ProductListFilters } from '@/types/product';

export function useProducts(filters: ProductListFilters = {}, opts?: { enabled?: boolean }) {
  const lang = useLangStore((s) => s.lang);
  const normalizedCategory = filters.category ? normalizeSlug(filters.category, 'category', lang) : undefined;
  const normalizedFilters = { ...filters, category: normalizedCategory };
  return useQuery({
    queryKey: ['products', normalizedFilters, lang],
    queryFn: () => productService.list(normalizedFilters, lang),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: opts?.enabled !== false,
  });
}

export function useFeaturedProducts() {
  const lang = useLangStore((s) => s.lang);
  return useQuery({
    queryKey: ['products', 'featured', lang],
    queryFn: () => productService.featured(lang),
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  const lang = useLangStore((s) => s.lang);
  return useQuery({
    queryKey: ['categories', lang],
    queryFn: () => productService.categories(lang),
    staleTime: 10 * 60_000,
  });
}

import { normalizeSlug } from '@/utils/slugTranslator';

export function useProduct(slug: string | undefined) {
  const lang = useLangStore((s) => s.lang);
  const normalizedSlug = slug ? normalizeSlug(slug, 'product', lang) : undefined;
  return useQuery({
    queryKey: ['product', normalizedSlug, lang],
    queryFn: () => productService.bySlug(normalizedSlug as string, lang),
    enabled: !!normalizedSlug,
    staleTime: 5 * 60_000,
  });
}

export function useRelatedProducts(id: string | undefined) {
  const lang = useLangStore((s) => s.lang);
  return useQuery({
    queryKey: ['product', id, 'related', lang],
    queryFn: () => productService.related(id as string, lang),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

export function useProductVariants(name: string | undefined, currentSlug: string | undefined) {
  const lang = useLangStore((s) => s.lang);
  return useQuery({
    queryKey: ['product-variants', name, lang],
    queryFn: () => productService.list({ search: name, limit: 50 }, lang),
    enabled: !!name,
    staleTime: 5 * 60_000,
    select: (data) =>
      (data?.data || [])
        .filter((p) => p.name === name)
        .sort((a, b) => parseFloat(a.weight) - parseFloat(b.weight))
        .map((p) => ({ ...p, isCurrent: p.slug === currentSlug })),
  });
}
