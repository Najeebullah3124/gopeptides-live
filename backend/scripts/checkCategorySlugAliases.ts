/**
 * ponytail: category filter must resolve live NL slug aliases.
 */
import assert from 'assert';

// Mirror of productController categorySlugVariants
const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  'weight-management': ['gewichtsbeheer-energie', 'gewichtscontrole'],
  'gewichtsbeheer-energie': ['weight-management', 'gewichtscontrole'],
};

function categorySlugVariants(slug: string): string[] {
  const s = slug.trim().toLowerCase();
  return Array.from(new Set([s, ...(CATEGORY_SLUG_ALIASES[s] || [])]));
}

assert.deepEqual(
  categorySlugVariants('weight-management').sort(),
  ['gewichtsbeheer-energie', 'gewichtscontrole', 'weight-management'].sort(),
);
assert.ok(categorySlugVariants('gewichtsbeheer-energie').includes('weight-management'));
console.log('OK category slug aliases');
