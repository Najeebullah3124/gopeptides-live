import { normalizeSlug } from '@/utils/slugTranslator';

/**
 * Resolve a human category label.
 * Admin/DB `name` wins so edits in Productcategorieën show on the shop.
 * i18n is fallback when name is missing (or looks like a broken key).
 */
export function categoryLabel(
  t: (key: string) => string,
  slug?: string | null,
  name?: string | null,
): string {
  const n = name?.trim();
  if (n && !/^category\./i.test(n)) return n;

  if (slug) {
    for (const s of [slug, normalizeSlug(slug, 'category')]) {
      if (!s) continue;
      const key = `category.${s}`;
      const val = t(key);
      if (val && val !== key && !/^category\./i.test(val)) return val;
    }
  }
  return 'Peptide';
}

export function categoryDesc(
  t: (key: string) => string,
  slug?: string | null,
  fallback = '',
): string {
  if (!slug) return fallback;
  for (const s of [slug, normalizeSlug(slug, 'category')]) {
    if (!s) continue;
    const key = `category.${s}.desc`;
    const val = t(key);
    if (val && val !== key && !/^category\./i.test(val)) return val;
  }
  return fallback;
}
