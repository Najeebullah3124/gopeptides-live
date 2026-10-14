import axios from 'axios';
import * as cheerio from 'cheerio';
import readingTime from 'reading-time';
import robotsParser from 'robots-parser';
import slugify from 'slugify';
import { env } from '../config/env';
import { getIndexNowKey } from './seoIntegrationsService';
import { generateRobots, generatePostSitemap, generatePageSitemap, generateProductSitemap, generateProductCatSitemap, resolveSiteUrl, siteUrl } from './seoService';
import { renderSeoHtml } from './seoHtmlService';

export function seoRenderBaseUrl(): string {
  return (process.env.SEO_RENDER_URL || process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export type SeoPackageCategory = 'on-page' | 'technical' | 'off-page' | 'content-i18n' | 'performance';

export interface SeoPackageInfo {
  name: string;
  category: SeoPackageCategory;
  description: string;
  license: string;
  active: boolean;
  note?: string;
}

export function getSeoPackageRegistry(): SeoPackageInfo[] {
  const indexNowKey = getIndexNowKey();
  const gscConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN);
  const redisConfigured = Boolean(process.env.REDIS_URL);

  return [
    { name: 'react-helmet-async', category: 'on-page', description: 'Per-page title, meta, OG and Twitter tags', license: 'Apache-2.0', active: true },
    { name: 'schema-dts', category: 'on-page', description: 'Type-safe Schema.org JSON-LD (Product, FAQ, Breadcrumb)', license: 'Apache-2.0', active: true },
    { name: 'yoastseo', category: 'on-page', description: 'Content readability and focus-keyword scoring', license: 'GPL-3.0', active: true, note: 'GPL — confirm license with client for commercial use' },
    { name: 'slugify', category: 'on-page', description: 'SEO-friendly URL slugs from titles', license: 'MIT', active: true },
    { name: 'cheerio', category: 'on-page', description: 'Server-side HTML audit for headings, meta, alt tags', license: 'MIT', active: true },

    { name: 'sitemap', category: 'technical', description: 'XML sitemap from products, categories, and blog posts', license: 'MIT', active: true },
    { name: 'robots-parser', category: 'technical', description: 'Parse robots.txt and validate crawl rules', license: 'MIT', active: true },
    { name: 'linkinator', category: 'technical', description: 'Broken link and missing image crawler', license: 'Apache-2.0', active: true },
    { name: 'lighthouse', category: 'technical', description: 'Performance, accessibility, and SEO audits', license: 'Apache-2.0', active: true, note: 'Requires Chrome or CHROME_PATH on server' },
    { name: 'indexnow', category: 'technical', description: 'Notify Bing/Yandex after content changes (key auto-provisioned)', license: 'MIT', active: true },
    { name: 'compression', category: 'technical', description: 'Gzip response compression for faster TTFB', license: 'MIT', active: true },
    { name: 'helmet', category: 'technical', description: 'Security headers (HSTS, XSS) as trust signals', license: 'MIT', active: true },
    { name: 'express-rate-limit', category: 'technical', description: 'Protect crawl budget from abusive bots', license: 'MIT', active: true },

    { name: 'googleapis', category: 'off-page', description: 'Google Search Console site list and index status', license: 'Apache-2.0', active: gscConfigured, note: gscConfigured ? undefined : 'Click "Connect Google Search Console" in the Off-Page tab' },
    { name: 'indexnow', category: 'off-page', description: 'Submit URLs to search engines after publish (key auto-provisioned)', license: 'MIT', active: true },

    { name: 'reading-time', category: 'content-i18n', description: 'Estimated read time for blog article schema', license: 'MIT', active: true },
    { name: 'i18n (custom)', category: 'content-i18n', description: 'NL default (/), EN (?lang=en), DE (?lang=de) with hreflang alternates', license: 'MIT', active: true },

    { name: 'sharp', category: 'performance', description: 'WebP/AVIF image derivatives for Core Web Vitals', license: 'Apache-2.0', active: true },
    { name: 'ioredis', category: 'performance', description: 'Optional API response cache for faster crawler TTFB', license: 'MIT', active: redisConfigured, note: redisConfigured ? undefined : 'Optional — set REDIS_URL to enable' },
  ];
}

export function getToolkitByCategory(category: SeoPackageCategory): SeoPackageInfo[] {
  return getSeoPackageRegistry().filter((pkg) => pkg.category === category && pkg.name !== 'ioredis');
}

export function makeSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, trim: true });
}

export function makeProductSlug(name: string, weight: string): string {
  const dosage = weight.trim().toLowerCase().replace(/\s+/g, '').replace(/\+/g, '-');
  return makeSlug(`${name}-${dosage}`);
}

export function estimateReadingTime(text: string): { text: string; minutes: number; words: number } {
  const stats = readingTime(text || '');
  return { text: stats.text, minutes: Math.ceil(stats.minutes), words: stats.words };
}

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface SeoCheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  found: string;
  expected: string;
  fix: string;
  library: 'cheerio' | 'robots-parser';
}

export interface RenderedPageSnapshot {
  url: string;
  html: string;
  title: string;
  description: string;
  h1s: string[];
  h2s: string[];
  visibleH1s: string[];
  visibleH2s: string[];
  canonical: string;
  metaRobots: string;
  jsonLdCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  internalLinks: number;
  externalLinks: number;
  wordCount: number;
  contentText: string;
  visibleContentText: string;
  sourcePreview: string;
  og: { title: string; description: string; image: string };
  twitterCard: string;
  viewport: string;
  hreflangTags: string[];
}

function extractReadableText($: cheerio.CheerioAPI): string {
  const root = $('main, article, [data-page-content], body').first();
  if (!root.length) return '';
  const lines = root
    .find('h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean) as string[];
  return lines.join('\n\n');
}

export async function inspectRenderedPage(targetUrl?: string): Promise<RenderedPageSnapshot> {
  const url = targetUrl || `${seoRenderBaseUrl()}/`;
  const parsedUrl = new URL(url);
  const renderedHtml = await renderSeoHtml(parsedUrl.pathname, parsedUrl.search, parsedUrl.hostname);
  const $ = cheerio.load(renderedHtml);
  const visible$ = cheerio.load(renderedHtml);

  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean) as string[];
  const h2s = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean) as string[];
  visible$('#seo-fallback-heading, #seo-managed-content, [data-seo-fallback="true"], [data-seo-managed="true"], script, style, noscript').remove();
  const visibleH1s = visible$('h1').map((_, el) => visible$(el).text().trim()).get().filter(Boolean) as string[];
  const visibleH2s = visible$('h2').map((_, el) => visible$(el).text().trim()).get().filter(Boolean) as string[];
  const images = $('img');
  const imagesMissingAlt = images.filter((_, el) => !$(el).attr('alt')?.trim()).length;
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const hreflangTags = $('link[rel="alternate"][hreflang]').map((_, el) => `${$(el).attr('hreflang')}: ${$(el).attr('href')}`).get() as string[];
  const jsonLdCount = $('script[type="application/ld+json"]').length;
  const metaRobots = $('meta[name="robots"]').attr('content') || '';
  const og = {
    title: $('meta[property="og:title"]').attr('content') || '',
    description: $('meta[property="og:description"]').attr('content') || '',
    image: $('meta[property="og:image"]').attr('content') || '',
  };
  const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const hostname = new URL(url).hostname;
  const internalLinks = $('a[href^="/"]').length + $(`a[href*="${hostname}"]`).length;
  const externalLinks = $('a[href^="http"]').not(`a[href*="${hostname}"]`).length;
  const contentText = extractReadableText($);
  const visibleContentText = extractReadableText(visible$);
  const wordCount = visibleContentText ? visibleContentText.split(' ').filter(Boolean).length : (contentText ? contentText.split(' ').filter(Boolean).length : 0);
  const sourcePreview = renderedHtml.slice(0, 4000);

  return {
    url,
    html: renderedHtml,
    title,
    description,
    h1s,
    h2s,
    visibleH1s,
    visibleH2s,
    canonical,
    metaRobots,
    jsonLdCount,
    imageCount: images.length,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    wordCount,
    contentText,
    visibleContentText,
    sourcePreview,
    og,
    twitterCard,
    viewport,
    hreflangTags,
  };
}

export async function auditRenderedPage(targetUrl?: string): Promise<{
  url: string;
  score: number;
  checks: SeoCheckResult[];
  /** @deprecated kept for backward compat — prefer checks */
  issues: string[];
  passed: string[];
  meta: { title?: string; description?: string; h1Count: number; imageCount: number; imagesMissingAlt: number };
}> {
  const snapshot = await inspectRenderedPage(targetUrl);
  const url = snapshot.url;
  const title = snapshot.title;
  const description = snapshot.description;
  const h1s = snapshot.visibleH1s.length ? snapshot.visibleH1s : snapshot.h1s;
  const h1Count = h1s.length;
  const imagesMissingAlt = snapshot.imagesMissingAlt;
  const canonical = snapshot.canonical;
  const hreflangCount = snapshot.hreflangTags.length;
  const hreflangTags = snapshot.hreflangTags;
  const jsonLdCount = snapshot.jsonLdCount;
  const metaRobots = snapshot.metaRobots;
  const ogTitle = snapshot.og.title;
  const ogDesc = snapshot.og.description;
  const ogImage = snapshot.og.image;
  const twitterCard = snapshot.twitterCard;
  const viewport = snapshot.viewport;
  const h2Count = (snapshot.visibleH2s.length ? snapshot.visibleH2s : snapshot.h2s).length;
  const internalLinks = snapshot.internalLinks;
  const externalLinks = snapshot.externalLinks;

  const checks: SeoCheckResult[] = [];
  const push = (check: Omit<SeoCheckResult, 'library'> & { library?: SeoCheckResult['library'] }) => {
    checks.push({ library: 'cheerio', ...check });
  };

  // ── Title tag ──────────────────────────────────────────────────────────────
  if (!title) {
    push({ id: 'title', label: 'Title tag', status: 'fail', found: 'Not found', expected: '50–60 characters including main keyword', fix: 'Add a <title> tag to your page. Use format: "Product Name | Brand — main keyword"' });
  } else if (title.length < 30) {
    push({ id: 'title', label: 'Title tag', status: 'warn', found: `"${title}" (${title.length} chars)`, expected: '50–60 characters', fix: `Your title is too short. Expand it to 50–60 chars. Example: "${title} — Research Peptides | GoPeptides"` });
  } else if (title.length > 65) {
    push({ id: 'title', label: 'Title tag', status: 'warn', found: `"${title.slice(0, 60)}…" (${title.length} chars)`, expected: 'Max 65 characters', fix: 'Google truncates titles over 65 chars. Shorten it — keep the primary keyword near the start.' });
  } else {
    push({ id: 'title', label: 'Title tag', status: 'pass', found: `"${title}" (${title.length} chars)`, expected: '50–65 characters', fix: '' });
  }

  // ── Meta description ───────────────────────────────────────────────────────
  if (!description) {
    push({ id: 'description', label: 'Meta description', status: 'fail', found: 'Not found', expected: '120–160 characters', fix: 'Add a <meta name="description"> tag. Write 1-2 sentences that summarise the page and include your focus keyword.' });
  } else if (description.length < 70) {
    push({ id: 'description', label: 'Meta description', status: 'warn', found: `"${description}" (${description.length} chars)`, expected: '120–160 characters', fix: `Expand the description to at least 120 chars. Add a CTA like "Order now with 24h EU delivery."` });
  } else if (description.length > 160) {
    push({ id: 'description', label: 'Meta description', status: 'warn', found: `${description.length} chars`, expected: 'Max 160 characters', fix: 'Google truncates descriptions over 160 chars. Shorten while keeping the keyword and CTA.' });
  } else {
    push({ id: 'description', label: 'Meta description', status: 'pass', found: `"${description.slice(0, 80)}${description.length > 80 ? '…' : ''}" (${description.length} chars)`, expected: '120–160 characters', fix: '' });
  }

  // ── H1 heading ─────────────────────────────────────────────────────────────
  if (h1Count === 0) {
    push({ id: 'h1', label: 'H1 heading', status: 'fail', found: 'No H1 found', expected: 'Exactly 1 H1 containing the focus keyword', fix: 'Add a single <h1> tag on the page. It should contain your main keyword, e.g. "<h1>Research Peptides — GoPeptides</h1>"' });
  } else if (h1Count > 1) {
    push({ id: 'h1', label: 'H1 heading', status: 'warn', found: `${h1Count} H1 tags: "${h1s.slice(0, 2).join('", "')}"`, expected: 'Exactly 1 H1', fix: `Remove extra H1 tags. Keep only "${h1s[0]}" as H1; convert the others to H2.` });
  } else {
    push({ id: 'h1', label: 'H1 heading', status: 'pass', found: `"${h1s[0]}"`, expected: 'Exactly 1 H1', fix: '' });
  }

  // ── H2 structure ──────────────────────────────────────────────────────────
  if (h2Count === 0) {
    push({ id: 'h2', label: 'H2 headings (structure)', status: 'warn', found: 'No H2 found', expected: 'At least 1 H2 to structure content', fix: 'Add H2 headings to break content into sections. Each section heading helps Google understand page topics.' });
  } else {
    push({ id: 'h2', label: 'H2 headings (structure)', status: 'pass', found: `${h2Count} H2 tags`, expected: 'At least 1 H2', fix: '' });
  }

  // ── Image alt text ────────────────────────────────────────────────────────
  if (imagesMissingAlt > 0) {
    push({ id: 'img-alt', label: 'Image alt text', status: snapshot.imageCount > 3 && imagesMissingAlt / snapshot.imageCount > 0.5 ? 'fail' : 'warn', found: `${imagesMissingAlt} of ${snapshot.imageCount} images missing alt`, expected: 'All images have descriptive alt text', fix: `Go to Performance → Image SEO and add alt text for every image. Describe what is in the image, e.g. "BPC-157 10mg peptide vial white background".` });
  } else if (snapshot.imageCount > 0) {
    push({ id: 'img-alt', label: 'Image alt text', status: 'pass', found: `All ${snapshot.imageCount} images have alt text`, expected: 'All images have descriptive alt text', fix: '' });
  }

  // ── Canonical tag ─────────────────────────────────────────────────────────
  if (!canonical) {
    push({ id: 'canonical', label: 'Canonical URL', status: 'fail', found: 'Not found', expected: `<link rel="canonical" href="${url}">`, fix: 'Add a canonical link tag to prevent duplicate content issues. Express already injects this for the storefront — check that the SEO middleware is active.' });
  } else {
    push({ id: 'canonical', label: 'Canonical URL', status: 'pass', found: canonical, expected: 'Points to the correct URL', fix: '' });
  }

  // ── hreflang alternates ───────────────────────────────────────────────────
  if (hreflangCount < 3) {
    push({ id: 'hreflang', label: 'hreflang alternates (NL/EN/DE)', status: 'warn', found: `${hreflangCount} hreflang tags`, expected: 'At least 3 (nl, en, de, x-default)', fix: 'hreflang tells Google which language version to show to which country. Check that the SEO middleware is running on port 3001 (not Vite :5173).' });
  } else {
    push({ id: 'hreflang', label: 'hreflang alternates (NL/EN/DE)', status: 'pass', found: hreflangTags.join(' · '), expected: 'nl, en, de + x-default', fix: '' });
  }

  // ── JSON-LD structured data ───────────────────────────────────────────────
  if (!jsonLdCount) {
    push({ id: 'jsonld', label: 'JSON-LD structured data', status: 'fail', found: 'Not found', expected: 'At least 1 schema.org block (Organization, Product, etc.)', fix: 'JSON-LD helps Google show rich results (stars, price, availability). Check that the SEO HTML service is injecting schema correctly.' });
  } else {
    push({ id: 'jsonld', label: 'JSON-LD structured data', status: 'pass', found: `${jsonLdCount} JSON-LD block(s)`, expected: 'Present', fix: '' });
  }

  // ── OG tags ────────────────────────────────────────────────────────────────
  if (!ogTitle || !ogDesc || !ogImage) {
    push({ id: 'og', label: 'Open Graph (social sharing)', status: 'warn', found: `og:title=${ogTitle ? '✓' : '✗'} og:description=${ogDesc ? '✓' : '✗'} og:image=${ogImage ? '✓' : '✗'}`, expected: 'og:title, og:description, og:image all present', fix: 'Open Graph tags control how your pages look when shared on Facebook/LinkedIn. Add missing OG tags in the On-Page → Content inventory SEO editor.' });
  } else {
    push({ id: 'og', label: 'Open Graph (social sharing)', status: 'pass', found: 'og:title, og:description, og:image all present', expected: 'All 3 OG tags', fix: '' });
  }

  // ── Twitter card ──────────────────────────────────────────────────────────
  if (!twitterCard) {
    push({ id: 'twitter', label: 'Twitter/X card', status: 'warn', found: 'Not found', expected: 'twitter:card = "summary_large_image"', fix: 'Add twitter:card, twitter:title, twitter:description, twitter:image meta tags so your pages look good when shared on Twitter/X.' });
  } else {
    push({ id: 'twitter', label: 'Twitter/X card', status: 'pass', found: `twitter:card="${twitterCard}"`, expected: 'summary_large_image', fix: '' });
  }

  // ── Viewport / mobile ─────────────────────────────────────────────────────
  if (!viewport) {
    push({ id: 'viewport', label: 'Mobile viewport meta', status: 'fail', found: 'Not found', expected: 'content="width=device-width, initial-scale=1"', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your HTML. Google uses mobile-first indexing.' });
  } else {
    push({ id: 'viewport', label: 'Mobile viewport meta', status: 'pass', found: viewport, expected: 'width=device-width, initial-scale=1', fix: '' });
  }

  // ── robots.txt ────────────────────────────────────────────────────────────
  const robots = await generateRobots();
  const parser = robotsParser(`${siteUrl()}/robots.txt`, robots);
  const path = new URL(url).pathname;
  const allowed = parser.isAllowed(url, 'GoPeptides-SEO-Audit') !== false;
  if (!allowed) {
    push({ id: 'robots', label: 'robots.txt — page allowed', status: 'fail', found: `${path} is BLOCKED`, expected: 'Page allowed for crawlers', fix: 'Update robots.txt to allow this path. Check the Disallow rules in your seoService.generateRobots().', library: 'robots-parser' });
  } else {
    push({ id: 'robots', label: 'robots.txt — page allowed', status: 'pass', found: `${path} allowed for crawlers`, expected: 'Allowed', fix: '', library: 'robots-parser' });
  }

  // ── Internal linking ──────────────────────────────────────────────────────
  if (internalLinks < 3) {
    push({ id: 'internal-links', label: 'Internal links', status: 'warn', found: `${internalLinks} internal links found`, expected: 'At least 3–5 internal links per page', fix: 'Add internal links to related products or blog posts. Internal linking distributes PageRank and helps Google crawl deeper pages.' });
  } else {
    push({ id: 'internal-links', label: 'Internal links', status: 'pass', found: `${internalLinks} internal + ${externalLinks} external links`, expected: 'At least 3', fix: '' });
  }

  // ── meta robots noindex check ─────────────────────────────────────────────
  if (metaRobots && metaRobots.includes('noindex')) {
    push({ id: 'noindex', label: 'robots meta — noindex warning', status: 'fail', found: `meta robots="${metaRobots}"`, expected: 'index,follow', fix: 'This page is BLOCKED from Google index. Change the robots meta to "index,follow" in the content SEO editor.' });
  }

  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const total = checks.length;
  const score = Math.round(((total - failCount - warnCount * 0.5) / total) * 100);

  // Backward-compat arrays
  const issues = checks.filter((c) => c.status !== 'pass').map((c) => `${c.label}: ${c.fix || c.found}`);
  const passed = checks.filter((c) => c.status === 'pass').map((c) => c.label);

  return {
    url,
      score,
      checks,
      issues,
      passed,
      meta: { title, description, h1Count, imageCount: snapshot.imageCount, imagesMissingAlt },
  };
}

export async function analyzeRobotsTxt(): Promise<{
  sitemapUrl: string | null;
  disallowRules: string[];
  pageChecks: Array<{ path: string; allowed: boolean; userAgent: string }>;
}> {
  const robots = await generateRobots();
  const parser = robotsParser(`${siteUrl()}/robots.txt`, robots);
  const disallowRules = robots.split('\n').filter((line) => /^\s*disallow:/i.test(line)).map((l) => l.trim());
  const sitemapMatch = robots.match(/^sitemap:\s*(.+)$/im);
  const paths = ['/', '/shop', '/blog', '/faq', '/contact', '/admin', '/api'];
  const pageChecks = paths.flatMap((p) =>
    ['Googlebot', 'Bingbot'].map((ua) => ({
      path: p,
      userAgent: ua,
      allowed: parser.isAllowed(`${siteUrl()}${p}`, ua) !== false,
    })),
  );
  return { sitemapUrl: sitemapMatch?.[1]?.trim() || null, disallowRules, pageChecks };
}

export async function getTechnicalSignals(): Promise<{
  compression: boolean;
  helmet: boolean;
  rateLimit: boolean;
  redis: boolean;
  sitemapUrlCount: number;
}> {
  const xmls = await Promise.all([
    generatePostSitemap(),
    generatePageSitemap(),
    generateProductSitemap(),
    generateProductCatSitemap()
  ]);
  const urlCount = xmls.reduce((acc, xml) => acc + (xml.match(/<loc>/g) || []).length, 0);
  return {
    compression: true,
    helmet: true,
    rateLimit: true,
    redis: Boolean(env.redisUrl || process.env.REDIS_URL),
    sitemapUrlCount: urlCount,
  };
}
