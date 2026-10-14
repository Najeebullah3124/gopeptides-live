import assert from 'node:assert/strict';
import { generateLlmsTxt, generatePageSitemap, generateRobots, generateSitemapIndex, resolveSiteUrl } from '../src/services/seoService';
import { buildPageSeo } from '../src/services/seoMetaService';

async function main(): Promise<void> {
  assert.equal(resolveSiteUrl('gopeptides.eu'), 'https://gopeptides.eu');
  assert.equal(resolveSiteUrl('www.gopeptides.de'), 'https://gopeptides.de');
  assert.equal(resolveSiteUrl('gopeptides.nl'), 'https://gopeptides.nl');

  const euIndex = await generateSitemapIndex('https://gopeptides.eu');
  assert.match(euIndex, /https:\/\/gopeptides\.eu\/post-sitemap\.xml/);
  assert.doesNotMatch(euIndex, /gopeptides\.nl/);
  assert.match(euIndex, /href="https:\/\/gopeptides\.eu\/sitemap\.xsl"/);

  const nlIndex = await generateSitemapIndex('https://gopeptides.nl');
  assert.match(nlIndex, /https:\/\/gopeptides\.nl\/page-sitemap\.xml/);

  const euRobots = await generateRobots('https://gopeptides.eu');
  assert.match(euRobots, /Sitemap: https:\/\/gopeptides\.eu\/sitemap\.xml/);
  assert.doesNotMatch(euRobots, /gopeptides\.nl/);

  const euLlms = await generateLlmsTxt('https://gopeptides.eu');
  assert.match(euLlms, /\(https:\/\/gopeptides\.eu\/\)/);
  assert.match(euLlms, /https:\/\/gopeptides\.eu\/shop/);
  assert.doesNotMatch(euLlms, /https:\/\/gopeptides\.nl\//);
  assert.match(euLlms, /## Entity/);
  assert.match(euLlms, /research-use-only/i);

  const pageSitemap = await generatePageSitemap('https://gopeptides.nl');
  assert.match(pageSitemap, /<changefreq>daily<\/changefreq>/);
  assert.doesNotMatch(pageSitemap, /<changefreq>(weekly|monthly)<\/changefreq>/);

  const nlHome = await buildPageSeo('/', '', 'https://gopeptides.nl');
  assert.equal(nlHome.canonical, 'https://gopeptides.nl/');
  const euHome = await buildPageSeo('/', '', 'https://gopeptides.eu');
  assert.equal(euHome.canonical, 'https://gopeptides.eu/');
  const deHome = await buildPageSeo('/', '', 'https://gopeptides.de');
  assert.equal(deHome.canonical, 'https://gopeptides.de/');
  assert.ok(deHome.h1.length > 0, 'expected default H1');

  console.log('checkSitemapHost: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
