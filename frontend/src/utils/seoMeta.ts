import type { SeoMeta } from '@/services/seoService';

export function parseSeoData(raw?: string | null): SeoMeta {
  if (!raw) return {};
  try { return JSON.parse(raw) as SeoMeta; } catch { return {}; }
}

/** Janoshik CoA scans stored on Product.seoData — same paths as /labresults. */
export function labReportImagesFromSeo(raw?: string | null): string[] {
  if (!raw) return [];
  let seo: Record<string, unknown> = {};
  try {
    seo = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [];
  }
  const out: string[] = [];
  const push = (u: string) => {
    const t = u.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  if (Array.isArray(seo.labReportImages)) {
    for (const u of seo.labReportImages) {
      if (typeof u === 'string') push(u);
    }
  }
  if (typeof seo.labReportUrl === 'string' && seo.labReportUrl.includes('/photos/reports/')) {
    push(seo.labReportUrl);
  }
  return out;
}

/** Merge partial SEO form fields into stored seoData (Product/Category admin ↔ SEO Center). */
export function mergeSeoPatch(existing: SeoMeta, patch: Partial<SeoMeta>): SeoMeta {
  const next: SeoMeta = { ...existing };
  for (const [key, value] of Object.entries(patch) as [keyof SeoMeta, SeoMeta[keyof SeoMeta]][]) {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete next[key];
    } else {
      next[key] = value as never;
    }
  }
  return next;
}

export function buildSeoPayloadFromForm(fields: {
  seoTitle?: string;
  seoDescription?: string;
  seoH1?: string;
}, existing: SeoMeta = {}): SeoMeta {
  return mergeSeoPatch(existing, {
    title: fields.seoTitle?.trim() || undefined,
    description: fields.seoDescription?.trim() || undefined,
    h1: fields.seoH1?.trim() || undefined,
  });
}
