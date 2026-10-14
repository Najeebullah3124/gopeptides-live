/**
 * AEO content sanity: answer length band + product FAQ count.
 * Run: npx tsx scripts/checkAeoContent.ts
 */
import {
  aeoPageAnswer,
  aeoProductAnswer,
  aeoProductFaqs,
} from '../src/services/aeoContent';

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

for (const lang of ['en', 'nl', 'de'] as const) {
  for (const page of ['home', 'shop', 'labresults'] as const) {
    const w = wordCount(aeoPageAnswer(page, lang));
    assert(w >= 25 && w <= 100, `${page}/${lang} words=${w}`);
  }
  const ans = aeoProductAnswer('Retatrutide', '10 mg', '>99%', lang);
  assert(wordCount(ans) >= 25 && wordCount(ans) <= 100, `product answer ${lang}`);
  const faqs = aeoProductFaqs('Retatrutide', '10 mg', '>99%', lang);
  assert(faqs.length === 3, `faq count ${lang}`);
  for (const f of faqs) {
    assert(f.question.includes('Retatrutide'), `faq q missing name (${lang})`);
    assert(wordCount(f.answer) >= 15, `faq answer short (${lang})`);
  }
}

console.log('checkAeoContent: ok');
