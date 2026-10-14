import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import sharp from 'sharp';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError, created, noContent, ok } from '../utils/apiResponse';
import { buildMeta, parsePagination } from '../utils/pagination';
import { cache } from '../services/cacheService';
import { logAudit } from '../utils/audit';
import {
  deriveDosageFromProduct,
  deleteLabelVariantAssets,
  getLabelDimensions,
  makePlaceholderBatch,
} from '../services/labelVariantHelpers';
import { mergeSeoMeta, parseSeoMeta, type SeoMeta } from '../services/seoService';
import { defaultLangForHost, RESERVED_PAGE_SEGMENTS } from '../utils/seoPaths';

/**
 * Only forces an explicit lang when the host's default isn't Dutch (.de→de, .eu→en) — a
 * request to gopeptides.nl with no ?lang= stays lang=undefined so product fields keep
 * using the fast base-column path (base columns already are Dutch) instead of routing
 * through resolveProductLang, which auto-translates and writes back on any cache miss.
 */
function hostLangOverride(host?: string | null): string | undefined {
  const hostDefault = defaultLangForHost(host || undefined);
  return hostDefault !== 'nl' ? hostDefault : undefined;
}

// ─── Product translation helpers (same pattern as blogController) ──────────

type ProductLang = 'nl' | 'de' | 'en';

interface ProductLangOverride {
  name?: string;
  shortDesc?: string;
  description?: string;
  benefits?: string;
}

const RESERVED_PUBLIC_PRODUCT_SLUGS = new Set([
  'about', 'account', 'admin', 'api', 'assets', 'blog', 'cart', 'checkout', 'contact',
  'faq', 'favicon.ico', 'forgot-password', 'health', 'labresults', 'llms.txt', 'login',
  'order-confirmation', 'orders', 'privacy', 'product', 'register', 'reset-password',
  'reviews', 'robots.txt', 'science', 'shipping', 'shop', 'sitemap.xml', 'terms',
  'uploads', 'verify-email', 'wishlist',
  ...RESERVED_PAGE_SEGMENTS,
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertPublicProductSlug(value: unknown): void {
  const slug = String(value || '').trim().toLowerCase();
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw ApiError.badRequest('Product slug must be lowercase letters, numbers, and single dashes only.');
  }
  if (RESERVED_PUBLIC_PRODUCT_SLUGS.has(slug)) {
    throw ApiError.badRequest(`The product slug "${slug}" is reserved for a site route.`);
  }
}

async function assertProductSlugAvailable(slug: string, excludeId?: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== excludeId) {
    throw ApiError.conflict(`Product slug "${slug}" is already in use.`);
  }
}

/** Live NL category slugs ↔ English i18n keys used in older URLs / filters. */
const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  'weight-management': ['gewichtsbeheer-energie', 'gewichtscontrole'],
  'gewichtsbeheer-energie': ['weight-management', 'gewichtscontrole'],
  gewichtscontrole: ['weight-management', 'gewichtsbeheer-energie'],
  cognitive: ['focus-kalmte', 'cognitief'],
  'focus-kalmte': ['cognitive', 'cognitief'],
  cognitief: ['cognitive', 'focus-kalmte'],
  hormonal: ['groei-prestatie', 'hormonaal'],
  'groei-prestatie': ['hormonal', 'hormonaal'],
  hormonaal: ['hormonal', 'groei-prestatie'],
  recovery: ['herstel-huidverzorging', 'herstel'],
  'herstel-huidverzorging': ['recovery', 'herstel'],
  herstel: ['recovery', 'herstel-huidverzorging'],
  'anti-aging': ['longevity-vitaliteit'],
  'longevity-vitaliteit': ['anti-aging'],
  'supplies-extras': ['benodigdheden-extras'],
  'benodigdheden-extras': ['supplies-extras'],
};

function categorySlugVariants(slug: string): string[] {
  const s = slug.trim().toLowerCase();
  if (!s) return [];
  return Array.from(new Set([s, ...(CATEGORY_SLUG_ALIASES[s] || [])]));
}

/** Resolve category by primary slug, alias, or seoData.slugEn/slugDe. */
async function findCategoryIdByAnySlug(slug: string): Promise<string | null> {
  const variants = categorySlugVariants(slug);
  const direct = await prisma.category.findFirst({
    where: { slug: { in: variants } },
    select: { id: true },
  });
  if (direct) return direct.id;
  const needle = slug.trim().toLowerCase();
  const all = await prisma.category.findMany({ select: { id: true, slug: true, seoData: true } });
  const hit = all.find((c) => {
    const seo = parseSeoMeta(c.seoData);
    return seo.slugEn?.toLowerCase() === needle || seo.slugDe?.toLowerCase() === needle;
  });
  return hit?.id ?? null;
}

async function gtxTranslate(text: string, target: string, source = 'en'): Promise<string> {
  if (!text?.trim() || source === target) return text;
  const { data } = await axios.get('https://translate.googleapis.com/translate_a/single', {
    params: { client: 'gtx', sl: source, tl: target, dt: 't', q: text },
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000,
  });
  return (data[0] as string[][]).map((c) => c[0] ?? '').join('');
}

function parseProductTranslations(raw: string): Record<string, ProductLangOverride> {
  try { return JSON.parse(raw ?? '{}'); } catch { return {}; }
}

// Private-use-area marker chars — vanishingly unlikely to appear in real product prose,
// so the frontend can safely split on them to render real <a> tags for these spans.
const LINK_MARK_START = '';
const LINK_MARK_MID = '';
const LINK_MARK_END = '';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wraps the first mention of each candidate term found in `text` with link markers.
 * Longest terms are matched first (so "GHK-Cu 100mg" wins over bare "GHK-Cu"), matches
 * never overlap, and whitespace inside a term is flexible so "100 mg" (DB weight format)
 * still matches "100mg" as written in hand-authored prose.
 */
function linkifyDescription(text: string, candidates: Array<{ term: string; href: string }>): string {
  if (!text) return text;

  const taken: Array<{ start: number; end: number }> = [];
  const matches: Array<{ start: number; end: number; label: string; href: string }> = [];

  // Pass 1: hand-authored markdown links [label](url) already in the text — an explicit
  // author choice, so these always win over auto-detected catalog mentions below. Without
  // this, admin-written markdown just renders as literal bracket/paren text on the page.
  const mdRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let md: RegExpExecArray | null;
  while ((md = mdRe.exec(text))) {
    const start = md.index;
    const end = start + md[0].length;
    taken.push({ start, end });
    matches.push({ start, end, label: md[1], href: md[2] });
  }

  // Pass 2: real mentions of catalog terms (sibling products, category name) in plain
  // prose — skipped wherever an explicit markdown link (pass 1) already covers that span.
  const sorted = [...candidates]
    .filter((c) => c.term && c.term.trim().length > 2)
    .sort((a, b) => b.term.length - a.term.length);

  for (const { term, href } of sorted) {
    const pattern = escapeRegExp(term.trim()).replace(/\s+/g, '\\s*');
    let re: RegExp;
    try {
      re = new RegExp(pattern, 'i');
    } catch {
      continue;
    }
    const m = re.exec(text);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (taken.some((s) => start < s.end && end > s.start)) continue;
    taken.push({ start, end });
    matches.push({ start, end, label: m[0], href });
  }

  if (!matches.length) return text;
  matches.sort((a, b) => a.start - b.start);

  let out = '';
  let cursor = 0;
  for (const m of matches) {
    out += text.slice(cursor, m.start);
    out += `${LINK_MARK_START}${m.label}${LINK_MARK_MID}${m.href}${LINK_MARK_END}`;
    cursor = m.end;
  }
  out += text.slice(cursor);
  return out;
}

/**
 * Returns translated product fields for the requested lang.
 * Uses cached DB value if available; otherwise auto-translates via free Google
 * Translate, writes back to DB (non-blocking), and returns the new translation.
 */
async function resolveProductLang(
  product: { id: string; name: string; shortDesc: string; description: string; benefits: string; translations: string },
  lang: ProductLang,
): Promise<{ name: string; shortDesc: string; description: string; benefits: string }> {
  const stored = parseProductTranslations(product.translations);

  if (stored[lang]?.name) {
    return {
      name: stored[lang].name!,
      shortDesc: stored[lang].shortDesc ?? product.shortDesc,
      description: stored[lang].description ?? product.description,
      benefits: stored[lang].benefits ?? product.benefits,
    };
  }

  // Parse benefits array for translation, then re-stringify after
  let benefitsArr: string[] = [];
  try { benefitsArr = JSON.parse(product.benefits); } catch { /* keep empty */ }

  try {
    const [name, shortDesc, description, ...translatedBenefits] = await Promise.all([
      gtxTranslate(product.name, lang),
      gtxTranslate(product.shortDesc, lang),
      gtxTranslate(product.description, lang),
      ...benefitsArr.map((b) => gtxTranslate(b, lang)),
    ]);

    const benefits = JSON.stringify(translatedBenefits);
    const override: ProductLangOverride = { name, shortDesc, description, benefits };
    const updated = { ...stored, [lang]: override };

    // Cache back to DB — non-blocking
    prisma.product.update({
      where: { id: product.id },
      data: { translations: JSON.stringify(updated) },
    }).catch(() => {});

    return { name, shortDesc, description, benefits };
  } catch (err) {
    console.error(`[translate] failed to auto-translate product ${product.id} to ${lang}:`, err);
    return {
      name: product.name,
      shortDesc: product.shortDesc,
      description: product.description,
      benefits: product.benefits,
    };
  }
}

// ─── Category translation helpers ─────────────────────────────────────────

interface CategoryLangOverride {
  name?: string;
  description?: string;
}

function parseCategoryTranslations(raw: string): Record<string, CategoryLangOverride> {
  try { return JSON.parse(raw ?? '{}'); } catch { return {}; }
}

async function resolveCategoryLang(
  category: { id: string; name: string; description: string | null; translations: string },
  lang: string,
): Promise<{ name: string; description: string | null }> {
  const stored = parseCategoryTranslations(category.translations);

  if (stored[lang]?.name) {
    return {
      name: stored[lang].name!,
      description: stored[lang].description ?? category.description,
    };
  }

  try {
    const [name, description] = await Promise.all([
      gtxTranslate(category.name, lang),
      category.description ? gtxTranslate(category.description, lang) : Promise.resolve(null),
    ]);

    const override: CategoryLangOverride = { name, description: description ?? undefined };
    const updated = { ...stored, [lang]: override };

    // Cache back to DB - non-blocking
    prisma.category.update({
      where: { id: category.id },
      data: { translations: JSON.stringify(updated) },
    }).catch(() => {});

    return { name, description };
  } catch (err) {
    console.error(`[translate] failed to auto-translate category ${category.id} to ${lang}:`, err);
    return {
      name: category.name,
      description: category.description,
    };
  }
}

async function applyCategoryLang<T extends Record<string, any>>(
  category: T & { id: string; name: string; description: string | null; translations: string },
  lang?: string,
): Promise<T & { name: string; description: string | null }> {
  // Unlike products, category base columns are English, not Dutch — so "no ?lang="
  // (the default gopeptides.nl storefront) must still resolve to 'nl', or Dutch visitors
  // see English category names in breadcrumbs, shop grids, and internal-link text.
  const resolved = await resolveCategoryLang(category, lang || 'nl');
  return { ...category, ...resolved };
}

/** Apply language override to a serialised product object */
async function applyProductLang<T extends Record<string, any>>(
  product: T & { id: string; name: string; shortDesc: string; description: string; benefits: string; translations: string },
  lang?: string,
): Promise<T> {
  // Product base columns already are Dutch, so leave them untouched when lang is unset —
  // only the embedded category (English base columns) needs resolving in that case.
  let updated: any = product;
  if (lang) {
    const t = await resolveProductLang(product, lang as ProductLang);
    updated = { ...product, ...t };
  }
  if (product.category && typeof product.category === 'object' && 'translations' in product.category) {
    updated.category = await applyCategoryLang(product.category as any, lang);
  }
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.ProductInclude;

function sortClause(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }];
    case 'price_desc':
      return [{ price: 'desc' }];
    case 'newest':
      return [{ createdAt: 'desc' }];
    case 'rating':
      return [{ reviews: { _count: 'desc' } }];
    case 'featured':
    default:
      return [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req, { page: 1, limit: 12, maxLimit: 60 });
    const { search, category, sort, minPrice, maxPrice, inStock, purity, lang: langParam } = req.query as Record<string, string | undefined>;
    const lang = langParam || hostLangOverride(req.get('host'));

    const cacheKey = cache.keys.productList(
      JSON.stringify({ ...pagination, search, category, sort, minPrice, maxPrice, inStock, purity, lang }),
    );
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const where: Prisma.ProductWhereInput = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDesc: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ];
    }
    if (category) {
      // Accept live NL slugs, English aliases, and seoData.slugEn/slugDe
      const catId = await findCategoryIdByAnySlug(category);
      if (catId) where.categoryId = catId;
      else where.category = { slug: category }; // no match → empty list
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Prisma.FloatFilter).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Prisma.FloatFilter).lte = parseFloat(maxPrice);
    }
    if (inStock === 'true') where.stock = { gt: 0 };
    if (purity) where.purity = { contains: purity };

    const [items, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: sortClause(sort),
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Always call applyProductLang — even with no ?lang= it still resolves each item's
    // embedded category to Dutch (category base columns are English, unlike products).
    const translatedItems = await Promise.all(items.map((p) => applyProductLang(p as unknown as Record<string, unknown> & { id: string; name: string; shortDesc: string; description: string; benefits: string; translations: string }, lang)));

    const payload = {
      success: true,
      data: translatedItems,
      meta: buildMeta(pagination, totalCount),
    };

    await cache.set(cacheKey, payload, 300);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function featured(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Falls back to the request host's default (.de→de, .eu→en, else nl) — otherwise a
    // direct visit with no explicit ?lang= always serves Dutch, even on gopeptides.eu/.de.
    const lang = (req.query.lang as string | undefined) || hostLangOverride(req.get('host'));
    const key = cache.keys.productFeatured() + (lang ? `:${lang}` : '');
    const cached = await cache.get(key);
    if (cached) {
      ok(res, cached);
      return;
    }
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: PRODUCT_INCLUDE,
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(products.map((p) => applyProductLang(p as unknown as Record<string, unknown> & { id: string; name: string; shortDesc: string; description: string; benefits: string; translations: string }, lang)));

    await cache.set(key, result, 300);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

/** Batch codes look like GP-260528-001 → analysis/fill date 28-05-2026. */
function dateFromBatchCode(batch?: string | null): string | null {
  const m = String(batch || '').match(/GP-(\d{2})(\d{2})(\d{2})(?:-|$)/i);
  if (!m) return null;
  const [, yy, mm, dd] = m;
  return `${dd}-${mm}-20${yy}`;
}

function parseLabSeo(raw: string | null | undefined): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Client request: hide NAD+ from /labresults (reports removed). */
function isNadProduct(p: { name: string; slug: string; sku: string }): boolean {
  const hay = `${p.name} ${p.slug} ${p.sku}`.toLowerCase();
  return /\bnad\+?\b/.test(hay) || hay.includes('nad-') || hay.includes('nad_') || hay.includes('nad500') || hay.includes('nad1000');
}

function parseLabReportImages(seo: Record<string, unknown>): string[] {
  if (!Array.isArray(seo.labReportImages)) return [];
  return (seo.labReportImages as unknown[])
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());
}

/** Generic Janoshik /verify homepage is not a report PDF — linking it causes broken UX (and their SSL 525). */
function usefulExternalLabUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  // Same-origin scan paths (e.g. /photos/reports/foo.png)
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = (u.pathname || '/').replace(/\/+$/, '') || '/';
    if (host === 'janoshik.com' || host.endsWith('.janoshik.com')) {
      if (path === '/' || path === '/verify' || path === '/verification') return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

/** Public lab-results cards: product purity + label batch/date + optional Janoshik URLs from seoData. */
export async function labResults(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }], take: 1 },
        labelVariants: {
          orderBy: { dosage: 'asc' },
          select: {
            batchNumber: true,
            shelfLifeDate: true,
            manualQrUrl: true,
            csvQrUrl: true,
            dosage: true,
          },
        },
      },
    });

    const cards = products
      .filter((p) => !isNadProduct(p))
      .map((p) => {
      const seo = parseLabSeo(p.seoData);
      const variant = p.labelVariants[0];
      const reportImages = parseLabReportImages(seo);
      const batch =
        (typeof seo.labBatch === 'string' && seo.labBatch.trim()) ||
        variant?.batchNumber ||
        p.sku;
      const testDate =
        (typeof seo.labTestDate === 'string' && seo.labTestDate.trim()) ||
        dateFromBatchCode(batch) ||
        null;
      const reportUrl =
        usefulExternalLabUrl(
          (typeof seo.labReportUrl === 'string' && seo.labReportUrl.trim()) ||
            variant?.manualQrUrl?.trim() ||
            variant?.csvQrUrl?.trim() ||
            null,
        ) ||
        reportImages[0] ||
        null;
      const customTests = Array.isArray(seo.labTests)
        ? (seo.labTests as Array<Record<string, unknown>>)
            .map((row) => ({
              label: typeof row.label === 'string' ? row.label : '',
              value: typeof row.value === 'string' ? row.value : '',
              url: usefulExternalLabUrl(typeof row.url === 'string' ? row.url : null) || undefined,
            }))
            .filter((row) => row.label && row.value)
        : [];

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        purity: (typeof seo.labPurity === 'string' && seo.labPurity.trim()) || p.purity,
        weight: (typeof seo.labContent === 'string' && seo.labContent.trim()) || p.weight,
        images: p.images,
        batch,
        testDate,
        reportUrl,
        reportImages,
        dosage: variant?.dosage || p.weight,
        tests: customTests,
        verified: Boolean(p.purity && String(p.purity).trim()),
      };
    })
      // Lab results page = published reports only (no "Results pending" noise).
      .filter((card) => card.tests.length > 0 || Boolean(card.reportUrl) || card.reportImages.length > 0);

    ok(res, cards);
  } catch (err) {
    next(err);
  }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    // Falls back to the request host's default (.de→de, .eu→en, else nl) — otherwise a
    // direct visit with no explicit ?lang= always serves Dutch, even on gopeptides.eu/.de.
    const lang = (req.query.lang as string | undefined) || hostLangOverride(req.get('host'));
    const key = cache.keys.product(slug) + (lang ? `:${lang}` : '');
    const cached = await cache.get(key);
    if (cached) {
      ok(res, cached);
      return;
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        ...PRODUCT_INCLUDE,
        reviews: {
          where: { approved: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            verified: true,
            user: { select: { firstName: true, lastName: true } },
            guestName: true,
          },
        },
      },
    });
    if (!product || !product.isActive) throw ApiError.notFound('Product not found');

    const agg = await prisma.review.aggregate({
      where: { productId: product.id, approved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const base = {
      ...product,
      stats: {
        averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        reviewCount: agg._count.rating,
      },
    };

    const langed = await applyProductLang(base as unknown as Record<string, unknown> & { id: string; name: string; shortDesc: string; description: string; benefits: string; translations: string }, lang);

    // Internal linking inside the visible description: find real mentions of the category
    // name and sibling products (e.g. "GHK-Cu 100mg", "Skin & Regeneration Research") in the
    // prose text and wrap them with marker chars the frontend turns into real <a> tags —
    // done server-side (regex over real catalog data) instead of guessing on the client.
    let relatedLinks: Array<{ label: string; href: string }> = [];
    let descriptionLinked: string | undefined;
    try {
      const { resolveSiteUrl } = await import('../services/seoService');
      const siteBase = resolveSiteUrl(req.get('host'));
      const candidates: Array<{ term: string; href: string }> = [];
      const langedCategory = (langed as unknown as { category?: { name?: string; slug?: string } }).category;
      if (langedCategory?.name && langedCategory?.slug) {
        const href = `${siteBase}/shop/${langedCategory.slug}`;
        candidates.push({ term: langedCategory.name, href });
        relatedLinks.push({ label: langedCategory.name, href });
      }
      if (product.categoryId) {
        const siblings = await prisma.product.findMany({
          where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
          select: { name: true, weight: true, slug: true, translations: true },
          take: 12,
        });
        for (const s of siblings) {
          const t = lang ? parseProductTranslations(s.translations)[lang as ProductLang] : undefined;
          const name = t?.name || s.name;
          const href = `${siteBase}/${s.slug}`;
          // Bare product name alone is too broad — it can hijack an unrelated first
          // mention of the same compound (e.g. this product's own intro sentence) and
          // link it to a sibling instead. Only the weight-qualified form is precise
          // enough to trust ("GHK-Cu 100mg" only ever means that specific product).
          if (s.weight) candidates.push({ term: `${name} ${s.weight}`, href });
          relatedLinks.push({ label: s.weight ? `${name} ${s.weight}` : name, href });
        }
      }
      const descText = (langed as unknown as { description?: string }).description;
      if (descText) descriptionLinked = linkifyDescription(descText, candidates);
    } catch {
      // Non-critical — description just renders without inline links if this fails.
    }
    const payload = { ...langed, relatedLinks, descriptionLinked };

    await cache.set(key, payload, 600);
    ok(res, payload);
  } catch (err) {
    next(err);
  }
}

export async function related(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    // Falls back to the request host's default (.de→de, .eu→en, else nl) — otherwise a
    // direct visit with no explicit ?lang= always serves Dutch, even on gopeptides.eu/.de.
    const lang = (req.query.lang as string | undefined) || hostLangOverride(req.get('host'));
    const key = cache.keys.productRelated(id) + (lang ? `:${lang}` : '');
    const cached = await cache.get(key);
    if (cached) {
      ok(res, cached);
      return;
    }

    const source = await prisma.product.findUnique({ where: { id } });
    if (!source) throw ApiError.notFound('Product not found');

    const items = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: id },
        categoryId: source.categoryId,
      },
      include: PRODUCT_INCLUDE,
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(items.map((p) => applyProductLang(p as unknown as Record<string, unknown> & { id: string; name: string; shortDesc: string; description: string; benefits: string; translations: string }, lang)));

    await cache.set(key, result, 600);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function byCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    // Falls back to the request host's default (.de→de, .eu→en, else nl) — otherwise a
    // direct visit with no explicit ?lang= always serves Dutch, even on gopeptides.eu/.de.
    const lang = (req.query.lang as string | undefined) || hostLangOverride(req.get('host'));
    const pagination = parsePagination(req);
    const catId = await findCategoryIdByAnySlug(slug);
    const categoryRaw = catId
      ? await prisma.category.findUnique({ where: { id: catId } })
      : null;
    if (!categoryRaw) throw ApiError.notFound('Category not found');

    // Category base columns are English — always resolve (defaults to 'nl' inside
    // applyCategoryLang) so the Dutch storefront doesn't show an English category name.
    const category = await applyCategoryLang(categoryRaw, lang);

    const where: Prisma.ProductWhereInput = { isActive: true, categoryId: category.id };
    const [itemsRaw, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const items = await Promise.all(itemsRaw.map((p) => applyProductLang(p as any, lang)));

    res.json({
      success: true,
      data: { category, products: items },
      meta: buildMeta(pagination, totalCount),
    });
  } catch (err) {
    next(err);
  }
}

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Falls back to the request host's default (.de→de, .eu→en, else nl) — otherwise a
    // direct visit with no explicit ?lang= always serves Dutch, even on gopeptides.eu/.de.
    const lang = (req.query.lang as string | undefined) || hostLangOverride(req.get('host'));
    const key = cache.keys.categories() + (lang ? `:${lang}` : '');
    const cached = await cache.get(key);
    if (cached) {
      ok(res, cached);
      return;
    }
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    const result = await Promise.all(categories.map((c) => applyCategoryLang(c, lang)));
    await cache.set(key, result, 1800);
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const b = req.body as Record<string, unknown>;
    assertPublicProductSlug(b.slug);
    await assertProductSlugAvailable(String(b.slug).trim().toLowerCase());
    const data = {
      name: b.name as string,
      slug: b.slug as string,
      description: b.description as string,
      shortDesc: b.shortDesc as string,
      price: Number(b.price),
      comparePrice: b.comparePrice !== undefined && b.comparePrice !== null ? Number(b.comparePrice) : null,
      stock: Number(b.stock),
      sku: b.sku as string,
      purity: b.purity as string,
      weight: b.weight as string,
      casNumber: b.casNumber as string,
      categoryId: b.categoryId as string,
      badge: (b.badge as string) ?? null,
      sequence: (b.sequence as string) ?? null,
      storage: (b.storage as string) ?? null,
      isActive: b.isActive !== undefined ? Boolean(b.isActive) : true,
      isFeatured: b.isFeatured !== undefined ? Boolean(b.isFeatured) : false,
      benefits: Array.isArray(b.benefits) ? JSON.stringify(b.benefits) : '[]',
      translations: typeof b.translations === 'object' ? JSON.stringify(b.translations) : (b.translations as string || '{}'),
      seoData: typeof b.seoData === 'object' ? JSON.stringify(b.seoData) : (b.seoData as string || '{}'),
    };
    const product = await prisma.product.create({ data: data as any, include: PRODUCT_INCLUDE });

    const dosage = deriveDosageFromProduct(product.weight, product.name);
    const dims = getLabelDimensions(product.name);
    const existingVariant = await prisma.labelVariant.findFirst({
      where: { productId: product.id, dosage },
    });
    if (!existingVariant) {
      await prisma.labelVariant.create({
        data: {
          productId: product.id,
          dosage,
          batchNumber: makePlaceholderBatch(),
          languageDefault: 'nl',
          labelWidthMm: dims.width,
          labelHeightMm: dims.height,
          qrMode: 'auto',
        },
      });
    }

    await cache.invalidateProducts();
    
    await logAudit({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      metadata: { name: product.name, price: product.price, sku: product.sku },
      ipAddress: req.ip,
    });

    created(res, product, 'Product created');
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const b = req.body as Record<string, unknown>;
    if (b.slug !== undefined) {
      assertPublicProductSlug(b.slug);
      await assertProductSlugAvailable(String(b.slug).trim().toLowerCase(), id);
    }

    // Whitelist only known Product fields — prevents PrismaClientValidationError
    // from unknown/extra fields being passed directly from req.body.
    const data: Record<string, unknown> = {};
    if (b.name        !== undefined) data.name        = b.name;
    if (b.slug        !== undefined) data.slug        = b.slug;
    if (b.description !== undefined) data.description = b.description;
    if (b.shortDesc   !== undefined) data.shortDesc   = b.shortDesc;
    if (b.price       !== undefined) data.price       = Number(b.price);
    if (b.comparePrice !== undefined) data.comparePrice = b.comparePrice === null ? null : Number(b.comparePrice);
    if (b.stock       !== undefined) data.stock       = Number(b.stock);
    if (b.sku         !== undefined) data.sku         = b.sku;
    if (b.purity      !== undefined) data.purity      = b.purity;
    if (b.weight      !== undefined) data.weight      = b.weight;
    if (b.casNumber   !== undefined) data.casNumber   = b.casNumber;
    if (b.categoryId  !== undefined) data.categoryId  = b.categoryId;
    if (b.badge       !== undefined) data.badge       = b.badge ?? null;
    if (b.sequence    !== undefined) data.sequence    = b.sequence ?? null;
    if (b.storage     !== undefined) data.storage     = b.storage ?? null;
    if (b.isActive    !== undefined) data.isActive    = Boolean(b.isActive);
    if (b.isFeatured  !== undefined) data.isFeatured  = Boolean(b.isFeatured);
    if (b.benefits    !== undefined) {
      data.benefits = Array.isArray(b.benefits) ? JSON.stringify(b.benefits) : b.benefits;
    }
    if (b.seoData !== undefined) {
      const patch = typeof b.seoData === 'object' ? (b.seoData as SeoMeta) : parseSeoMeta(b.seoData as string);
      const current = await prisma.product.findUnique({ where: { id }, select: { seoData: true } });
      data.seoData = JSON.stringify(mergeSeoMeta(parseSeoMeta(current?.seoData), patch));
    }
    // Prefer explicit NL/DE translations from admin. Only wipe cached auto-translations
    // when English fields change and the client did not send a translations payload.
    if (b.translations !== undefined) {
      data.translations = typeof b.translations === 'object' ? JSON.stringify(b.translations) : b.translations;
    } else if (b.name !== undefined || b.description !== undefined || b.shortDesc !== undefined || b.benefits !== undefined) {
      data.translations = '{}';
    }

    const product = await prisma.product.update({ where: { id }, data: data as any, include: PRODUCT_INCLUDE });
    await cache.invalidateProducts();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'Product',
      entityId: product.id,
      metadata: { name: product.name, price: product.price, sku: product.sku },
      ipAddress: req.ip,
    });

    ok(res, product, 'Product updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const variants = await prisma.labelVariant.findMany({ where: { productId: id } });
    for (const variant of variants) {
      await deleteLabelVariantAssets(variant.id);
      await prisma.labelPrintLog.deleteMany({ where: { labelVariantId: variant.id } });
    }
    await prisma.labelVariant.deleteMany({ where: { productId: id } });

    const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
    await cache.invalidateProducts();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'Product',
      entityId: id,
      metadata: { name: product.name },
      ipAddress: req.ip,
    });

    noContent(res);
  } catch (err) {
    next(err);
  }
}

export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    if (!files.length) throw ApiError.badRequest('No files uploaded');

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound('Product not found');

    const existingCount = await prisma.image.count({ where: { productId: id } });
    if (existingCount + files.length > 8) {
      throw ApiError.badRequest(`Maximum of 8 images allowed. Product already has ${existingCount} images.`);
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const { env } = await import('../config/env');
    // Nginx serves /products/ from frontend dist; /uploads/*.ext is blocked by static try_files.
    const publicProductsDir = path.resolve(env.frontendDist, 'products');
    await fs.mkdir(publicProductsDir, { recursive: true });

    const derivatives = await Promise.all(files.map(async (file) => {
      const stem = path.parse(file.filename).name;
      const webpName = `${stem}.webp`;
      const avifName = `${stem}.avif`;
      const webpPath = path.join(path.dirname(file.path), webpName);
      const avifPath = path.join(path.dirname(file.path), avifName);
      await Promise.all([
        sharp(file.path).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(webpPath),
        sharp(file.path).rotate().resize({ width: 1600, withoutEnlargement: true }).avif({ quality: 55 }).toFile(avifPath),
      ]);
      // Mirror into frontend /products so storefront loads without nginx /uploads fix.
      await Promise.all([
        fs.copyFile(webpPath, path.join(publicProductsDir, webpName)).catch(() => undefined),
        fs.copyFile(file.path, path.join(publicProductsDir, file.filename)).catch(() => undefined),
      ]);
      const metadata = await sharp(file.path).metadata();
      return {
        publicUrl: `/products/${webpName}`,
        webp: `/products/${webpName}`,
        avif: `/uploads/${avifName}`,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
      };
    }));

    // New upload becomes the storefront primary (old primaries demoted).
    const createdImages = await prisma.$transaction(async (tx) => {
      if (existingCount > 0) {
        await tx.image.updateMany({ where: { productId: id }, data: { isPrimary: false } });
      }
      return Promise.all(
        files.map((f, idx) =>
          tx.image.create({
            data: {
              productId: id,
              url: derivatives[idx].publicUrl,
              alt: product.name,
              variants: JSON.stringify(derivatives[idx]),
              position: existingCount + idx,
              isPrimary: idx === 0,
            },
          }),
        ),
      );
    });

    await cache.invalidateProducts();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPLOAD_IMAGES',
      entity: 'Product',
      entityId: id,
      metadata: { name: product.name, count: files.length },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: createdImages });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, imageId } = req.params;
    const img = await prisma.image.findFirst({ where: { id: imageId, productId } });
    if (!img) throw ApiError.notFound('Image not found');

    await prisma.image.delete({ where: { id: imageId } });

    if (img.isPrimary) {
      const first = await prisma.image.findFirst({ where: { productId }, orderBy: { position: 'asc' } });
      if (first) {
        await prisma.image.update({ where: { id: first.id }, data: { isPrimary: true } });
      }
    }

    await cache.invalidateProducts();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'DELETE_IMAGE',
      entity: 'Product',
      entityId: productId,
      metadata: { imageId, url: img.url },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function reorderProductImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const { imageIds } = req.body as { imageIds: string[] };
    if (!Array.isArray(imageIds)) throw ApiError.badRequest('imageIds must be an array');

    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.image.update({
          where: { id, productId },
          data: {
            position: index,
            isPrimary: index === 0,
          },
        }),
      ),
    );

    await cache.invalidateProducts();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REORDER_IMAGES',
      entity: 'Product',
      entityId: productId,
      metadata: { count: imageIds.length },
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Category Admin CRUD ──────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, translations, seoData } = req.body as { name: string; description?: string; translations?: string | object; seoData?: string | object };
    if (!name?.trim()) throw ApiError.badRequest('Category name is required');
    const slug = slugify(name);
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() ?? null,
        translations: typeof translations === 'object' ? JSON.stringify(translations) : (translations as string || '{}'),
        seoData: typeof seoData === 'object' ? JSON.stringify(seoData) : (seoData || '{}'),
      },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    await cache.invalidateProducts();
    await logAudit({
      userId: (req as any).user?.id,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      metadata: { name: category.name, slug: category.slug },
      ipAddress: req.ip,
    });
    created(res, category, 'Category created');
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, slug, translations, seoData } = req.body as { name?: string; description?: string; slug?: string; translations?: string | object; seoData?: string | object };
    const data: Record<string, unknown> = {};
    if (name !== undefined) { data.name = name.trim(); data.slug = slug?.trim() || slugify(name); }
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (slug !== undefined && !name) data.slug = slug.trim();
    if (translations !== undefined) {
      data.translations = typeof translations === 'object' ? JSON.stringify(translations) : (translations as string);
    }
    if (seoData !== undefined) {
      const patch = typeof seoData === 'object' ? (seoData as SeoMeta) : parseSeoMeta(seoData as string);
      const current = await prisma.category.findUnique({ where: { id }, select: { seoData: true } });
      data.seoData = JSON.stringify(mergeSeoMeta(parseSeoMeta(current?.seoData), patch));
    }
    const category = await prisma.category.update({
      where: { id },
      data: data as any,
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    await cache.invalidateProducts();
    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'Category',
      entityId: id,
      metadata: { name: category.name },
      ipAddress: req.ip,
    });
    ok(res, category, 'Category updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const count = await prisma.product.count({ where: { categoryId: id, isActive: true } });
    if (count > 0) {
      throw ApiError.badRequest(`Cannot delete: ${count} active product(s) are assigned to this category. Reassign them first.`);
    }
    await prisma.category.delete({ where: { id } });
    await cache.invalidateProducts();
    await logAudit({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'Category',
      entityId: id,
      metadata: {},
      ipAddress: req.ip,
    });
    noContent(res);
  } catch (err) {
    next(err);
  }
}
