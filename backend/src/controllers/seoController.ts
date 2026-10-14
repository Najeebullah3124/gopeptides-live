import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ApiError, created, noContent, ok } from '../utils/apiResponse';
import { buildSchemaPreview, collectContentKeywords } from '../services/seoSchemaService';
import { analyzeSeoContent, buildGoogleAuthUrl, exchangeGoogleCode, getIndexNowKey, getSearchConsoleStatus, resolveIndexNowKey, submitIndexNow } from '../services/seoIntegrationsService';
import { getMerchantStatus, listMerchantFeedProducts, registerMerchantDeveloper, saveMerchantSettings, syncProductsToMerchant } from '../services/merchantService';
import { generateRobots, generateLlmsTxt, generateSitemapIndex, generatePostSitemap, generatePageSitemap, generateProductSitemap, generateProductCatSitemap, mergeSeoMeta, parseSeoMeta, resolveSiteUrl, seoDashboard, siteUrl, allSitemapIndexUrls } from '../services/seoService';
import { renderSeoHtml } from '../services/seoHtmlService';
import { blogSeoForLang } from '../utils/blogSeo';
import { extractLighthouseFindings } from '../services/lighthouseReport';
import { invalidateRedirectCache } from '../middleware/seoRedirect';
import {
  auditRenderedPage,
  inspectRenderedPage,
  estimateReadingTime,
  getSeoPackageRegistry,
  getTechnicalSignals,
  getToolkitByCategory,
  makeSlug,
  makeProductSlug,
  analyzeRobotsTxt,
  type SeoPackageCategory,
} from '../services/seoToolkitService';
import { buildPageSeo, SEO_PAGE_REGISTRY, savePageSeoOverride, type SeoPageKey, type SeoPageLang } from '../services/seoMetaService';
import { pathForLang, slugForLang, type StoreLang } from '../utils/seoPaths';

function sameSite(value: string): boolean {
  try { return new URL(value).origin === new URL(siteUrl()).origin; } catch { return false; }
}

function normalizeKeywordKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
}

function keywordMapPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'SEO_Keyword_Map_GoPeptides.md'),
    path.resolve(process.cwd(), '..', 'SEO_Keyword_Map_GoPeptides.md'),
  ];
  return candidates.find((filePath) => fs.existsSync(filePath)) || null;
}

function loadKeywordRows(): Array<{ page: string; primary: string; secondary: string[]; longTail: string[]; titleDirection: string }> {
  const filePath = keywordMapPath();
  if (!filePath) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('Page | Primary keyword'))
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 8)
    .map((parts) => ({
      page: parts[1],
      primary: parts[2],
      secondary: parts[3].split(',').map((item) => item.trim()).filter(Boolean),
      longTail: parts[4].split(',').map((item) => item.trim()).filter(Boolean),
      titleDirection: parts[7],
    }));
}

function matchKeywordRow(label: string, slug: string, pageType: string): { primary: string; secondary: string[]; longTail: string[]; titleDirection: string } | null {
  const haystack = normalizeKeywordKey(`${label} ${slug} ${pageType}`);
  const rows = loadKeywordRows();
  const row = rows.find((entry) => {
    const pageKey = normalizeKeywordKey(entry.page);
    return haystack.includes(pageKey) || pageKey.includes(normalizeKeywordKey(label)) || pageKey.includes(normalizeKeywordKey(slug));
  });
  return row || null;
}

async function resolveContentTarget(
  type: string,
  id: string,
  lang: StoreLang = 'en',
): Promise<{ path: string; label: string; slug: string; pageType: string }> {
  if (type === 'page') {
    const page = SEO_PAGE_REGISTRY.find((entry) => entry.key === id);
    if (!page) throw ApiError.badRequest('Unsupported content page');
    const localized =
      page.key === 'home'
        ? '/'
        : pathForLang(
            page.key as 'shop' | 'blog' | 'faq' | 'contact' | 'labresults' | 'reviews' | 'terms' | 'shipping' | 'about' | 'privacy',
            lang,
          );
    return { path: localized, label: page.label, slug: localized.replace(/^\//, '') || 'home', pageType: 'page' };
  }
  if (type === 'product') {
    const product = await prisma.product.findUnique({ where: { id }, select: { name: true, slug: true } });
    if (!product) throw ApiError.badRequest('Product not found');
    return { path: `/${product.slug}`, label: product.name, slug: product.slug, pageType: 'product' };
  }
  if (type === 'category') {
    const category = await prisma.category.findUnique({ where: { id }, select: { name: true, slug: true, seoData: true } });
    if (!category) throw ApiError.badRequest('Category not found');
    const s = slugForLang(category.slug, parseSeoMeta(category.seoData), lang);
    return { path: pathForLang('shop', lang, s), label: category.name, slug: s, pageType: 'category' };
  }
  if (type === 'post') {
    const post = await prisma.blogPost.findUnique({ where: { id }, select: { title: true, slug: true, seoData: true } });
    if (!post) throw ApiError.badRequest('Post not found');
    const s = slugForLang(post.slug, parseSeoMeta(post.seoData), lang);
    return { path: pathForLang('blog', lang, s), label: post.title, slug: s, pageType: 'post' };
  }
  throw ApiError.badRequest('Unsupported content type');
}

function mergeEffectiveSeo(saved: ReturnType<typeof parseSeoMeta>, built: Awaited<ReturnType<typeof buildPageSeo>>) {
  return {
    title: saved.title || built.title,
    description: saved.description || built.description,
    canonicalUrl: saved.canonicalUrl || built.canonical,
    robots: saved.robots || built.robots,
    focusKeywords: saved.focusKeywords?.length ? saved.focusKeywords : built.keywords || [],
    socialImage: saved.socialImage || built.ogImage || '',
    h1: saved.h1 || built.h1 || '',
    h2: saved.h2?.length ? saved.h2 : built.editable?.h2 || [],
    bodyContent: saved.bodyContent || built.editable?.bodyContent || '',
    internalLinks: saved.internalLinks?.length ? saved.internalLinks : built.editable?.internalLinks || [],
    externalLinks: saved.externalLinks?.length ? saved.externalLinks : built.editable?.externalLinks || [],
  };
}

type SavedSeo = ReturnType<typeof parseSeoMeta>;

// seoData keeps nl in title/description/h1/h2/bodyContent and en/de in the *En/*De keys.
const LANG_FIELDS = ['title', 'description', 'h1', 'h2', 'bodyContent'];
const LANG_SUFFIX: Record<SeoPageLang, string> = { nl: '', en: 'En', de: 'De' };
const SUFFIXED_KEYS = new Set(LANG_FIELDS.flatMap((key) => [`${key}En`, `${key}De`]));

/** One language's view of seoData, with that language's fields under the plain keys. */
function seoForLang(saved: SavedSeo, lang: SeoPageLang): SavedSeo {
  const suffix = LANG_SUFFIX[lang];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(saved)) {
    if (SUFFIXED_KEYS.has(key) || (suffix && LANG_FIELDS.includes(key))) continue;
    out[key] = value;
  }
  if (suffix) {
    for (const key of LANG_FIELDS) {
      const value = (saved as Record<string, unknown>)[`${key}${suffix}`];
      if (value !== undefined) out[key] = value;
    }
  }
  return out as SavedSeo;
}

/** Inverse of seoForLang: move a one-language admin patch onto that language's keys. */
function seoPatchForLang(patch: Record<string, unknown>, lang: SeoPageLang): SavedSeo {
  const suffix = LANG_SUFFIX[lang];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    out[suffix && LANG_FIELDS.includes(key) ? `${key}${suffix}` : key] = value;
  }
  return out as SavedSeo;
}

async function loadSavedSeo(type: string, id: string, lang: SeoPageLang): Promise<ReturnType<typeof parseSeoMeta>> {
  if (type === 'page') {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
    let overrides: Record<string, Partial<Record<SeoPageLang, ReturnType<typeof parseSeoMeta>>>> = {};
    try { overrides = JSON.parse(row?.value || '{}'); } catch { overrides = {}; }
    return overrides[id]?.[lang] || {};
  }
  if (type === 'product') {
    const row = await prisma.product.findUnique({ where: { id }, select: { seoData: true } });
    return seoForLang(parseSeoMeta(row?.seoData), lang);
  }
  if (type === 'category') {
    const row = await prisma.category.findUnique({ where: { id }, select: { seoData: true } });
    return seoForLang(parseSeoMeta(row?.seoData), lang);
  }
  if (type === 'post') {
    const row = await prisma.blogPost.findUnique({
      where: { id },
      select: { seoData: true, seoTitle: true, seoDescription: true, baseLanguage: true, translations: true },
    });
    if (!row) return {};
    // Same per-language resolution the live blog pages use (see utils/blogSeo).
    const own = blogSeoForLang(row, lang);
    const saved = seoForLang(parseSeoMeta(row.seoData), lang);
    return {
      ...saved,
      title: (lang === 'nl' ? undefined : saved.title) || own.title,
      description: (lang === 'nl' ? undefined : saved.description) || own.description,
    };
  }
  return {};
}

export async function getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { ok(res, await seoDashboard()); } catch (err) { next(err); }
}

export async function getContentInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawLang = String(req.query?.lang || 'nl');
    const lang = (['en', 'nl', 'de'].includes(rawLang) ? rawLang : 'nl') as SeoPageLang;
    const host = lang === 'en' ? 'gopeptides.eu' : lang === 'de' ? 'gopeptides.de' : 'gopeptides.nl';
    const base = resolveSiteUrl(host);
    // Host default lang uses bare URL; off-default would need ?lang= — inventory always shows the language home.
    const search = '';

    const [products, categories, posts] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, slug: true, shortDesc: true, seoData: true, updatedAt: true, category: { select: { slug: true } } }, orderBy: { updatedAt: 'desc' } }),
      prisma.category.findMany({ select: { id: true, name: true, slug: true, description: true, seoData: true }, orderBy: { name: 'asc' } }),
      prisma.blogPost.findMany({ select: { id: true, title: true, slug: true, excerpt: true, content: true, seoTitle: true, seoDescription: true, seoData: true, status: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } }),
    ]);
    const pages = await Promise.all(SEO_PAGE_REGISTRY.map(async (page) => {
      const seo = await buildPageSeo(page.path, search, base);
      return {
        ...page,
        seo: mergeEffectiveSeo({}, seo),
        website: host,
        lang,
      };
    }));
    const productRows = await Promise.all(products.map(async (item) => {
      const built = await buildPageSeo(`/${item.slug}`, search, base);
      return { ...item, seo: mergeEffectiveSeo(seoForLang(parseSeoMeta(item.seoData), lang), built), website: host, lang };
    }));
    const categoryRows = await Promise.all(categories.map(async (item) => {
      const built = await buildPageSeo(`/shop/${item.slug}`, search, base);
      return { ...item, seo: mergeEffectiveSeo(seoForLang(parseSeoMeta(item.seoData), lang), built), website: host, lang };
    }));
    const postRows = await Promise.all(posts.map(async (item) => {
      const built = await buildPageSeo(`/blog/${item.slug}`, search, base);
      return { ...item, seo: mergeEffectiveSeo(seoForLang(parseSeoMeta(item.seoData), lang), built), website: host, lang };
    }));
    ok(res, {
      lang,
      website: host,
      products: productRows,
      categories: categoryRows,
      posts: postRows,
      pages,
    });
  } catch (err) { next(err); }
}

export async function updateContentMeta(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, id } = req.params;
    const lang = String(req.body?.lang || 'nl') as SeoPageLang;
    const seo = req.body?.seo;
    if (!seo || typeof seo !== 'object' || Array.isArray(seo)) throw ApiError.badRequest('SEO metadata is required');

    let path = '/';
    if (type === 'product') {
      const current = await prisma.product.findUnique({ where: { id }, select: { seoData: true } });
      const seoData = JSON.stringify(mergeSeoMeta(parseSeoMeta(current?.seoData), seoPatchForLang(seo, lang)));
      const row = await prisma.product.update({ where: { id }, data: { seoData }, include: { category: { select: { slug: true } } } });
      path = `/${row.slug}`;
      ok(res, row, 'SEO metadata updated');
    } else if (type === 'category') {
      const current = await prisma.category.findUnique({ where: { id }, select: { seoData: true } });
      const seoData = JSON.stringify(mergeSeoMeta(parseSeoMeta(current?.seoData), seoPatchForLang(seo, lang)));
      const row = await prisma.category.update({ where: { id }, data: { seoData } });
      path = `/shop/${row.slug}`;
      ok(res, row, 'SEO metadata updated');
    } else if (type === 'post') {
      const current = await prisma.blogPost.findUnique({ where: { id }, select: { seoData: true, translations: true } });
      let translations: Record<string, Record<string, unknown>> = {};
      try { translations = JSON.parse(current?.translations || '{}') || {}; } catch { translations = {}; }
      // The blog editor keeps en/de (and sometimes nl) SEO in per-language boxes — write there
      // too so the blog editor and the SEO Center always show the same text.
      const patch: Record<string, unknown> = { ...seo };
      const useBox = lang !== 'nl' || Boolean(translations.nl?.seoTitle);
      if (useBox) {
        const box = { ...(translations[lang] || {}) };
        if ('title' in patch) box.seoTitle = patch.title || undefined;
        if ('description' in patch) box.seoDescription = patch.description || undefined;
        translations = { ...translations, [lang]: box };
        if (lang === 'nl') { delete patch.title; delete patch.description; }
      }
      const merged = mergeSeoMeta(parseSeoMeta(current?.seoData), seoPatchForLang(patch, lang));
      const seoData = JSON.stringify(merged);
      const row = await prisma.blogPost.update({
        where: { id },
        data: {
          seoData,
          seoTitle: merged.title || null,
          seoDescription: merged.description || null,
          translations: JSON.stringify(translations),
        },
      });
      path = `/blog/${row.slug}`;
      ok(res, row, 'SEO metadata updated');
    } else if (type === 'page') {
      const page = SEO_PAGE_REGISTRY.find((entry) => entry.key === id);
      if (!page) throw ApiError.badRequest('Unsupported content page');
      await savePageSeoOverride(id as SeoPageKey, lang, seo);
      path = page.path;
      ok(res, { id, lang, seo }, 'SEO metadata updated');
    } else {
      throw ApiError.badRequest('Unsupported content type');
    }

    // fire-and-forget — key is always available (auto-provisioned)
    submitIndexNow([path]).catch(() => undefined);
  } catch (err) { next(err); }
}

export async function getContentDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, id } = req.params;
    const rawLang = String(req.query?.lang || 'nl');
    const lang = (['en', 'nl', 'de'].includes(rawLang) ? rawLang : 'nl') as SeoPageLang;
    const target = await resolveContentTarget(type, id, lang as StoreLang);
    const host = lang === 'en' ? 'gopeptides.eu' : lang === 'de' ? 'gopeptides.de' : 'gopeptides.nl';
    const targetUrl = `${resolveSiteUrl(host)}${target.path}`;
    const urlObj = new URL(targetUrl);
    const [snapshot, audit, pageSeo, savedSeo] = await Promise.all([
      inspectRenderedPage(targetUrl),
      auditRenderedPage(targetUrl),
      buildPageSeo(urlObj.pathname, urlObj.search, resolveSiteUrl(urlObj.hostname)),
      loadSavedSeo(type, id, lang),
    ]);
    const effective = mergeEffectiveSeo(savedSeo, pageSeo);
    const h1Values = snapshot.visibleH1s.length
      ? snapshot.visibleH1s
      : snapshot.h1s.length
        ? snapshot.h1s
        : effective.h1
          ? [effective.h1]
          : [];
    const keywordPlan = matchKeywordRow(target.label, target.slug, target.pageType);
    ok(res, {
      type,
      id,
      path: target.path,
      url: targetUrl,
      pageTitle: snapshot.title || effective.title,
      metaDescription: snapshot.description || effective.description,
      h1: h1Values,
      h2: snapshot.visibleH2s.length ? snapshot.visibleH2s : snapshot.h2s,
      contentWords: snapshot.wordCount,
      contentPreview: (snapshot.visibleContentText || snapshot.contentText).slice(0, 800),
      images: {
        total: snapshot.imageCount,
        missingAlt: snapshot.imagesMissingAlt,
      },
      canonical: snapshot.canonical || effective.canonicalUrl,
      robots: snapshot.metaRobots || effective.robots,
      internalLinks: snapshot.internalLinks,
      externalLinks: snapshot.externalLinks,
      validation: {
        score: audit.score,
        issues: audit.checks.filter((check) => check.status !== 'pass'),
        passed: audit.checks.filter((check) => check.status === 'pass').map((check) => check.label),
      },
      sourcePreview: snapshot.sourcePreview,
      keywordPlan,
      editable: effective,
    });
  } catch (err) { next(err); }
}

export async function getSchemaPreview(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { ok(res, await buildSchemaPreview()); } catch (err) { next(err); }
}

export async function getIndexingStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [sitemapPreview, notFoundPaths, indexNowKey, robotsAnalysis] = await Promise.all([
      generateSitemapIndex(),
      prisma.seoNotFoundLog.findMany({ orderBy: { hits: 'desc' }, take: 20 }),
      resolveIndexNowKey(),
      analyzeRobotsTxt(),
    ]);
    ok(res, {
      siteUrl: siteUrl(),
      robotsUrl: `${siteUrl()}/robots.txt`,
      sitemapUrl: `${siteUrl()}/sitemap.xml`,
      indexNowKeyFileUrl: `${siteUrl()}/${indexNowKey}.txt`,
      publicSitemapIndex: `${siteUrl()}/sitemap.xml`,
      publicPostSitemap: `${siteUrl()}/post-sitemap.xml`,
      publicPageSitemap: `${siteUrl()}/page-sitemap.xml`,
      publicProductSitemap: `${siteUrl()}/product-sitemap.xml`,
      publicProductCatSitemap: `${siteUrl()}/product_cat-sitemap.xml`,
      sitemapPreview,
      notFoundPaths,
      robotsAnalysis,
      indexNowConfigured: true,
      googleSearchConsoleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
      staticPages: SEO_PAGE_REGISTRY.map((page) => page.path),
    });
  } catch (err) { next(err); }
}

export async function runLinkAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUrl = String(req.body?.targetUrl || siteUrl());
    if (!sameSite(targetUrl)) throw ApiError.badRequest('Audits may only target the configured storefront domain');
    const loadEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<typeof import('linkinator')>;
    const { LinkChecker } = await loadEsm('linkinator');
    const checker = new LinkChecker();
    const result = await checker.check({ path: targetUrl, recurse: true, concurrency: 10, timeout: 15_000 });
    const links = result.links.map((link) => ({ url: link.url, state: link.state, status: link.status, parent: link.parent })).slice(0, 500);
    const broken = links.filter((link) => link.state === 'BROKEN');
    const skipped = links.filter((link) => link.state === 'SKIPPED');
    const okLinks = links.filter((link) => link.state === 'OK');
    const score = links.length ? Math.round(((links.length - broken.length) / links.length) * 100) : 100;
    const findings = [
      ...broken.map((link) => ({
        status: 'fail' as const,
        url: link.url,
        detail: `HTTP ${link.status ?? 'failed'} — broken link`,
        parent: link.parent,
        library: 'linkinator',
      })),
      ...skipped.slice(0, 20).map((link) => ({
        status: 'warn' as const,
        url: link.url,
        detail: 'Skipped (timeout, external block, or crawl limit)',
        parent: link.parent,
        library: 'linkinator',
      })),
      ...okLinks.slice(0, 30).map((link) => ({
        status: 'pass' as const,
        url: link.url,
        detail: `HTTP ${link.status ?? 200} — OK`,
        parent: link.parent,
        library: 'linkinator',
      })),
    ];
    const run = await prisma.seoAuditRun.create({
      data: {
        type: 'LINKS',
        targetUrl,
        score,
        summary: JSON.stringify({ scanned: links.length, broken: broken.length, skipped: skipped.length, ok: okLinks.length }),
        results: JSON.stringify({ links, broken, skipped, findings }),
      },
    });
    created(res, { ...run, summary: JSON.parse(run.summary), results: JSON.parse(run.results) }, 'Link audit completed');
  } catch (err) { next(err); }
}

/** Try common Chrome/Chromium install locations across OS. */
function detectChromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const { existsSync } = require('fs') as typeof import('fs');
  return candidates.find(existsSync);
}

export async function runLighthouseAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  // ponytail: Lighthouse v12 needs chrome-launcher to spawn Chrome, then receives port — not chromePath flag
  let chrome: { port: number; kill: () => any } | undefined;
  try {
    const targetUrl = String(req.body?.targetUrl || siteUrl());
    if (!sameSite(targetUrl)) throw ApiError.badRequest('Audits may only target the configured storefront domain');
    const chromePath = detectChromePath();
    if (!chromePath) {
      throw ApiError.badRequest(
        'Lighthouse requires Chrome/Chromium. Install Google Chrome or set CHROME_PATH in backend .env. This feature is optional — all other SEO Center functions work without it.',
      );
    }
    const chromeLauncher = require('chrome-launcher') as typeof import('chrome-launcher');
    chrome = await chromeLauncher.launch({
      chromePath,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    const loadEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<{ default: (url: string, flags: Record<string, unknown>) => Promise<{ lhr?: Lhr } | null> }>;
    type Lhr = Parameters<typeof extractLighthouseFindings>[0];
    const { default: lighthouse } = await loadEsm('lighthouse');
    if (!chrome) throw ApiError.badRequest('Failed to launch Chrome');
    const audit = await lighthouse(targetUrl, {
      port: chrome.port,
      onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
      output: 'json',
      logLevel: 'error',
    });
    if (!audit?.lhr) throw ApiError.badRequest('Lighthouse did not return a report.');
    const categories = Object.fromEntries(Object.entries(audit.lhr.categories || {}).map(([key, value]) => [key, Math.round(((value as { score?: number | null }).score ?? 0) * 100)]));
    const { findings, metrics } = extractLighthouseFindings(audit.lhr);
    const score = Number(categories.seo ?? 0);
    const run = await prisma.seoAuditRun.create({
      data: {
        type: 'LIGHTHOUSE',
        targetUrl,
        score,
        summary: JSON.stringify(categories),
        results: JSON.stringify({ categories, metrics, findings }),
      },
    });
    created(res, { ...run, summary: JSON.parse(run.summary), results: JSON.parse(run.results) }, 'Lighthouse audit completed');
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.badRequest(`Lighthouse could not run: ${err instanceof Error ? err.message : String(err)}`));
  } finally {
    // EPERM on temp-dir cleanup is harmless — swallow it
    await chrome?.kill().catch(() => undefined);
  }
}

export async function listAudits(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const runs = await prisma.seoAuditRun.findMany({ orderBy: { createdAt: 'desc' }, take: 30 });
    ok(res, runs.map((run) => ({ ...run, summary: JSON.parse(run.summary), results: JSON.parse(run.results) })));
  } catch (err) { next(err); }
}

export async function listMedia(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const images = await prisma.image.findMany({ include: { product: { select: { id: true, name: true, slug: true } } }, orderBy: { product: { name: 'asc' } } });
    ok(res, images.map((image) => ({ ...image, variants: JSON.parse(image.variants || '{}'), needsAlt: !image.alt?.trim() })));
  } catch (err) { next(err); }
}

const IMAGE_META_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);

function loadExiftool(): any {
  const candidates = [
    'exiftool-vendored',
    path.resolve(process.cwd(), '..', 'scratch', 'geotag', 'node_modules', 'exiftool-vendored'),
  ];
  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      if (mod?.exiftool) return mod.exiftool;
    } catch {}
  }
  throw ApiError.badRequest('Image metadata tools are not installed. The repo already includes scratch/geotag for this; restore that package or install exiftool-vendored.');
}

function walkImages(dir: string, filelist: string[] = []): string[] {
  if (!fs.existsSync(dir)) return filelist;
  for (const file of fs.readdirSync(dir)) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkImages(filepath, filelist);
    } else if (IMAGE_META_EXTENSIONS.has(path.extname(filepath).toLowerCase())) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const IMAGE_EXTENSION_PRIORITY = ['.webp', '.png', '.jpg', '.jpeg'] as const;

function imageVariantKey(filePath: string): string {
  const ref = toPublicLikePath(filePath);
  return `${ref.scope}:${ref.relativePath.replace(/\.(webp|png|jpe?g)$/i, '')}`;
}

function imagePriority(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase() as typeof IMAGE_EXTENSION_PRIORITY[number];
  const index = IMAGE_EXTENSION_PRIORITY.indexOf(ext);
  return index === -1 ? IMAGE_EXTENSION_PRIORITY.length : index;
}

function preferredImageFiles(files: string[]): string[] {
  const preferred = new Map<string, string>();
  for (const filePath of files) {
    const key = imageVariantKey(filePath);
    const current = preferred.get(key);
    if (!current || imagePriority(filePath) < imagePriority(current)) {
      preferred.set(key, filePath);
    }
  }
  return [...preferred.values()];
}

function imageRoots() {
  return [
    { scope: 'frontend' as const, dir: path.resolve(process.cwd(), '..', 'frontend-build', 'public') },
    { scope: 'backend' as const, dir: path.resolve(env.upload.dir) },
  ];
}

function toPublicLikePath(filePath: string): { scope: 'frontend' | 'backend'; relativePath: string; url: string } {
  for (const root of imageRoots()) {
    if (filePath.startsWith(root.dir)) {
      const relativePath = path.relative(root.dir, filePath).replace(/\\/g, '/');
      return {
        scope: root.scope,
        relativePath,
        url: root.scope === 'frontend' ? `/${relativePath}` : `/uploads/${relativePath}`,
      };
    }
  }
  return { scope: 'frontend', relativePath: path.basename(filePath), url: path.basename(filePath) };
}

function normalizeTagValue(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function extractVisibleMetadata(tags: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const ignore = new Set([
    'SourceFile', 'errors', 'Error', 'FilePermissions', 'Directory', 
    'FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate', 
    'ExifToolVersion', 'XMPToolkit'
  ]);
  const picked = Object.entries(tags)
    .filter(([key]) => !ignore.has(key))
    .map(([key, value]) => [key, normalizeTagValue(value)] as const)
    .filter(([, value]) => value !== null);
  return Object.fromEntries(picked);
}

function parseGps(tags: Record<string, unknown>) {
  const lat = Number(tags.GPSLatitude ?? tags['XMP-exif:GPSLatitude'] ?? NaN);
  const lng = Number(tags.GPSLongitude ?? tags['XMP-exif:GPSLongitude'] ?? NaN);
  const altRaw = tags.GPSAltitude ?? tags['XMP-exif:GPSAltitude'];
  const altitude = altRaw == null ? null : Number(altRaw);
  return {
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    altitude: Number.isFinite(altitude as number) ? altitude : null,
  };
}

function isGeotagMatch(gps: { latitude: number | null; longitude: number | null }, latitude: number, longitude: number): boolean {
  if (gps.latitude == null || gps.longitude == null) return false;
  return Math.abs(gps.latitude - latitude) < 0.0001 && Math.abs(gps.longitude - longitude) < 0.0001;
}

export async function listImageMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const latitude = Number(req.query.latitude ?? 52.3138);
    const longitude = Number(req.query.longitude ?? 4.9415);
    const exiftool = loadExiftool();
    const files = preferredImageFiles(imageRoots().flatMap((root) => walkImages(root.dir)));
    const results = await Promise.all(files.map(async (filePath) => {
      try {
        const tags = await exiftool.read(filePath);
        const meta = extractVisibleMetadata(tags);
        const gps = parseGps(tags);
        const ref = toPublicLikePath(filePath);
        return {
          filePath,
          scope: ref.scope,
          relativePath: ref.relativePath,
          url: ref.url,
          fileName: path.basename(filePath),
          metadataCount: Object.keys(meta).length,
          hasMetadata: Object.keys(meta).length > 0,
          geotagged: isGeotagMatch(gps, latitude, longitude),
          gps,
          metadata: meta,
        };
      } catch (error) {
        const ref = toPublicLikePath(filePath);
        return {
          filePath,
          scope: ref.scope,
          relativePath: ref.relativePath,
          url: ref.url,
          fileName: path.basename(filePath),
          metadataCount: 0,
          hasMetadata: false,
          geotagged: false,
          gps: { latitude: null, longitude: null, altitude: null },
          metadata: {},
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }));
    ok(res, {
      latitude,
      longitude,
      total: results.length,
      geotagged: results.filter((item) => item.geotagged).length,
      withMetadata: results.filter((item) => item.hasMetadata).length,
      items: results.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    });
  } catch (err) { next(err); }
}

export async function geotagImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const altitude = req.body?.altitude === '' || req.body?.altitude == null ? null : Number(req.body.altitude);
    const selectedPaths = Array.isArray(req.body?.paths) ? req.body.paths.map(String) : [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw ApiError.badRequest('Latitude and longitude are required');

    const exiftool = loadExiftool();
    const allFiles = preferredImageFiles(imageRoots().flatMap((root) => walkImages(root.dir)));
    const fileSet = selectedPaths.length ? allFiles.filter((filePath) => selectedPaths.includes(toPublicLikePath(filePath).relativePath) || selectedPaths.includes(filePath)) : allFiles;

    let updated = 0;
    const errors: string[] = [];
    for (const filePath of fileSet) {
      try {
        const latRef = latitude >= 0 ? 'N' : 'S';
        const lngRef = longitude >= 0 ? 'E' : 'W';
        const tags: Record<string, unknown> = {
          'XMP-exif:GPSLatitude': Math.abs(latitude),
          'XMP-exif:GPSLongitude': Math.abs(longitude),
          'XMP-exif:GPSLatitudeRef': latRef,
          'XMP-exif:GPSLongitudeRef': lngRef,
        };
        if (altitude != null && Number.isFinite(altitude)) {
          tags['XMP-exif:GPSAltitude'] = Math.abs(altitude);
          tags['XMP-exif:GPSAltitudeRef'] = altitude >= 0 ? 0 : 1;
        }
        await exiftool.write(filePath, tags, ['-overwrite_original']);
        updated++;
      } catch (error) {
        errors.push(`${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    ok(res, { updated, total: fileSet.length, errors }, `Geotagged ${updated} image(s)`);
  } catch (err) { next(err); }
}

export async function convertImagesToWebp(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sharp = require('sharp') as any;
    const files = imageRoots().flatMap((root) => walkImages(root.dir));

    let converted = 0;
    let skipped = 0;
    const errors: string[] = [];

    const updateTextReferences = async (oldUrl: string, newUrl: string) => {
      const [prods, blogs, cats] = await Promise.all([
        prisma.product.findMany(),
        prisma.blogPost.findMany(),
        prisma.category.findMany(),
      ]);

      for (const p of prods) {
        let updated = false;
        let newDesc = p.description;
        let newShortDesc = p.shortDesc;
        if (newDesc?.includes(oldUrl)) { newDesc = newDesc.split(oldUrl).join(newUrl); updated = true; }
        if (newShortDesc?.includes(oldUrl)) { newShortDesc = newShortDesc.split(oldUrl).join(newUrl); updated = true; }
        if (updated) await prisma.product.update({ where: { id: p.id }, data: { description: newDesc, shortDesc: newShortDesc } });
      }

      for (const b of blogs) {
        let updated = false;
        let newContent = b.content;
        let newFeat = b.featuredImage;
        if (newContent?.includes(oldUrl)) { newContent = newContent.split(oldUrl).join(newUrl); updated = true; }
        if (newFeat?.includes(oldUrl)) { newFeat = newFeat.split(oldUrl).join(newUrl); updated = true; }
        if (updated) await prisma.blogPost.update({ where: { id: b.id }, data: { content: newContent, featuredImage: newFeat } });
      }

      for (const c of cats) {
        if (c.description?.includes(oldUrl)) {
          await prisma.category.update({ where: { id: c.id }, data: { description: c.description.split(oldUrl).join(newUrl) } });
        }
      }
    };

    for (const filePath of files) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.webp') {
          skipped++;
          continue;
        }
        if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
          skipped++;
          continue;
        }
        const ref = toPublicLikePath(filePath);
        const destPath = filePath.replace(/\.(jpe?g|png)$/i, '.webp');
        const newUrl = ref.url.replace(/\.(jpe?g|png)$/i, '.webp');
        const oldUrl = ref.url;

        if (fs.existsSync(destPath)) {
          skipped++;
        } else {
          await sharp(filePath).webp({ quality: 82 }).toFile(destPath);
          converted++;
        }

        const imageRows = await prisma.image.findMany({ where: { url: oldUrl } });
        for (const imageRow of imageRows) {
          await prisma.image.update({ where: { id: imageRow.id }, data: { url: newUrl } });
        }

        await updateTextReferences(oldUrl, newUrl);
      } catch (e) {
        errors.push(`${filePath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    ok(res, { converted, skipped, total: files.length, errors }, `Converted ${converted} image(s) to WebP`);
  } catch (err) { next(err); }
}

export async function updateMediaAlt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alt = String(req.body?.alt ?? '').trim();
    if (!alt) throw ApiError.badRequest('Alt text is required');
    ok(res, await prisma.image.update({ where: { id: req.params.id }, data: { alt } }), 'Image alt text updated');
  } catch (err) { next(err); }
}

export async function listRedirects(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { ok(res, await prisma.seoRedirect.findMany({ orderBy: { updatedAt: 'desc' } })); } catch (err) { next(err); }
}

export async function createRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sourcePath, destination, statusCode = 301 } = req.body as { sourcePath?: string; destination?: string; statusCode?: number };
    if (!sourcePath?.startsWith('/') || !destination?.startsWith('/')) throw ApiError.badRequest('Redirect source and destination must be internal paths');
    if (sourcePath === destination) throw ApiError.badRequest('Redirect source and destination cannot match');
    if (![301, 302].includes(statusCode)) throw ApiError.badRequest('Status code must be 301 or 302');
    created(res, await prisma.seoRedirect.create({ data: { sourcePath, destination, statusCode } }), 'Redirect created');
    invalidateRedirectCache();
  } catch (err) { next(err); }
}

export async function updateRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { destination, statusCode, isActive } = req.body as { destination?: string; statusCode?: number; isActive?: boolean };
    const data: { destination?: string; statusCode?: number; isActive?: boolean } = {};
    if (destination !== undefined) {
      if (!destination.startsWith('/')) throw ApiError.badRequest('Destination must be an internal path');
      data.destination = destination;
    }
    if (statusCode !== undefined) {
      if (![301, 302].includes(statusCode)) throw ApiError.badRequest('Status code must be 301 or 302');
      data.statusCode = statusCode;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    ok(res, await prisma.seoRedirect.update({ where: { id: req.params.id }, data }), 'Redirect updated');
    invalidateRedirectCache();
  } catch (err) { next(err); }
}

export async function deleteRedirect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await prisma.seoRedirect.delete({ where: { id: req.params.id } }); invalidateRedirectCache(); noContent(res); } catch (err) { next(err); }
}

export async function listKeywords(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [tracked, products, categories, posts] = await Promise.all([
      prisma.seoKeyword.findMany({ orderBy: [{ priority: 'desc' }, { keyword: 'asc' }] }),
      prisma.product.findMany({ select: { seoData: true } }),
      prisma.category.findMany({ select: { seoData: true } }),
      prisma.blogPost.findMany({ select: { seoData: true, seoTitle: true } }),
    ]);
    const onPage = collectContentKeywords([...products, ...categories, ...posts]);
    ok(res, { tracked, onPage });
  } catch (err) { next(err); }
}

export async function createKeyword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const keyword = String(req.body?.keyword || '').trim().toLowerCase();
    if (!keyword) throw ApiError.badRequest('Keyword is required');
    const targetPath = req.body?.targetPath ? String(req.body.targetPath).trim() : null;
    const notes = req.body?.notes ? String(req.body.notes).trim() : null;
    const priority = Number(req.body?.priority ?? 0);
    created(res, await prisma.seoKeyword.create({ data: { keyword, targetPath, notes, priority: Number.isFinite(priority) ? priority : 0 } }), 'Keyword created');
  } catch (err) { next(err); }
}

export async function updateKeyword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const keyword = req.body?.keyword !== undefined ? String(req.body.keyword).trim().toLowerCase() : undefined;
    if (keyword !== undefined && !keyword) throw ApiError.badRequest('Keyword cannot be empty');
    const data: { keyword?: string; targetPath?: string | null; notes?: string | null; priority?: number } = {};
    if (keyword !== undefined) data.keyword = keyword;
    if (req.body?.targetPath !== undefined) data.targetPath = req.body.targetPath ? String(req.body.targetPath).trim() : null;
    if (req.body?.notes !== undefined) data.notes = req.body.notes ? String(req.body.notes).trim() : null;
    if (req.body?.priority !== undefined) data.priority = Number(req.body.priority) || 0;
    ok(res, await prisma.seoKeyword.update({ where: { id: req.params.id }, data }), 'Keyword updated');
  } catch (err) { next(err); }
}

export async function deleteKeyword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { await prisma.seoKeyword.delete({ where: { id: req.params.id } }); noContent(res); } catch (err) { next(err); }
}

export async function analyzeContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, text, keyword, url, language, wordCount, h2Count, imageCount, internalLinkCount, externalLinkCount } = req.body as {
      title?: string; description?: string; text?: string; keyword?: string; url?: string; language?: string;
      wordCount?: number; h2Count?: number; imageCount?: number; internalLinkCount?: number; externalLinkCount?: number;
    };
    ok(res, analyzeSeoContent({ title, description, text, keyword, url, language, wordCount, h2Count, imageCount, internalLinkCount, externalLinkCount }), 'Content analyzed');
  } catch (err) { next(err); }
}

export async function pingIndexNow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls.map(String) : [];
    if (!urls.length) {
      const xmls = await Promise.all([
        generatePostSitemap(),
        generatePageSitemap(),
        generateProductSitemap(),
        generateProductCatSitemap()
      ]);
      const matches = xmls.flatMap(xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).slice(0, 100);
      ok(res, await submitIndexNow(matches), 'Sitemap URLs submitted to IndexNow');
      return;
    }
    ok(res, await submitIndexNow(urls), 'URLs submitted to IndexNow');
  } catch (err) {
    next(err instanceof Error ? ApiError.badRequest(err.message) : err);
  }
}

export async function getSearchConsole(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try { ok(res, await getSearchConsoleStatus()); } catch (err) { next(err); }
}

export async function getMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { ok(res, await getMerchantStatus(req.get('host'))); } catch (err) { next(err); }
}

export async function updateMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accountId, dataSourceId, feedLabel, contentLanguage } = req.body || {};
    const settings = await saveMerchantSettings({
      accountId: accountId !== undefined ? String(accountId) : undefined,
      dataSourceId: dataSourceId !== undefined ? String(dataSourceId) : undefined,
      feedLabel: feedLabel !== undefined ? String(feedLabel) : undefined,
      contentLanguage: contentLanguage !== undefined ? String(contentLanguage) : undefined,
    });
    ok(res, settings, 'Merchant settings saved');
  } catch (err) { next(err); }
}

export async function syncMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await syncProductsToMerchant(req.get('host'));
    ok(res, result, `Synced ${result.submitted} products (${result.failed} failed)`);
  } catch (err) {
    next(err instanceof Error ? ApiError.badRequest(err.message) : err);
  }
}

export async function registerMerchantProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const developerEmail = typeof req.body?.developerEmail === 'string' && req.body.developerEmail.trim()
      ? req.body.developerEmail.trim()
      : req.user?.email;
    if (!developerEmail) throw ApiError.unauthorized();
    const result = await registerMerchantDeveloper(developerEmail);
    ok(res, result, `Registered Merchant API developer for ${result.developerEmail}`);
  } catch (err) {
    next(err instanceof Error ? ApiError.badRequest(err.message) : err);
  }
}

export async function publicMerchantFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.query.format !== 'json') {
      res.redirect(302, '/merchant.xml');
      return;
    }
    const feed = await listMerchantFeedProducts(req.get('host'));
    res.json({
      generatedAt: new Date().toISOString(),
      base: feed.base,
      productSitemapUrl: feed.productSitemapUrl,
      dataSourceId: feed.settings.dataSourceId,
      feedLabel: feed.settings.feedLabel,
      contentLanguage: feed.settings.contentLanguage,
      count: feed.products.length,
      products: feed.products,
    });
  } catch (err) { next(err); }
}

export async function publicMerchantXml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const feed = await listMerchantFeedProducts(req.get('host'));
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>GoPeptides Products</title>\n`;
    xml += `    <link>${feed.base}</link>\n`;
    xml += `    <description>GoPeptides Google Merchant Center Feed</description>\n`;

    for (const p of feed.products) {
      const priceVal = (Number(p.price.amountMicros) / 1000000).toFixed(2);
      xml += `    <item>\n`;
      xml += `      <g:id><![CDATA[${p.offerId}]]></g:id>\n`;
      xml += `      <g:title><![CDATA[${p.title}]]></g:title>\n`;
      xml += `      <g:description><![CDATA[${p.description}]]></g:description>\n`;
      xml += `      <g:link><![CDATA[${p.link}]]></g:link>\n`;
      xml += `      <g:image_link><![CDATA[${p.imageLink}]]></g:image_link>\n`;
      xml += `      <g:availability>${p.availability === 'IN_STOCK' ? 'in_stock' : p.availability === 'OUT_OF_STOCK' ? 'out_of_stock' : 'preorder'}</g:availability>\n`;
      xml += `      <g:price>${priceVal} ${p.price.currencyCode}</g:price>\n`;
      xml += `      <g:condition>${p.condition}</g:condition>\n`;
      if (p.googleProductCategory) {
        xml += `      <g:google_product_category><![CDATA[${p.googleProductCategory}]]></g:google_product_category>\n`;
      }
      if (p.customLabel0) {
        xml += `      <g:custom_label_0><![CDATA[${p.customLabel0}]]></g:custom_label_0>\n`;
      }
      if (p.unitPricingMeasure) {
        xml += `      <g:unit_pricing_measure>${p.unitPricingMeasure.value}${p.unitPricingMeasure.unit}</g:unit_pricing_measure>\n`;
      }
      if (p.unitPricingBaseMeasure) {
        xml += `      <g:unit_pricing_base_measure>${p.unitPricingBaseMeasure.value}${p.unitPricingBaseMeasure.unit}</g:unit_pricing_base_measure>\n`;
      }
      if (p.shippingWeight) {
        xml += `      <g:shipping_weight>${p.shippingWeight.value} ${p.shippingWeight.unit}</g:shipping_weight>\n`;
      }
      xml += `    </item>\n`;
    }

    xml += `  </channel>\n`;
    xml += `</rss>`;
    
    res.type('application/xml').send(xml);
  } catch (err) { next(err); }
}

export async function publicIndexNowKey(req: Request, res: Response): Promise<void> {
  const key = await resolveIndexNowKey();
  // Verify the requested filename matches our key (the route regex already filters format)
  const requestedKey = req.params.key;
  if (requestedKey && requestedKey !== key) {
    res.status(404).end();
    return;
  }
  res.type('text/plain').send(key);
}

export function googleOAuthConnect(_req: Request, res: Response, next: NextFunction): void {
  try {
    const url = buildGoogleAuthUrl();
    res.redirect(url);
  } catch (err) {
    next(err instanceof Error ? ApiError.badRequest(err.message) : err);
  }
}

export async function googleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = req.query.code as string;
    if (!code) throw ApiError.badRequest('Missing OAuth code parameter');
    await exchangeGoogleCode(code);
    // Redirect back to the SEO Center off-page tab
    res.redirect('/admin/seo/off-page?gsc=connected');
  } catch (err) {
    next(err instanceof Error ? ApiError.badRequest(err.message) : err);
  }
}

function sitemapBase(req: Request): string {
  return resolveSiteUrl(req.get('host'));
}

export async function publicSitemapIndex(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.type('application/xml').send(await generateSitemapIndex(sitemapBase(req))); } catch (err) { next(err); }
}

export async function publicPostSitemap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.type('application/xml').send(await generatePostSitemap(sitemapBase(req))); } catch (err) { next(err); }
}

export async function publicPageSitemap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.type('application/xml').send(await generatePageSitemap(sitemapBase(req))); } catch (err) { next(err); }
}

export async function publicProductSitemap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.type('application/xml').send(await generateProductSitemap(sitemapBase(req))); } catch (err) { next(err); }
}

export async function publicProductCatSitemap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.type('application/xml').send(await generateProductCatSitemap(sitemapBase(req))); } catch (err) { next(err); }
}

export async function publicRobots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.type('text/plain').send(await generateRobots(sitemapBase(req)));
  } catch (err) { next(err); }
}

export async function publicLlmsTxt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.type('text/plain; charset=utf-8').send(await generateLlmsTxt(sitemapBase(req)));
  } catch (err) { next(err); }
}

export async function getToolkit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = req.query.category as SeoPackageCategory | undefined;
    const [packages, technical] = await Promise.all([Promise.resolve(getSeoPackageRegistry()), getTechnicalSignals()]);
    ok(res, {
      packages: category ? getToolkitByCategory(category) : packages,
      byCategory: {
        'on-page': getToolkitByCategory('on-page'),
        technical: getToolkitByCategory('technical'),
        'off-page': getToolkitByCategory('off-page'),
        'content-i18n': getToolkitByCategory('content-i18n'),
        performance: getToolkitByCategory('performance'),
      },
      technical,
      siteUrl: siteUrl(),
    });
  } catch (err) { next(err); }
}

export async function previewSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) throw ApiError.badRequest('Text is required');
    ok(res, { slug: makeSlug(text) });
  } catch (err) { next(err); }
}

export async function previewReadingTime(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const text = String(req.body?.text || '');
    ok(res, estimateReadingTime(text));
  } catch (err) { next(err); }
}

export async function runHtmlAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUrl = req.body?.targetUrl ? String(req.body.targetUrl) : undefined;
    if (targetUrl && !sameSite(targetUrl)) throw ApiError.badRequest('HTML audit may only target the configured storefront domain');
    ok(res, await auditRenderedPage(targetUrl), 'HTML audit completed');
  } catch (err) { next(err); }
}

function isAssetPath(urlPath: string): boolean {
  return /\.(js|css|map|json|wasm|png|jpg|jpeg|svg|gif|ico|ttf|woff|woff2|webp|avif|txt|xml)$/i.test(urlPath);
}

export async function serveSeoHtml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const urlPath = req.path || '/';
    if (urlPath.startsWith('/api') || urlPath.startsWith('/uploads') || urlPath === '/health' || isAssetPath(urlPath)) {
      next();
      return;
    }
    // ponytail: body prerender is bot-only — humans get head SEO + empty #root for React
    const html = await renderSeoHtml(
      urlPath,
      req.url.includes('?') ? `?${req.url.split('?')[1]}` : '',
      req.get('host'),
      { includeBody: false },
    );
    // No explicit cache directive here previously meant browsers could apply their own
    // heuristic caching and silently show stale title/meta/canonical after a content update —
    // this HTML is generated per-request from live DB content, so it must never be cached.
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.type('text/html').send(html);
  } catch (err) {
    next(err);
  }
}

export async function checkRedirectAndLog404(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let urlPath = req.query.path as string;
    if (!urlPath) {
      res.json({ redirect: null });
      return;
    }
    
    // Normalize trailing slash
    if (urlPath !== '/' && urlPath.endsWith('/')) {
      urlPath = urlPath.slice(0, -1);
    }
    
    // Check redirect
    const hit = await prisma.seoRedirect.findUnique({ where: { sourcePath: urlPath } });
    if (hit && hit.isActive) {
      await prisma.seoRedirect.update({ where: { id: hit.id }, data: { hits: { increment: 1 } } }).catch(() => undefined);
      res.json({ redirect: hit.destination });
      return;
    }

    // Log 404
    await prisma.seoNotFoundLog.upsert({
      where: { path: urlPath },
      update: { hits: { increment: 1 }, lastSeen: new Date() },
      create: { path: urlPath, hits: 1 },
    }).catch(() => undefined);

    res.json({ redirect: null });
  } catch (err) {
    next(err);
  }
}

export async function publicSitemapXsl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const publicPath = path.resolve(process.cwd(), '..', 'frontend-build', 'public', 'sitemap.xsl');
    const distPath = path.resolve(process.cwd(), '..', 'frontend-build', 'dist', 'sitemap.xsl');
    const prodPath = path.resolve(process.cwd(), '..', 'frontend', 'sitemap.xsl');

    res.type('application/xml');
    if (fs.existsSync(prodPath)) {
      res.sendFile(prodPath);
    } else if (fs.existsSync(publicPath)) {
      res.sendFile(publicPath);
    } else if (fs.existsSync(distPath)) {
      res.sendFile(distPath);
    } else {
      res.status(404).send('Not Found');
    }
  } catch (err) {
    next(err);
  }
}

export async function pingSitemaps(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await Promise.all(
      allSitemapIndexUrls().map(async (sitemapUrl) => {
        const result = await submitIndexNow([sitemapUrl]);
        return { sitemapUrl, ...result };
      }),
    );
    ok(res, { success: true, message: 'Sitemaps pinged for all GoPeptides TLDs (IndexNow).', results });
  } catch (err) { next(err); }
}

export async function scanAnomalies(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const anomalies: any[] = [];
    
    const [products, categories, posts] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, slug: true, weight: true, seoData: true } }),
      prisma.category.findMany({ select: { id: true, name: true, slug: true, seoData: true } }),
      prisma.blogPost.findMany({ select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true } }),
    ]);

    const checkItem = (type: string, id: string, title: string, currentSlug: string, seoTitle: string | null | undefined, seoDesc: string | null | undefined, correctSlug = makeSlug(title)) => {
      if (currentSlug !== correctSlug) {
        anomalies.push({ type, id, title, error: 'Slugify Anomaly', issue: `Slug is '${currentSlug}' but should be '${correctSlug}'`, suggestion: correctSlug });
      }
      if (!seoTitle || seoTitle.trim() === '') {
        anomalies.push({ type, id, title, error: 'Helmet Anomaly', issue: 'Missing Meta Title', suggestion: `Auto-generate from: ${title}` });
      }
      if (!seoDesc || seoDesc.trim() === '') {
        anomalies.push({ type, id, title, error: 'Helmet Anomaly', issue: 'Missing Meta Description', suggestion: 'Auto-generate from excerpt/short description' });
      }
    };

    products.forEach(p => {
      const seo = parseSeoMeta(p.seoData);
      checkItem('product', p.id, p.name, p.slug, seo.title, seo.description, makeProductSlug(p.name, p.weight));
    });

    categories.forEach(c => {
      const seo = parseSeoMeta(c.seoData);
      checkItem('category', c.id, c.name, c.slug, seo.title, seo.description);
    });

    posts.forEach(p => checkItem('post', p.id, p.title, p.slug, p.seoTitle, p.seoDescription));

    ok(res, anomalies);
  } catch (err) { next(err); }
}

export async function autoFixAnomalies(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let fixCount = 0;
    let redirectsChanged = false;
    
    const [products, categories, posts] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, slug: true, weight: true, seoData: true, shortDesc: true } }),
      prisma.category.findMany({ select: { id: true, name: true, slug: true, seoData: true, description: true } }),
      prisma.blogPost.findMany({ select: { id: true, title: true, slug: true, seoTitle: true, seoDescription: true, excerpt: true } }),
    ]);

    async function ensureUniqueSlug(model: any, baseSlug: string, currentId: string) {
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await model.findFirst({ where: { slug, id: { not: currentId } }, select: { id: true } });
        if (!existing) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      return slug;
    }

    for (const p of products) {
      const correctSlug = makeProductSlug(p.name, p.weight);
      const slugConflict = await prisma.product.findFirst({ where: { slug: correctSlug, id: { not: p.id } }, select: { id: true } });
      const seo = parseSeoMeta(p.seoData);
      let changed = false;
      
      if (!slugConflict && p.slug !== correctSlug) {
        const oldPath = `/${p.slug}`;
        p.slug = correctSlug;
        const existingRedirect = await prisma.seoRedirect.findUnique({ where: { sourcePath: oldPath }, select: { id: true } });
        if (!existingRedirect) {
          await prisma.seoRedirect.create({ data: { sourcePath: oldPath, destination: `/${correctSlug}`, statusCode: 301 } });
          redirectsChanged = true;
        }
        changed = true;
      }
      if (!seo.title) { seo.title = `${p.name} - Buy Peptides Online`; changed = true; }
      if (!seo.description) { seo.description = p.shortDesc ? p.shortDesc.substring(0, 155) : `Buy ${p.name} online at the best price.`; changed = true; }
      
      if (changed) {
        await prisma.product.update({ where: { id: p.id }, data: { slug: p.slug, seoData: JSON.stringify(seo) } });
        fixCount++;
      }
    }

    for (const c of categories) {
      const correctSlug = await ensureUniqueSlug(prisma.category, makeSlug(c.name), c.id);
      const seo = parseSeoMeta(c.seoData);
      let changed = false;
      
      if (c.slug !== correctSlug) { c.slug = correctSlug; changed = true; }
      if (!seo.title) { seo.title = `${c.name} Peptides`; changed = true; }
      if (!seo.description) { seo.description = c.description ? c.description.substring(0, 155) : `Shop our range of ${c.name} peptides.`; changed = true; }
      
      if (changed) {
        await prisma.category.update({ where: { id: c.id }, data: { slug: c.slug, seoData: JSON.stringify(seo) } });
        fixCount++;
      }
    }

    for (const p of posts) {
      const correctSlug = await ensureUniqueSlug(prisma.blogPost, makeSlug(p.title), p.id);
      let changed = false;
      let newSlug = p.slug;
      let newSeoTitle = p.seoTitle;
      let newSeoDesc = p.seoDescription;

      if (p.slug !== correctSlug) { newSlug = correctSlug; changed = true; }
      if (!p.seoTitle) { newSeoTitle = p.title; changed = true; }
      if (!p.seoDescription) { newSeoDesc = p.excerpt ? p.excerpt.substring(0, 155) : p.title; changed = true; }

      if (changed) {
        await prisma.blogPost.update({ where: { id: p.id }, data: { slug: newSlug, seoTitle: newSeoTitle, seoDescription: newSeoDesc } });
        fixCount++;
      }
    }

    if (redirectsChanged) invalidateRedirectCache();
    ok(res, { success: true, message: `Successfully auto-fixed ${fixCount} anomalies without duplicate slug errors!` });
  } catch (err) { next(err); }
}

export async function getRobotsTxt(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'ROBOTS_TXT' } });
    ok(res, { content: setting?.value || await generateRobots() });
  } catch (err) { next(err); }
}

export async function updateRobotsTxt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { content } = req.body;
    await prisma.systemSetting.upsert({
      where: { key: 'ROBOTS_TXT' },
      update: { value: content },
      create: { key: 'ROBOTS_TXT', value: content },
    });
    ok(res, { success: true, message: 'robots.txt updated successfully' });
  } catch (err) { next(err); }
}
