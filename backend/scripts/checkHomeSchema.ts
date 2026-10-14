/**
 * Home page must emit Organization + WebSite JSON-LD (not just WebPage).
 * Run: npx tsx scripts/checkHomeSchema.ts
 */
import { buildPageSeo } from '../src/services/seoMetaService';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  for (const path of ['/', '/?lang=en', '/?lang=de']) {
    const [pathname, search = ''] = path.split('?');
    const seo = await buildPageSeo(pathname, search);
    const types = seo.jsonLd.map((d) => String(d['@type']));
    for (const t of ['Organization', 'WebSite', 'WebPage']) {
      assert(types.includes(t), `home ${path} missing ${t} (got ${types.join(', ')})`);
    }
    assert(Boolean(seo.directAnswer), `home ${path} missing AEO answer`);
  }

  // static pages keep their own copy + only WebPage
  const labs = await buildPageSeo('/labresults');
  assert(labs.jsonLd.some((d) => d['@type'] === 'WebPage'), 'labresults missing WebPage');
  assert(Boolean(labs.directAnswer), 'labresults missing AEO answer');

  console.log('checkHomeSchema: ok');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
