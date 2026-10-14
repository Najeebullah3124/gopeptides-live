/**
 * Unit + optional live HTTP checks for req #2 localized paths.
 * Run: npx tsx scripts/checkLocalizedPaths.ts
 * Skip live: SKIP_LIVE=1 npx tsx scripts/checkLocalizedPaths.ts
 */
import assert from 'node:assert/strict';
import {
  pathForLang,
  resolveLocalizedPath,
  rewritePathForLang,
  hreflangAlternates,
  slugForLang,
  PAGE_PATHS,
} from '../src/utils/seoPaths';

function checkUnit(): void {
  assert.equal(pathForLang('shop', 'nl'), '/winkel');
  assert.equal(pathForLang('shop', 'en'), '/shop');
  assert.equal(pathForLang('shop', 'de'), '/shop');
  assert.equal(pathForLang('labresults', 'nl'), '/labresultaten');
  assert.equal(pathForLang('labresults', 'en'), '/lab-results');
  assert.equal(pathForLang('labresults', 'de'), '/laborergebnisse');
  assert.equal(pathForLang('contact', 'de'), '/kontakt');
  assert.equal(pathForLang('privacy', 'de'), '/datenschutz');
  assert.equal(pathForLang('shop', 'nl', 'herstel-huid-onderzoek'), '/winkel/herstel-huid-onderzoek');

  assert.equal(resolveLocalizedPath('/winkel').pageKey, 'shop');
  assert.equal(resolveLocalizedPath('/labresultaten').pageKey, 'labresults');
  assert.equal(resolveLocalizedPath('/lab-results').canonicalInner, '/lab-results');
  assert.equal(rewritePathForLang('/shop', 'nl'), '/winkel');
  assert.equal(rewritePathForLang('/winkel', 'en'), '/shop');

  const alts = hreflangAlternates('/shop');
  const by = Object.fromEntries(alts.map((a) => [a.hreflang, a.href]));
  assert.ok(by.nl.includes('/winkel'), by.nl);
  assert.ok(by.en.includes('/shop'), by.en);
  assert.ok(by.de.includes('/shop'), by.de);

  const restAlts = hreflangAlternates('/shop/x', '', { nl: 'nl-slug', en: 'en-slug', de: 'de-slug' });
  const restBy = Object.fromEntries(restAlts.map((a) => [a.hreflang, a.href]));
  assert.ok(restBy.nl.includes('/winkel/nl-slug'), restBy.nl);
  assert.ok(restBy.en.includes('/shop/en-slug'), restBy.en);

  assert.equal(slugForLang('primary', { slugEn: 'en-one' }, 'en'), 'en-one');
  assert.equal(slugForLang('primary', { slugEn: 'en-one' }, 'nl'), 'primary');

  const segs = new Set(Object.values(PAGE_PATHS).flatMap((m) => Object.values(m)));
  assert.ok(segs.has('winkel'));
  assert.ok(segs.has('datenschutz'));
  console.log('checkLocalizedPaths: unit ok');
}

async function checkLive(): Promise<void> {
  if (process.env.SKIP_LIVE === '1') {
    console.log('checkLocalizedPaths: live skipped');
    return;
  }
  const BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  async function hit(url: string, redirect: RequestRedirect = 'manual') {
    const res = await fetch(url, { redirect, headers: { 'User-Agent': BOT, Accept: 'text/html' } });
    return { status: res.status, location: res.headers.get('location'), body: redirect === 'follow' ? await res.text() : '' };
  }

  const nlShop = await hit('https://gopeptides.nl/winkel', 'follow');
  assert.equal(nlShop.status, 200, 'nl /winkel');
  assert.ok(nlShop.body.includes('rel="canonical"') && nlShop.body.includes('gopeptides.nl/winkel'), 'nl canonical winkel');

  const nlOld = await hit('https://gopeptides.nl/shop', 'manual');
  assert.equal(nlOld.status, 301, 'nl /shop → 301');
  assert.ok((nlOld.location || '').includes('/winkel'), `nl shop location ${nlOld.location}`);

  const euLab = await hit('https://gopeptides.eu/lab-results', 'follow');
  assert.equal(euLab.status, 200, 'eu lab-results');

  const deKontakt = await hit('https://gopeptides.de/kontakt', 'follow');
  assert.equal(deKontakt.status, 200, 'de kontakt');

  const dePrivacy = await hit('https://gopeptides.de/datenschutz', 'follow');
  assert.equal(dePrivacy.status, 200, 'de datenschutz');

  console.log('checkLocalizedPaths: live ok');
}

checkUnit();
checkLive()
  .then(() => console.log('checkLocalizedPaths: ok'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
