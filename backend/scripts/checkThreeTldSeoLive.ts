/**
 * Live HTTP matrix: 3 websites × language homes — canonical, hreflang, redirects, titles.
 * Also unit-checks buildPageSeo JSON-LD url matches lang home (no DB write).
 *
 * Run: npx tsx scripts/checkThreeTldSeoLive.ts
 * Optional: SKIP_LIVE=1 to only run in-process schema checks.
 */
import assert from 'node:assert/strict';
import { canonicalBaseForLang, hreflangAlternates } from '../src/utils/seoPaths';
import { buildPageSeo } from '../src/services/seoMetaService';

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HOSTS = [
  { host: 'gopeptides.nl', lang: 'nl' as const },
  { host: 'gopeptides.eu', lang: 'en' as const },
  { host: 'gopeptides.de', lang: 'de' as const },
];

function pick(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m?.[1] ?? null;
}

async function fetchText(url: string, redirect: 'manual' | 'follow' = 'follow'): Promise<{ status: number; location: string | null; body: string }> {
  const res = await fetch(url, {
    redirect,
    headers: { 'User-Agent': BOT_UA, Accept: 'text/html' },
  });
  const location = res.headers.get('location');
  const body = redirect === 'manual' ? '' : await res.text();
  return { status: res.status, location, body };
}

async function checkInProcess(): Promise<void> {
  for (const { host, lang } of HOSTS) {
    const base = `https://${host}`;
    const home = await buildPageSeo('/', '', base);
    assert.equal(home.canonical, `${canonicalBaseForLang(lang)}/`);
    const org = home.jsonLd?.find((b) => b['@type'] === 'Organization') as { url?: string } | undefined;
    const web = home.jsonLd?.find((b) => b['@type'] === 'WebSite') as { url?: string } | undefined;
    const page = home.jsonLd?.find((b) => b['@type'] === 'WebPage') as { url?: string } | undefined;
    assert.equal(org?.url, canonicalBaseForLang(lang), `${host} Organization.url`);
    assert.equal(web?.url, canonicalBaseForLang(lang), `${host} WebSite.url`);
    assert.equal(page?.url, `${canonicalBaseForLang(lang)}/`, `${host} WebPage.url`);

    const alts = hreflangAlternates('/');
    const by = Object.fromEntries(alts.map((a) => [a.hreflang, a.href]));
    assert.equal(by.nl, 'https://gopeptides.nl/');
    assert.equal(by.en, 'https://gopeptides.eu/');
    assert.equal(by.de, 'https://gopeptides.de/');
    assert.equal(by['x-default'], 'https://gopeptides.nl/');
  }
  console.log('checkThreeTldSeoLive: in-process schema ok');
}

async function checkLive(): Promise<void> {
  const titles = new Map<string, string>();

  for (const { host, lang } of HOSTS) {
    const url = `https://${host}/`;
    const { status, body } = await fetchText(url);
    assert.equal(status, 200, `${url} status`);
    const canonical = pick(body, /rel="canonical"[^>]*href="([^"]+)"/i) || pick(body, /href="([^"]+)"[^>]*rel="canonical"/i);
    assert.equal(canonical, `https://${host}/`, `${host} canonical`);
    const altPairs: Array<{ hreflang: string; href: string }> = [];
    const altRe = /rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"|hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*rel="alternate"/gi;
    let m: RegExpExecArray | null;
    while ((m = altRe.exec(body))) {
      altPairs.push({ hreflang: m[1] || m[3], href: m[2] || m[4] });
    }
    const by = Object.fromEntries(altPairs.map((a) => [a.hreflang, a.href]));
    assert.equal(by.nl, 'https://gopeptides.nl/', `${host} hreflang nl`);
    assert.equal(by.en, 'https://gopeptides.eu/', `${host} hreflang en`);
    assert.equal(by.de, 'https://gopeptides.de/', `${host} hreflang de`);
    assert.equal(by['x-default'], 'https://gopeptides.nl/', `${host} hreflang x-default`);
    const title = pick(body, /<title>([^<]*)<\/title>/i) || '';
    titles.set(lang, title);
    assert.ok(title.length > 5, `${host} has title`);

    const shop = await fetchText(`https://${host}/shop`);
    assert.equal(shop.status, 200, `${host}/shop`);
    const shopCanon = pick(shop.body, /rel="canonical"[^>]*href="([^"]+)"/i) || pick(shop.body, /href="([^"]+)"[^>]*rel="canonical"/i);
    assert.equal(shopCanon, `https://${host}/shop`, `${host}/shop canonical`);
  }

  assert.notEqual(titles.get('nl'), titles.get('en'), 'NL vs EN titles differ');
  assert.notEqual(titles.get('en'), titles.get('de'), 'EN vs DE titles differ');

  // Wrong-lang query on .nl should 301 to language home
  const enBounce = await fetchText('https://gopeptides.nl/?lang=en', 'manual');
  assert.ok([301, 302].includes(enBounce.status), `nl?lang=en status ${enBounce.status}`);
  assert.ok(enBounce.location?.startsWith('https://gopeptides.eu'), `nl?lang=en → ${enBounce.location}`);

  const deBounce = await fetchText('https://gopeptides.eu/?lang=de', 'manual');
  assert.ok([301, 302].includes(deBounce.status), `eu?lang=de status ${deBounce.status}`);
  assert.ok(deBounce.location?.startsWith('https://gopeptides.de'), `eu?lang=de → ${deBounce.location}`);

  const be = await fetchText('https://gopeptides.be/shop', 'manual');
  assert.ok([301, 302].includes(be.status), `.be status ${be.status}`);
  assert.ok(be.location?.includes('gopeptides.nl'), `.be → ${be.location}`);

  console.log('checkThreeTldSeoLive: live HTTP ok');
}

async function main(): Promise<void> {
  await checkInProcess();
  if (process.env.SKIP_LIVE === '1') {
    console.log('checkThreeTldSeoLive: skipped live (SKIP_LIVE=1)');
    return;
  }
  await checkLive();
  console.log('checkThreeTldSeoLive: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
