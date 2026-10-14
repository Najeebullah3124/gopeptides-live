const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  nl: {
    recovery: 'herstel',
    cognitive: 'cognitief',
    hormonal: 'hormonaal',
    'weight-management': 'gewichtscontrole',
    'anti-aging': 'longevity-vitaliteit',
    'supplies-extras': 'benodigdheden-extras',
  },
  de: {
    recovery: 'erholung',
    cognitive: 'kognitiv',
    hormonal: 'hormonell',
    'weight-management': 'gewichtskontrolle',
  },
};

/** Live catalog NL slugs → canonical i18n slug keys. */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'focus-kalmte': 'cognitive',
  cognitief: 'cognitive',
  'gewichtsbeheer-energie': 'weight-management',
  gewichtscontrole: 'weight-management',
  'groei-prestatie': 'hormonal',
  hormonaal: 'hormonal',
  'herstel-huidverzorging': 'recovery',
  herstel: 'recovery',
  'longevity-vitaliteit': 'anti-aging',
  'benodigdheden-extras': 'supplies-extras',
};

export function translateSlug(slug: string, type: 'category' | 'product', lang: string): string {
  if (!slug) return slug;
  if (type === 'category') {
    return CATEGORY_TRANSLATIONS[lang]?.[slug] ?? slug;
  }
  if (type === 'product') {
    let result = slug;
    if (result.includes('retatutride')) {
      result = result.replace('retatutride', 'retatrutide');
    }
    if (lang === 'de' || lang === 'nl') {
      // Suffix -tide to -tid for German & Dutch
      result = result.replace(/tide-/gi, 'tid-');
    }
    return result;
  }
  return slug;
}

/**
 * Normalizes a localized URL slug back to the canonical database slug.
 * Checks all language mappings to be extremely robust during language transitions.
 */
export function normalizeSlug(slug: string, type: 'category' | 'product', _lang?: string): string {
  if (!slug) return slug;
  if (type === 'category') {
    if (CATEGORY_SLUG_ALIASES[slug]) return CATEGORY_SLUG_ALIASES[slug];
    // Search all language mappings to resolve the canonical slug
    for (const dict of Object.values(CATEGORY_TRANSLATIONS)) {
      for (const [orig, trans] of Object.entries(dict)) {
        if (trans === slug) return orig;
      }
    }
    return slug;
  }
  if (type === 'product') {
    let result = slug;
    // Always map German/Dutch -tid suffix back to -tide to prevent 404s during transition
    result = result.replace(/tid-/gi, 'tide-');
    if (result.includes('retatutride')) {
      result = result.replace('retatutride', 'retatrutide');
    }
    return result;
  }
  return slug;
}
