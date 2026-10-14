/**
 * Self-check: admin SEO inventory is lang/website-aware; privacy is in the page registry.
 * Run: npx tsx scripts/checkAdminSeoLang.ts
 */
import assert from 'node:assert/strict';
import { SEO_PAGE_REGISTRY, buildPageSeo } from '../src/services/seoMetaService';

async function main(): Promise<void> {
  assert.ok(SEO_PAGE_REGISTRY.some((p) => p.key === 'privacy' && p.path === '/privacy'));

  const nl = await buildPageSeo('/', '', 'https://gopeptides.nl');
  const eu = await buildPageSeo('/', '', 'https://gopeptides.eu');
  const de = await buildPageSeo('/', '', 'https://gopeptides.de');
  assert.equal(nl.canonical, 'https://gopeptides.nl/');
  assert.equal(eu.canonical, 'https://gopeptides.eu/');
  assert.equal(de.canonical, 'https://gopeptides.de/');
  assert.notEqual(nl.title, eu.title);
  assert.notEqual(eu.title, de.title);

  const privacy = await buildPageSeo('/privacy', '', 'https://gopeptides.nl');
  assert.match(privacy.title || '', /Privacy|AVG|GoPeptides|privacybeleid/i);

  console.log('checkAdminSeoLang: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
