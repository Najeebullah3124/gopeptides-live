import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { parseSeoMeta } from '../services/seoService';
import {
  defaultLangForHost,
  pathForLang,
  resolveLocalizedPath,
  rewritePathForLang,
  slugForLang,
  type StoreLang,
} from '../utils/seoPaths';

type RedirectHit = { id: string; destination: string; statusCode: number };

/** Mirrors seoPaths' LANG_CANONICAL_DOMAIN — every language has exactly one live domain. */
const LIVE_LANG_DOMAIN: Partial<Record<StoreLang, string>> = { de: 'gopeptides.de', en: 'gopeptides.eu' };
const PRIMARY_DOMAIN = 'gopeptides.nl';
const KNOWN_GOPEPTIDES_HOSTS = new Set(['gopeptides.nl', 'gopeptides.de', 'gopeptides.eu', 'gopeptides.be']);

function canonicalHostFor(lang: StoreLang): string {
  return LIVE_LANG_DOMAIN[lang] || PRIMARY_DOMAIN;
}

let cache: Map<string, RedirectHit> | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadRedirects(): Promise<Map<string, RedirectHit>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  const rows = await prisma.seoRedirect.findMany({ where: { isActive: true } });
  cache = new Map(rows.map((r) => [r.sourcePath, { id: r.id, destination: r.destination, statusCode: r.statusCode }]));
  cacheAt = Date.now();
  return cache;
}

/** Call after create/update/delete so new rules apply immediately. */
export function invalidateRedirectCache(): void {
  cache = null;
}

async function restSlugForLang(
  pageKey: 'shop' | 'blog',
  rest: string,
  lang: StoreLang,
): Promise<string> {
  if (!rest) return rest;
  if (pageKey === 'shop') {
    const cats = await prisma.category.findMany({ select: { slug: true, seoData: true } });
    const hit = cats.find((c) => {
      const seo = parseSeoMeta(c.seoData);
      const n = rest.toLowerCase();
      return (
        c.slug.toLowerCase() === n ||
        seo.slugEn?.toLowerCase() === n ||
        seo.slugDe?.toLowerCase() === n
      );
    });
    if (hit) return slugForLang(hit.slug, parseSeoMeta(hit.seoData), lang);
  }
  if (pageKey === 'blog') {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, seoData: true },
    });
    const hit = posts.find((p) => {
      const seo = parseSeoMeta(p.seoData);
      const n = rest.toLowerCase();
      return (
        p.slug.toLowerCase() === n ||
        seo.slugEn?.toLowerCase() === n ||
        seo.slugDe?.toLowerCase() === n
      );
    });
    if (hit) return slugForLang(hit.slug, parseSeoMeta(hit.seoData), lang);
  }
  return rest;
}

/** Build the correct language-home path for a request (localized segments + optional rest). */
async function localizeUrlPath(urlPath: string, lang: StoreLang): Promise<string> {
  const resolved = resolveLocalizedPath(urlPath);
  if (resolved.pageKey === 'home') return '/';
  if (resolved.pageKey === 'shop' || resolved.pageKey === 'blog') {
    const rest = resolved.rest
      ? await restSlugForLang(resolved.pageKey, resolved.rest, lang)
      : '';
    return pathForLang(resolved.pageKey, lang, rest || undefined);
  }
  if (resolved.pageKey) return pathForLang(resolved.pageKey, lang, resolved.rest || undefined);
  return rewritePathForLang(urlPath, lang);
}

/** ponytail: in-memory map, 60s TTL — fine for redirect volume on this store */
export async function seoRedirectMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const urlPath = req.path;
  if (urlPath.startsWith('/api') || urlPath.startsWith('/uploads') || urlPath === '/health') return next();

  const rawSearch = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1) : '';

  // Cross-domain canonicalization: bounce to the one true home for the requested language,
  // rewriting localized path segments (and category/blog slugs when known).
  const hostHeader = (req.get('host') || '').toLowerCase();
  const bareHost = hostHeader.replace(/^www\./, '').split(':')[0];
  if (KNOWN_GOPEPTIDES_HOSTS.has(bareHost)) {
    const paramsForHost = new URLSearchParams(rawSearch);
    const requestedLang = (paramsForHost.get('lang') as StoreLang | null) || defaultLangForHost(bareHost);
    const targetHost = canonicalHostFor(requestedLang);
    const localized = await localizeUrlPath(urlPath, requestedLang);

    if (targetHost !== bareHost) {
      if (requestedLang === defaultLangForHost(targetHost)) paramsForHost.delete('lang');
      const rest = paramsForHost.toString();
      return res.redirect(301, `https://${targetHost}${localized}${rest ? `?${rest}` : ''}`);
    }

    // Same host: wrong language segment (e.g. /shop on .nl → /winkel) or wrong category slug.
    const hostLang = defaultLangForHost(bareHost);
    if (localized !== urlPath && !paramsForHost.get('lang')) {
      const rest = paramsForHost.toString();
      return res.redirect(301, `${localized}${rest ? `?${rest}` : ''}`);
    }
    // Also rewrite when ?lang= is host-default language but path is foreign segment.
    if (localized !== urlPath && paramsForHost.get('lang') === hostLang) {
      paramsForHost.delete('lang');
      const rest = paramsForHost.toString();
      return res.redirect(301, `${localized}${rest ? `?${rest}` : ''}`);
    }
  }

  if (rawSearch) {
    const params = new URLSearchParams(rawSearch);

    const cat = params.get('category');
    const resolved = resolveLocalizedPath(urlPath);
    if (cat && (urlPath === '/shop' || resolved.pageKey === 'shop') && !resolved.rest) {
      params.delete('category');
      const hostLang = defaultLangForHost(bareHost);
      const dest = pathForLang('shop', hostLang, cat);
      const rest = params.toString();
      return res.redirect(301, rest ? `${dest}?${rest}` : dest);
    }

    const lang = params.get('lang') as StoreLang | null;
    if (lang && lang === defaultLangForHost(req.get('host') || undefined)) {
      params.delete('lang');
      const rest = params.toString();
      return res.redirect(301, rest ? `${urlPath}?${rest}` : urlPath);
    }
  }

  const map = await loadRedirects();
  const hit = map.get(urlPath);
  if (!hit) return next();

  prisma.seoRedirect.update({ where: { id: hit.id }, data: { hits: { increment: 1 } } }).catch(() => undefined);

  res.redirect(hit.statusCode, hit.destination);
}
