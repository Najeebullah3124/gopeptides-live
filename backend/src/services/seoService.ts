import { SitemapStream, streamToPromise } from 'sitemap';
import { prisma } from '../config/database';
import {
  hreflangAlternates,
  absoluteUrl,
  canonicalBaseForLang,
  categoryShopPath,
  pathForLang,
  slugForLang,
  type StoreLang,
} from '../utils/seoPaths';

export type SeoMeta = {
  title?: string;
  description?: string;
  focusKeywords?: string[];
  canonicalUrl?: string;
  robots?: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  socialImage?: string;
  schemaOverrides?: Record<string, unknown>;
  h1?: string;
  h2?: string[];
  bodyContent?: string;
  internalLinks?: Array<{ label: string; href: string }>;
  externalLinks?: Array<{ label: string; href: string }>;
  // Per-language overrides for gopeptides.eu (en) and gopeptides.de (de). title/description/
  // h1/h2/bodyContent above are nl-primary (gopeptides.nl) — kept separate rather than
  // repurposed so existing nl content isn't disturbed.
  titleEn?: string;
  descriptionEn?: string;
  h1En?: string;
  h2En?: string[];
  bodyContentEn?: string;
  titleDe?: string;
  descriptionDe?: string;
  h1De?: string;
  h2De?: string[];
  bodyContentDe?: string;
  /** Per-lang URL slugs for category/blog (req #2). Primary DB slug stays NL/default. */
  slugEn?: string;
  slugDe?: string;
};

export function parseSeoMeta(raw: string | null | undefined): SeoMeta {
  if (!raw) return {};
  try { return JSON.parse(raw) as SeoMeta; } catch { return {}; }
}

/** Merge SEO patches without wiping fields missing from a partial admin save. */
export function mergeSeoMeta(existing: SeoMeta, patch: SeoMeta): SeoMeta {
  const next: SeoMeta = { ...existing, ...patch };
  for (const key of Object.keys(next) as (keyof SeoMeta)[]) {
    const value = next[key];
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete next[key];
    }
  }
  return next;
}

const GOPEPTIDES_TLDS = new Set(['nl', 'de', 'eu', 'be']);
export const GOPEPTIDES_SITEMAP_TLDS = ['nl', 'de', 'eu', 'be'] as const;

export function siteUrl(): string {
  const raw = (process.env.SITE_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (raw && !/localhost|127\.0\.0\.1/i.test(raw)) return raw;
  if (process.env.NODE_ENV === 'production') return 'https://gopeptides.nl';
  return raw || 'http://localhost:5173';
}

/** ponytail: prefer current request host for feeds/sitemaps; fallback only when host is missing/invalid */
export function resolveSiteUrl(host?: string | null): string {
  if (!host) return siteUrl();
  const rawHost = host.trim().toLowerCase();
  const bare = rawHost.replace(/^www\./i, '').split(':')[0];
  const hasExplicitPort = /:\d+$/.test(rawHost);
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawHost);
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(rawHost);
  const isDomainLike = /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?$/i.test(rawHost);

  if (isLocal || isIp) return `http://${rawHost}`;
  if (isDomainLike) return `https://${bare}${hasExplicitPort ? rawHost.slice(rawHost.indexOf(':')) : ''}`;

  const m = bare.match(/^gopeptides\.([a-z]{2})$/);
  if (m && GOPEPTIDES_TLDS.has(m[1])) return `https://gopeptides.${m[1]}`;
  return siteUrl();
}

export function allSitemapIndexUrls(): string[] {
  return GOPEPTIDES_SITEMAP_TLDS.map((tld) => `https://gopeptides.${tld}/sitemap.xml`);
}

const LANGS: StoreLang[] = ['en', 'nl', 'de'];
const SITEMAP_CHANGEFREQ = 'daily';

type SitemapEntry = {
  url: string;
  changefreq?: string;
  priority?: number;
  lastmod?: Date;
  links?: Array<{ lang: string; url: string }>;
};

function writeLocalized(
  entries: SitemapEntry[],
  innerPath: string,
  query = '',
  opts: Omit<SitemapEntry, 'url' | 'links'> = {},
  restByLang?: Partial<Record<StoreLang, string>>,
): void {
  const alts = hreflangAlternates(innerPath, query, restByLang);
  const links = alts.map((a) => ({ lang: a.hreflang, url: a.href }));
  for (const lang of LANGS) {
    const pathForEntry = restByLang
      ? pathForLang(
          innerPath.startsWith('/blog') ? 'blog' : 'shop',
          lang,
          restByLang[lang] || restByLang.nl || undefined,
        )
      : innerPath;
    entries.push({
      // Each lang's own canonical domain (e.g. de -> gopeptides.de), not whichever domain's
      // sitemap.xml is being requested — every domain's sitemap lists the same canonical set.
      url: absoluteUrl(pathForEntry, lang, query, canonicalBaseForLang(lang)),
      ...opts,
      links,
    });
  }
}

function sitemapStylesheet(base: string): string {
  return `<?xml-stylesheet type="text/xsl" href="${base}/sitemap.xsl"?>`;
}

export async function generateSitemapIndex(base = siteUrl()): Promise<string> {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
${sitemapStylesheet(base)}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${base}/post-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/page-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/product-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>
  <sitemap><loc>${base}/product_cat-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>
</sitemapindex>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function renderSitemapXml(entries: SitemapEntry[], base = siteUrl()): string {
  const urls = entries.map(e => {
    let xml = `  <url>\n    <loc>${escapeXml(e.url)}</loc>`;
    if (e.lastmod) xml += `\n    <lastmod>${e.lastmod.toISOString()}</lastmod>`;
    if (e.changefreq) xml += `\n    <changefreq>${e.changefreq}</changefreq>`;
    if (e.priority) xml += `\n    <priority>${e.priority}</priority>`;
    if (e.links) {
      e.links.forEach(l => {
        xml += `\n    <xhtml:link rel="alternate" hreflang="${l.lang}" href="${escapeXml(l.url)}" />`;
      });
    }
    xml += '\n  </url>';
    return xml;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
${sitemapStylesheet(base)}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>`;
}

export async function generatePostSitemap(base = siteUrl()): Promise<string> {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true, seoData: true },
  });
  const entries: SitemapEntry[] = [];
  for (const post of posts) {
    const seo = parseSeoMeta(post.seoData);
    const restByLang: Partial<Record<StoreLang, string>> = {
      nl: post.slug,
      en: slugForLang(post.slug, seo, 'en'),
      de: slugForLang(post.slug, seo, 'de'),
    };
    writeLocalized(
      entries,
      `/blog/${restByLang.en}`,
      '',
      { lastmod: post.updatedAt, changefreq: SITEMAP_CHANGEFREQ, priority: 0.7 },
      restByLang,
    );
  }
  return renderSitemapXml(entries, base);
}

export async function generatePageSitemap(base = siteUrl()): Promise<string> {
  const staticPaths = ['/', '/shop', '/blog', '/faq', '/labresults', '/reviews', '/contact', '/about', '/terms', '/shipping', '/privacy'];
  const entries: SitemapEntry[] = [];
  for (const p of staticPaths) {
    writeLocalized(entries, p, '', { changefreq: SITEMAP_CHANGEFREQ, priority: p === '/' ? 1 : 0.7 });
  }
  return renderSitemapXml(entries, base);
}

export async function generateProductSitemap(base = siteUrl()): Promise<string> {
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true, category: { select: { slug: true } } } });
  const entries: SitemapEntry[] = [];
  for (const product of products) {
    writeLocalized(entries, `/${product.slug}`, '', { lastmod: product.updatedAt, changefreq: SITEMAP_CHANGEFREQ, priority: 0.8 });
  }
  return renderSitemapXml(entries, base);
}

export async function generateProductCatSitemap(base = siteUrl()): Promise<string> {
  const categories = await prisma.category.findMany({ select: { slug: true, seoData: true } });
  const entries: SitemapEntry[] = [];
  for (const category of categories) {
    const seo = parseSeoMeta(category.seoData);
    const restByLang: Partial<Record<StoreLang, string>> = {
      nl: category.slug,
      en: slugForLang(category.slug, seo, 'en'),
      de: slugForLang(category.slug, seo, 'de'),
    };
    writeLocalized(
      entries,
      categoryShopPath(restByLang.en || category.slug, 'en'),
      '',
      { changefreq: SITEMAP_CHANGEFREQ, priority: 0.7 },
      restByLang,
    );
  }
  return renderSitemapXml(entries, base);
}

export async function generateRobots(base = siteUrl()): Promise<string> {
  const sitemapLine = `Sitemap: ${base}/sitemap.xml`;
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'ROBOTS_TXT' } });
  if (setting?.value) {
    const body = setting.value.replace(/^Sitemap:\s*.+$/gim, '').trimEnd();
    return `${body}\n\n${sitemapLine}\n`;
  }
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\n\n${sitemapLine}\n`;
}

export async function generateLlmsTxt(base = siteUrl()): Promise<string> {
  const [products, categories, posts] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, weight: true, purity: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.category.findMany({ select: { name: true, slug: true }, orderBy: { name: 'asc' } }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true, slug: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    }),
  ]);

  const productLines = products
    .map((p) => {
      const dose = p.weight?.trim() ? ` (${p.weight.trim()})` : '';
      const pur = p.purity?.trim() ? `, purity ${p.purity.trim()}` : '';
      return `- [${p.name}${dose}](${base}/${p.slug})${pur}`;
    })
    .join('\n');

  const categoryLines = categories
    .map((c) => `- [${c.name}](${base}${categoryShopPath(c.slug, 'en')})`)
    .join('\n');

  const postLines = posts
    .map((p) => `- [${p.title}](${base}/blog/${p.slug})`)
    .join('\n');

  return `# GoPeptides

> HPLC-tested research peptides for laboratory use only. Based in Amsterdam, Netherlands. Not for human or animal consumption.

## Entity

- Official name: GoPeptides
- Type: Research peptide e-commerce / laboratory supplier
- Location: Amsterdam, NL (registered business; not a walk-in visiting address)
- Contact: info@gopeptides.nl
- Languages: Dutch (default), English, German
- Domains: gopeptides.nl, gopeptides.de, gopeptides.eu, gopeptides.be
- Compliance: research-use-only; batch HPLC / Certificate of Analysis where available
- Payments: Wallid Open Banking, manual bank transfer
- Shipping: EU dispatch, typically within 24 hours

## When citing this site

Prefer primary product URLs (\`/{product-slug}\`), lab results (\`/labresults\`), and FAQ (\`/faq\`).
Do not imply medical, diagnostic, or therapeutic use. Quote purity and CoA claims only as laboratory documentation.

## Key pages

- [Home](${base}/)
- [Shop](${base}/shop)
- [Lab results](${base}/labresults)
- [FAQ](${base}/faq)
- [About](${base}/about)
- [Blog](${base}/blog)
- [Contact](${base}/contact)
- [Shipping](${base}/shipping)
- [Terms](${base}/terms)
- [Privacy](${base}/privacy)
- [Sitemap](${base}/sitemap.xml)
- [This file](${base}/llms.txt)

## Categories

${categoryLines || '- (none)'}

## Active products

${productLines || '- (none)'}

## Recent blog posts

${postLines || '- (none)'}

## Technical notes for AI systems

- Product canonical URLs are direct: \`/{slug}\` (not nested shop paths)
- Multilingual via \`?lang=en\` and \`?lang=de\` (NL is default / x-default)
- Structured data includes Organization, Product, FAQPage, and BreadcrumbList where relevant
- robots.txt disallows /admin, /account, /checkout, /cart
`;
}

export async function seoDashboard() {
  const [products, categories, posts, images, missingAlt, redirects, notFound, latestAudits] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }), prisma.category.count(), prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.image.count(), prisma.image.count({ where: { OR: [{ alt: null }, { alt: '' }] } }), prisma.seoRedirect.count({ where: { isActive: true } }),
    prisma.seoNotFoundLog.count(), prisma.seoAuditRun.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  return { products, categories, posts, images, missingAlt, redirects, notFound, latestAudits };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let cachedSitemapBlock: string | null = null;
let cachedSitemapBlockAt = 0;
let cachedSitemapBlockKey = '';
const SITEMAP_TTL_MS = 300_000;

export async function generateHtmlSitemapBlock(base = siteUrl()): Promise<string> {
  const cacheKey = base;
  if (cachedSitemapBlock && cachedSitemapBlockKey === cacheKey && Date.now() - cachedSitemapBlockAt < SITEMAP_TTL_MS) {
    return cachedSitemapBlock;
  }

  const [products, categories, posts] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { name: true, slug: true, category: { select: { slug: true } } } }),
    prisma.category.findMany({ select: { name: true, slug: true } }),
    prisma.blogPost.findMany({ where: { status: 'PUBLISHED' }, select: { title: true, slug: true } }),
  ]);

  const links: string[] = [];
  const linkLabel = (url: string): string => {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || '/';
  };
  const addLink = (url: string) => {
    links.push(`<li><a href="${escapeHtml(url)}">${escapeHtml(linkLabel(url))}</a></li>`);
  };

  const pageUrl = (innerPath: string, lang: StoreLang) => absoluteUrl(innerPath, lang, '', base);

  const staticPaths = ['/', '/shop', '/blog', '/faq', '/labresults', '/reviews', '/contact', '/about', '/terms', '/shipping', '/privacy'];

  addLink(`${base}/sitemap.xml`);
  addLink(`${base}/llms.txt`);

  // ponytail: all langs for SF discovery; unique path+query labels avoid hreflang anchor skew
  for (const p of staticPaths) {
    for (const lang of LANGS) {
      addLink(pageUrl(p, lang));
    }
  }
  for (const c of categories) {
    const path = categoryShopPath(c.slug);
    for (const lang of LANGS) {
      addLink(pageUrl(path, lang));
    }
  }
  for (const p of products) {
    const path = `/${p.slug}`;
    for (const lang of LANGS) {
      addLink(pageUrl(path, lang));
    }
  }
  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    for (const lang of LANGS) {
      addLink(pageUrl(path, lang));
    }
  }

  cachedSitemapBlock = `<nav id="html-sitemap" aria-label="Sitemap"><ul>${links.join('')}</ul></nav>`;
  cachedSitemapBlockAt = Date.now();
  cachedSitemapBlockKey = cacheKey;
  return cachedSitemapBlock;
}

export function invalidateHtmlSitemapCache(): void {
  cachedSitemapBlock = null;
  cachedSitemapBlockKey = '';
}
