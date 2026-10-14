import { buildPageSeo, countCrawlerWords } from '../src/services/seoMetaService';
import { injectSeoIntoHtml } from '../src/services/seoHtmlService';
import fs from 'fs';
import path from 'path';

const cases = [
  ['/cagrilintide-10mg', ''],
  ['/cagrilintide-10mg', '?lang=de'],
  ['/cagrilintide-10mg', '?lang=en'],
  ['/cagrilintide-5mg', '?lang=en'],
  ['/about', ''],
  ['/about', '?lang=de'],
  ['/shipping', '?lang=de'],
  ['/shop/hormonal', ''],
  ['/shop/recovery', '?lang=en'],
  ['/blog/peptide-storage-and-reconstitution-a-researchers-practical-guide', ''],
  ['/blog/how-to-read-a-peptide-certificate-of-analysis-a-researchers-checklist', ''],
  ['/blog/sermorelin-and-growth-hormone-secretagogues-in-anti-aging-research', '?lang=de'],
];

function prerenderWords(html: string): number {
  const m = html.match(/<article id="seo-prerender"[^>]*>([\s\S]*?)<\/article>/i);
  if (!m) return 0;
  const text = m[1].replace(/<[^>]+>/g, ' ');
  return countCrawlerWords(text);
}

async function main() {
  const templatePath = path.resolve(__dirname, '../../frontend-build/dist/index.html');
  const template = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '<html><head><title>x</title></head><body><div id="root"></div></body></html>';
  let minWords = Infinity;

  for (const [p, search] of cases) {
    const seo = await buildPageSeo(p, search, 'https://gopeptides.nl');
    const html = injectSeoIntoHtml(template, seo);
    const words = prerenderWords(html);
    minWords = Math.min(minWords, words);
    const h2 = seo.editable?.h2?.join(' | ') ?? '';
    console.log(`${p}${search}`);
    console.log(`  lang=${seo.htmlLang} words=${words} title=${seo.fullTitle.slice(0, 60)}`);
    console.log(`  h2=[${h2}]`);
    console.log();
  }

  if (minWords < 200) {
    console.error(`FAIL: lowest prerender word count ${minWords} < 200`);
    process.exit(1);
  }
  console.log(`OK: all cases >= 200 words (min ${minWords})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
