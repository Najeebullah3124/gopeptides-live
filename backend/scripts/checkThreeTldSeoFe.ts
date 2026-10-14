/**
 * Assert FE seoPaths (loaded via relative path) matches three-TLD model.
 * Also mirrors seoMetaForLang no-NL-leak rule.
 * Run: npx tsx scripts/checkThreeTldSeoFe.ts  (from backend/)
 */
import assert from 'node:assert/strict';
import {
  canonicalBaseForLang,
  defaultLangForHost,
  hreflangAlternates,
  localizedPath,
  pageCanonical,
} from '../../frontend-build/src/utils/seoPaths';

function seoMetaForLang(
  parsed: { title?: string; titleEn?: string; titleDe?: string; description?: string; descriptionEn?: string; descriptionDe?: string },
  lang: 'en' | 'nl' | 'de',
) {
  if (lang === 'en') return { title: parsed.titleEn, description: parsed.descriptionEn };
  if (lang === 'de') return { title: parsed.titleDe, description: parsed.descriptionDe };
  return { title: parsed.title, description: parsed.description };
}

assert.equal(defaultLangForHost('gopeptides.nl'), 'nl');
assert.equal(defaultLangForHost('www.gopeptides.eu'), 'en');
assert.equal(defaultLangForHost('gopeptides.de'), 'de');
assert.equal(defaultLangForHost('gopeptides.be'), 'nl');

assert.equal(canonicalBaseForLang('nl'), 'https://gopeptides.nl');
assert.equal(canonicalBaseForLang('en'), 'https://gopeptides.eu');
assert.equal(canonicalBaseForLang('de'), 'https://gopeptides.de');

assert.equal(localizedPath('/shop', 'en', '', 'gopeptides.eu'), '/shop');
assert.equal(localizedPath('/shop', 'nl', '', 'gopeptides.eu'), '/shop?lang=nl');
assert.equal(localizedPath('/shop', 'de', '', 'gopeptides.de'), '/shop');

const alts = hreflangAlternates('/shop');
const by = Object.fromEntries(alts.map((a) => [a.hreflang, a.href]));
assert.equal(by.en, 'https://gopeptides.eu/shop');
assert.equal(by.nl, 'https://gopeptides.nl/shop');
assert.equal(by.de, 'https://gopeptides.de/shop');
assert.equal(by['x-default'], 'https://gopeptides.nl/shop');

assert.match(pageCanonical('/shop', '?lang=en'), /^https:\/\/gopeptides\.eu\/shop$/);
assert.match(pageCanonical('/shop', '?lang=de'), /^https:\/\/gopeptides\.de\/shop$/);

const saved = { title: 'NL title', titleEn: 'EN title', titleDe: 'DE title' };
assert.equal(seoMetaForLang(saved, 'nl').title, 'NL title');
assert.equal(seoMetaForLang(saved, 'en').title, 'EN title');
assert.equal(seoMetaForLang(saved, 'de').title, 'DE title');
assert.equal(seoMetaForLang({ title: 'NL only' }, 'en').title, undefined);
assert.equal(seoMetaForLang({ title: 'NL only' }, 'de').title, undefined);

console.log('checkThreeTldSeoFe: ok');
