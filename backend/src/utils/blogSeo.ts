type BlogLang = 'en' | 'nl' | 'de';

type BlogSeoSource = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  baseLanguage?: string | null;
  translations: string;
};

type SeoBox = { seoTitle?: string; seoDescription?: string };

function stripBrand(title: string): string {
  return title.replace(/\s*[|—–-]\s*GoPeptides(\s+Blog)?\s*$/i, '').trim();
}

function parseBoxes(raw: string): Record<string, SeoBox> {
  try {
    const value = JSON.parse(raw || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

/**
 * Language of the post's top-level seoTitle/seoDescription (the admin's "English SEO" box).
 * Posts are written in nl and admins have filled that box both ways: when the base language
 * also has its own, different SEO box, the top box is the English copy; otherwise it is the
 * base language's own SEO.
 */
export function blogTopSeoLang(post: BlogSeoSource): BlogLang {
  const base = (post.baseLanguage || 'en') as BlogLang;
  if (base === 'en') return 'en';
  const baseBox = parseBoxes(post.translations)[base]?.seoTitle?.trim();
  const top = post.seoTitle?.trim();
  if (baseBox && top && stripBrand(baseBox) !== stripBrand(top)) return 'en';
  return base;
}

/** Admin-written SEO title/description for exactly this language — never another language's text. */
export function blogSeoForLang(post: BlogSeoSource, lang: BlogLang): { title?: string; description?: string } {
  const own = parseBoxes(post.translations)[lang] || {};
  const isTop = blogTopSeoLang(post) === lang;
  return {
    title: own.seoTitle?.trim() || (isTop ? post.seoTitle?.trim() || undefined : undefined),
    description: own.seoDescription?.trim() || (isTop ? post.seoDescription?.trim() || undefined : undefined),
  };
}
