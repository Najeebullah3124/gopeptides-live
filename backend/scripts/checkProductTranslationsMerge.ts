/**
 * Guards admin product update translation merge order.
 * Run: npx tsx scripts/checkProductTranslationsMerge.ts
 */
import assert from 'assert';

/** Mirrors updateProduct translations branch order. */
function resolveTranslationsUpdate(b: {
  name?: string;
  description?: string;
  shortDesc?: string;
  benefits?: unknown;
  translations?: string | object;
}): string | undefined {
  if (b.translations !== undefined) {
    return typeof b.translations === 'object' ? JSON.stringify(b.translations) : b.translations;
  }
  if (b.name !== undefined || b.description !== undefined || b.shortDesc !== undefined || b.benefits !== undefined) {
    return '{}';
  }
  return undefined;
}

const withNl = resolveTranslationsUpdate({
  name: 'Retatrutide',
  description: 'EN body',
  translations: { nl: { name: 'Retatrutide', description: 'NL body' } },
});
assert.ok(withNl && withNl.includes('NL body'), 'explicit NL translations must win over wipe');

const wipeOnly = resolveTranslationsUpdate({ description: 'changed EN only' });
assert.strictEqual(wipeOnly, '{}', 'EN-only change without translations wipes cache');

const priceOnly = resolveTranslationsUpdate({});
assert.strictEqual(priceOnly, undefined, 'no text fields → leave translations untouched');

console.log('checkProductTranslationsMerge: ok');
