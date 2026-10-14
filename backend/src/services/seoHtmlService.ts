import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { prisma } from '../config/database';
import type { PageSeo } from './seoMetaService';

const GOOGLE_ADS_ID = 'AW-18369431565';

/**
 * Google tag + Consent Mode v2, rendered server-side into every page's raw HTML (not
 * injected lazily by client JS) so Google's own installation checker — which just fetches
 * the page and looks for the tag, without accepting cookies or waiting for engagement —
 * actually finds it. Consent defaults to fully denied; the client updates it to granted
 * once a visitor accepts the cookie banner (see the consent-accept handler in the SPA),
 * so no ad/analytics storage is set before consent even though the tag loads unconditionally.
 */
function buildAnalyticsScript(gaId: string | null): string {
  const primaryId = gaId || GOOGLE_ADS_ID;
  // gopeptides.nl/.de/.eu are three separate origins with redirects between them for
  // language mismatches — without cross-domain linking, GA4 treats every redirect as a
  // brand-new, unattributed session (self-referral) instead of one continuous visit.
  const linkerConfig = `{ linker: { domains: ['gopeptides.nl', 'gopeptides.de', 'gopeptides.eu'] } }`;
  const configCalls = [`gtag('config', '${GOOGLE_ADS_ID}', ${linkerConfig});`];
  if (gaId && gaId !== GOOGLE_ADS_ID) configCalls.unshift(`gtag('config', '${escapeAttr(gaId)}', ${linkerConfig});`);
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(primaryId)}"></script>`,
    `<script id="google-analytics-script">`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });`,
    // Google's documented mitigation for Consent Mode's source/medium attribution gap:
    // passes campaign params (gclid, utm_*) through the URL between pages instead of
    // relying on the cookie GA4 can't set pre-consent — reduces (not set) sessions, it
    // doesn't eliminate them (that part is the correct, expected cost of real consent).
    `  gtag('set', 'url_passthrough', true);`,
    `  gtag('js', new Date());`,
    `  ${configCalls.join('\n  ')}`,
    `</script>`,
  ].join('\n    ');
}

function loadTemplate(): string {
  const indexPath = path.resolve(env.frontendDist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Frontend build not found at ${indexPath}. Run: cd frontend-build && npm run build`);
  }
  return fs.readFileSync(indexPath, 'utf8');
}

export function clearHtmlTemplateCache(): void {
  
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** URLs in href attributes — only escape quotes (keeps & readable for audit tools). */
function escapeHref(value: string): string {
  return value.replace(/"/g, '&quot;');
}

const OG_LOCALE: Record<string, string> = { en: 'en_GB', nl: 'nl_NL', de: 'de_DE' };

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildSeoContentInjection(seo: PageSeo): string {
  const lines: string[] = [];
  if (seo.h1?.trim()) {
    lines.push(`<h1>${escapeHtml(seo.h1.trim())}</h1>`);
  }
  if (seo.directAnswer?.trim()) {
    lines.push(`<p data-aeo="answer">${escapeHtml(seo.directAnswer.trim())}</p>`);
  }
  for (let i = 0; i < (seo.editable?.h2 || []).length; i++) {
    const h2 = seo.editable!.h2![i];
    if (!h2?.trim()) continue;
    // ponytail: one H2 per page — extra section titles as H3 so SF "H2 Multiple" clears
    const tag = i === 0 ? 'h2' : 'h3';
    lines.push(`<${tag}>${escapeHtml(h2.trim())}</${tag}>`);
  }
  // ponytail: meta description lives in <head> only — repeating it in body hurts SF readability scores
  const body = seo.editable?.bodyContent?.trim();
  if (body) {
    const sentences = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    for (let i = 0; i < sentences.length; i += 2) {
      lines.push(`<p>${escapeHtml(sentences.slice(i, i + 2).join(' '))}</p>`);
    }
  }
  const editable = seo.editable;
  for (const link of editable?.internalLinks || []) {
    if (link?.href?.trim() && link?.label?.trim()) lines.push(`<a href="${escapeAttr(link.href.trim())}">${escapeHtml(link.label.trim())}</a>`);
  }
  for (const link of editable?.externalLinks || []) {
    if (link?.href?.trim() && link?.label?.trim()) lines.push(`<a href="${escapeAttr(link.href.trim())}" rel="noopener noreferrer">${escapeHtml(link.label.trim())}</a>`);
  }
  if (!lines.length) return '';
  return `<article id="seo-prerender" class="seo-prerender" lang="${escapeAttr(seo.htmlLang)}" data-seo-managed="true">${lines.join('\n')}</article>`;
}

function buildHeadInjection(seo: PageSeo): string {
  const lines: string[] = [];
  lines.push(`<meta http-equiv="content-language" content="${escapeAttr(seo.htmlLang)}" data-seo-ssr="true" />`);
  lines.push(`<link rel="sitemap" type="application/xml" href="${escapeHref(new URL('/sitemap.xml', seo.canonical).href)}" data-seo-ssr="true" />`);
  lines.push(`<link rel="canonical" href="${escapeHref(seo.canonical)}" data-seo-ssr="true" />`);
  for (const alt of seo.alternates) {
    lines.push(`<link rel="alternate" hreflang="${escapeAttr(alt.hreflang)}" href="${escapeHref(alt.href)}" data-seo-ssr="true" />`);
  }
  lines.push(`<meta name="robots" content="${escapeAttr(seo.robots)}" data-seo-ssr="true" />`);
  const ogLocale = OG_LOCALE[seo.htmlLang] || 'nl_NL';
  lines.push(`<meta property="og:locale" content="${ogLocale}" data-seo-ssr="true" />`);
  for (const [code, locale] of Object.entries(OG_LOCALE)) {
    if (code !== seo.htmlLang) lines.push(`<meta property="og:locale:alternate" content="${locale}" data-seo-ssr="true" />`);
  }
  if (seo.keywords?.length) {
    lines.push(`<meta name="keywords" content="${escapeAttr(seo.keywords.join(', '))}" />`);
  }
  lines.push(`<meta property="og:title" content="${escapeAttr(seo.fullTitle)}" />`);
  lines.push(`<meta property="og:description" content="${escapeAttr(seo.description)}" />`);
  lines.push(`<meta property="og:type" content="website" />`);
  lines.push(`<meta property="og:site_name" content="GoPeptides" />`);
  lines.push(`<meta property="og:url" content="${escapeHref(seo.canonical)}" />`);
  if (seo.ogImage) {
    lines.push(`<meta property="og:image" content="${escapeAttr(seo.ogImage)}" />`);
    lines.push(`<meta name="twitter:card" content="summary_large_image" />`);
    lines.push(`<meta name="twitter:image" content="${escapeAttr(seo.ogImage)}" />`);
  } else {
    lines.push(`<meta name="twitter:card" content="summary" />`);
  }
  lines.push(`<meta name="twitter:title" content="${escapeAttr(seo.fullTitle)}" />`);
  lines.push(`<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`);
  for (const doc of seo.jsonLd) {
    lines.push(`<script type="application/ld+json">${JSON.stringify(doc)}</script>`);
  }
  return lines.join('\n    ');
}

// Deterrent only — no real protection against a motivated visitor (view-source is
// still reachable via browser menus/URL bar, and network devtools bypass this
// entirely). Requested explicitly; skip crawler UAs so indexing is unaffected.
const ANTI_INSPECT_SCRIPT = `<script>(function(){
  var ua = navigator.userAgent || '';
  if (/bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduck|facebookexternalhit/i.test(ua)) return;
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  document.addEventListener('keydown', function(e){
    var k = e.key;
    if (k === 'F12') { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && (k === 'I' || k === 'i' || k === 'J' || k === 'j' || k === 'C' || k === 'c')) { e.preventDefault(); return; }
    if (e.ctrlKey && (k === 'U' || k === 'u')) { e.preventDefault(); return; }
    if (e.metaKey && e.altKey && (k === 'I' || k === 'i' || k === 'J' || k === 'j' || k === 'C' || k === 'c')) { e.preventDefault(); return; }
  });
})();</script>`;

export type RenderSeoHtmlOptions = {
  /** Crawler-only article in #root — never show to human visitors (SPA shell). */
  includeBody?: boolean;
};

export function injectSeoIntoHtml(template: string, seo: PageSeo, opts: RenderSeoHtmlOptions = {}): string {
  const includeBody = opts.includeBody !== false;
  let html = template;
  html = html.replace(/<html([^>]*)lang="[^"]*"/i, `<html$1lang="${seo.htmlLang}"`);
  if (!/<html[^>]*lang=/i.test(html)) {
    html = html.replace('<html', `<html lang="${seo.htmlLang}"`);
  }
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(seo.fullTitle)}</title>`);
  if (/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i.test(html)) {
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeAttr(seo.description)}" />`);
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${escapeAttr(seo.description)}" />\n  </head>`);
  }
  const injection = buildHeadInjection(seo);
  html = html.replace('</head>', `    ${injection}\n  </head>`);
  if (includeBody) {
    const seoContent = buildSeoContentInjection(seo);
    html = html.replace('<div id="root"></div>', `<div id="root">${seoContent || ''}</div>`);
  } else {
    // ponytail: strip any stray prerender before React hydrates — human shell only
    html = html.replace('</body>', '    <script>document.getElementById("seo-prerender")?.remove();</script>\n  </body>');
  }
  html = html.replace('</body>', `    ${ANTI_INSPECT_SCRIPT}\n  </body>`);
  return html;
}

export async function renderSeoHtml(
  pathname: string,
  search = '',
  host?: string | null,
  opts: RenderSeoHtmlOptions = {},
): Promise<string> {
  const { buildPageSeo } = await import('./seoMetaService');
  const { resolveSiteUrl, generateHtmlSitemapBlock } = await import('./seoService');
  const base = resolveSiteUrl(host);
  const seo = await buildPageSeo(pathname, search, base);
  const includeBody = opts.includeBody !== false;
  let html = injectSeoIntoHtml(loadTemplate(), seo, opts);

  let gaId: string | null = null;
  try {
    const analyticsSetting = await prisma.systemSetting.findUnique({ where: { key: 'site.analytics' } });
    if (analyticsSetting?.value) gaId = JSON.parse(analyticsSetting.value)?.googleAnalyticsId || null;
  } catch {
    // Non-critical — the Google Ads tag alone still loads even if the GA4 id can't be read.
  }
  html = html.replace('</head>', `    ${buildAnalyticsScript(gaId)}\n  </head>`);

  const sitemapNav = await generateHtmlSitemapBlock(base);
  // ponytail: noscript body for no-JS auditors (Semrush JS off) — invisible when JS runs
  const noscriptBody = includeBody ? '' : buildSeoContentInjection(seo);
  const noscriptInner = [noscriptBody, sitemapNav].filter(Boolean).join('\n');
  if (noscriptInner) {
    html = html.replace('</body>', `    <noscript>${noscriptInner}</noscript>\n  </body>`);
  }
  return html;
}
