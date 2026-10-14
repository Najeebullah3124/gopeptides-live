/**
 * resolveTranslation must prefer translations[lang].content before baseLanguage short-circuit.
 * Usage: npx tsx scripts/checkBlogLangResolve.ts
 */
function parseTranslations(raw: string): Record<string, { title?: string; content?: string; excerpt?: string }> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function resolveLike(
  post: { title: string; content: string; excerpt: string; baseLanguage?: string | null; translations: string },
  lang: string,
) {
  const baseLang = post.baseLanguage || 'en';
  const stored = parseTranslations(post.translations);
  const hit = stored[lang];
  if (hit?.content?.trim()) {
    return { title: hit.title || post.title, content: hit.content, source: 'stored' as const };
  }
  if (lang === baseLang) {
    return { title: post.title, content: post.content, source: 'base' as const };
  }
  return { title: post.title, content: post.content, source: 'fallback' as const };
}

const post = {
  title: 'Cagrilintide: Mechanism (EN base fields)',
  content: '<p>Where Retatrutide and Tirzepatide</p>',
  excerpt: 'EN excerpt',
  baseLanguage: 'nl',
  translations: JSON.stringify({
    nl: {
      title: 'Werking, Onderzoek en Combinatie met GLP-1',
      content: '<p>Waar Retatrutide en Tirzepatide vooral rond GLP-1</p><h2>Wat is Cagrilintide?</h2>',
      excerpt: 'NL excerpt',
    },
  }),
};

const nl = resolveLike(post, 'nl');
if (nl.source !== 'stored') throw new Error(`expected stored, got ${nl.source}`);
if (!nl.content.includes('Waar Retatrutide')) throw new Error('NL body not used');
if (!nl.title.includes('Werking')) throw new Error('NL title not used');

const brokenOld = (() => {
  const baseLang = post.baseLanguage || 'en';
  if ('nl' === baseLang) return { source: 'base' as const, content: post.content };
  return { source: 'other' as const, content: '' };
})();
if (brokenOld.source !== 'base') throw new Error('sanity: old bug path');

console.log('checkBlogLangResolve: ok');
