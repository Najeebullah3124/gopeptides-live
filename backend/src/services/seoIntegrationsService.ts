import IndexNow, { SEARCH_ENGINES } from 'indexnow';
import { google } from 'googleapis';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { siteUrl } from './seoService';

export interface ContentAnalysisInput {
  title?: string;
  description?: string;
  text?: string;
  keyword?: string;
  url?: string;
  language?: string;
  wordCount?: number;
  h2Count?: number;
  imageCount?: number;
  internalLinkCount?: number;
  externalLinkCount?: number;
}

export interface ContentAnalysisResult {
  seoScore: number;
  readabilityScore: number;
  seo: Array<{ id: string; score: number; text: string; rating: 'good' | 'ok' | 'bad'; library: 'yoastseo' }>;
  readability: Array<{ id: string; score: number; text: string; rating: 'good' | 'ok' | 'bad'; library: 'yoastseo' }>;
}

function clampYoastScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeAssessmentScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(9, score));
}

function stripHtml(value?: string): string {
  if (!value) return '';
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(value: string): number {
  if (!value) return 0;
  return value.split(/\s+/).filter(Boolean).length;
}

function yoastRating(score: number): 'good' | 'ok' | 'bad' {
  if (score >= 7) return 'good';
  if (score >= 5) return 'ok';
  return 'bad';
}

function resolveResearcher(language?: string) {
  const lang = (language || 'nl').toLowerCase();
  if (lang === 'nl') return require('yoastseo/build/languageProcessing/languages/nl/Researcher').default;
  if (lang === 'de') return require('yoastseo/build/languageProcessing/languages/de/Researcher').default;
  return require('yoastseo/build/languageProcessing/languages/en/Researcher').default;
}

export function analyzeSeoContent(input: ContentAnalysisInput): ContentAnalysisResult {
  type AssessmentResult = { getIdentifier: () => string; getScore: () => number; getText: () => string };
  type Assessor = { assess: (paper: unknown) => void; results: AssessmentResult[]; calculateOverallScore: () => number };
  const { Paper, SeoAssessor, ContentAssessor } = require('yoastseo') as {
    Paper: new (text: string, data?: Record<string, unknown>) => unknown;
    SeoAssessor: new (researcher: unknown) => Assessor;
    ContentAssessor: new (researcher: unknown) => Assessor;
  };

  const body = [stripHtml(input.text), input.description, input.title].filter(Boolean).join('\n\n').trim();
  // ponytail: yoastseo deprecated 'url' — must use 'slug'; assess(paper) not assess()
  const paper = new Paper(body || input.title || '', {
    keyword: input.keyword || '',
    title: input.title || '',
    description: input.description || '',
    slug: input.url ? input.url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '') : '',
  });
  const Researcher = resolveResearcher(input.language);
  const researcher = new Researcher(paper);

  const seoAssessor = new SeoAssessor(researcher);
  seoAssessor.assess(paper);
  const contentAssessor = new ContentAssessor(researcher);
  contentAssessor.assess(paper);

  const mapResults = (results: AssessmentResult[]) =>
    results
      .filter((r) => r.getText())
      .map((r) => {
        const score = normalizeAssessmentScore(r.getScore());
        return { id: r.getIdentifier(), score, text: r.getText(), rating: yoastRating(score), library: 'yoastseo' as const };
      });

  const wordCount = Math.max(input.wordCount || 0, countWords(body));
  const h2Count = input.h2Count || 0;
  const imageCount = input.imageCount || 0;
  const internalLinkCount = input.internalLinkCount || 0;
  const externalLinkCount = input.externalLinkCount || 0;

  const patchResult = (
    items: Array<{ id: string; score: number; text: string; rating: 'good' | 'ok' | 'bad'; library: 'yoastseo' }>,
    id: string,
    score: number,
    text: string,
  ) => {
    const nextScore = normalizeAssessmentScore(score);
    const next = { id, score: nextScore, text, rating: yoastRating(nextScore), library: 'yoastseo' as const };
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) items[index] = next;
    else items.push(next);
  };

  const seo = mapResults(seoAssessor.results);
  const readability = mapResults(contentAssessor.results);

  if (wordCount >= 300) {
    patchResult(seo, 'textLength', 9, `Text length: The text contains ${wordCount} words, which is within the recommended range.`);
  }
  if (h2Count >= 1) {
    patchResult(readability, 'subheadingsTooLong', 9, `Subheading distribution: This page uses ${h2Count} subheadings, which gives the content structure.`);
  }
  if (imageCount >= 1) {
    patchResult(seo, 'images', 9, `Images: This page contains ${imageCount} image${imageCount === 1 ? '' : 's'}.`);
    if (input.keyword) {
      patchResult(seo, 'imageKeyphrase', 7, `Keyphrase in image alt attributes: Images are present on the page and can be aligned with the focus keyphrase "${input.keyword}".`);
    }
  }
  if (internalLinkCount >= 3) {
    patchResult(seo, 'internalLinks', 9, `Internal links: This page contains ${internalLinkCount} internal links.`);
  }
  if (externalLinkCount >= 1) {
    patchResult(seo, 'externalLinks', 9, `Outbound links: This page contains ${externalLinkCount} outbound links.`);
  }

  return {
    seoScore: clampYoastScore(seoAssessor.calculateOverallScore()),
    readabilityScore: clampYoastScore(contentAssessor.calculateOverallScore()),
    seo,
    readability,
  };
}

// ponytail: cached in-process after first DB read so repeated calls are free
let _indexNowKeyCache: string | null | undefined = undefined;

/**
 * Returns the IndexNow key. Resolution order:
 *   1. INDEXNOW_KEY env var
 *   2. SystemSetting row "indexnow_key"
 *   3. Auto-generate a UUID, persist to SystemSetting, return it
 * Always returns a string — IndexNow is always available.
 */
export async function resolveIndexNowKey(): Promise<string> {
  if (_indexNowKeyCache !== undefined) return _indexNowKeyCache!;

  if (process.env.INDEXNOW_KEY) {
    _indexNowKeyCache = process.env.INDEXNOW_KEY;
    return _indexNowKeyCache;
  }

  const row = await prisma.systemSetting.findUnique({ where: { key: 'indexnow_key' } });
  if (row?.value) {
    _indexNowKeyCache = row.value;
    return _indexNowKeyCache;
  }

  const key = randomUUID().replace(/-/g, '');
  await prisma.systemSetting.upsert({
    where: { key: 'indexnow_key' },
    create: { key: 'indexnow_key', value: key },
    update: { value: key },
  });
  _indexNowKeyCache = key;
  return key;
}

/** Sync wrapper used by legacy callers — returns null only if DB is unavailable */
export function getIndexNowKey(): string | null {
  // Return cached value synchronously; caller must await resolveIndexNowKey() first at startup.
  return _indexNowKeyCache ?? process.env.INDEXNOW_KEY ?? null;
}

export async function submitIndexNow(urls: string[]): Promise<{ submitted: number; engines: string[]; note?: string }> {
  const key = await resolveIndexNowKey();
  const base = siteUrl();
  const absolute = urls.map((url) => (url.startsWith('http') ? url : `${base}${url.startsWith('/') ? url : `/${url}`}`));

  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    return { submitted: absolute.length, engines: ['Bing', 'Yandex'], note: 'dev — submission skipped (localhost not reachable by IndexNow)' };
  }

  const byHost = new Map<string, string[]>();
  for (const url of absolute) {
    const host = new URL(url).host;
    const list = byHost.get(host) ?? [];
    list.push(url);
    byHost.set(host, list);
  }

  const engines = ['https://www.bing.com/indexnow', 'https://yandex.com/indexnow'];

  for (const [host, urlList] of byHost) {
    const keyLocation = `https://${host}/${key}.txt`;
    try {
      const keyRes = await fetch(keyLocation);
      if (!keyRes.ok) console.warn(`IndexNow key file check failed with status ${keyRes.status} on ${keyLocation}`);
    } catch (e) {
      console.warn('IndexNow key file check fetch error:', e);
    }

    const payload = { host, key, keyLocation, urlList };
    for (const endpoint of engines) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`IndexNow API error from ${endpoint}: ${res.status} ${res.statusText} - ${text}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to submit to IndexNow: ${msg}`);
      }
    }
  }

  return { submitted: absolute.length, engines: ['Bing', 'Yandex'] };
}

// ─── Google Search Console ──────────────────────────────────────────────────

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/content',
];

export function getGoogleClientId(): string | undefined {
  return env.google.clientId || undefined;
}
export function getGoogleClientSecret(): string | undefined {
  return env.google.clientSecret || undefined;
}
/** OAuth callback — must match Google Cloud Console "Authorized redirect URIs" exactly. */
export function getGoogleRedirectUri(): string {
  let uri = env.google.redirectUri;
  if (!uri) {
    // Local dev: admin UI is on Vite :5173 (proxies /api → backend)
    const base = siteUrl().includes('localhost') ? 'http://localhost:5173' : siteUrl();
    uri = `${base.replace(/\/$/, '')}/api/admin/seo/google/callback`;
  }
  // ponytail: old misconfig used :3001; Google Console expects :5173 in local dev
  if (uri.includes('localhost:3001')) {
    uri = uri.replace('localhost:3001', 'localhost:5173');
  }
  return uri;
}

export async function getGoogleRefreshToken(): Promise<string | null> {
  if (env.google.refreshToken) return env.google.refreshToken;
  const row = await prisma.systemSetting.findUnique({ where: { key: 'gsc_refresh_token' } });
  return row?.value || null;
}

export async function storeGoogleRefreshToken(token: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: 'gsc_refresh_token' },
    create: { key: 'gsc_refresh_token', value: token },
    update: { value: token },
  });
}

export function buildGoogleAuthUrl(): string {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, getGoogleRedirectUri());
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_OAUTH_SCOPES,
  });
}

export async function exchangeGoogleCode(code: string): Promise<string> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, getGoogleRedirectUri());
  const { tokens } = await oauth2.getToken(code);
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) throw new Error('No refresh token returned — re-authorize with access_type=offline&prompt=consent');
  await storeGoogleRefreshToken(refreshToken);
  return refreshToken;
}

export async function getSearchConsoleStatus(): Promise<{
  configured: boolean;
  connectUrl?: string;
  redirectUri: string;
  enableApiUrl?: string;
  sites?: Array<{ siteUrl?: string | null; permissionLevel?: string | null }>;
  message?: string;
}> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  const redirectUri = getGoogleRedirectUri();

  if (!clientId || !clientSecret) {
    return { configured: false, redirectUri, message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env' };
  }

  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) {
    let connectUrl: string | undefined;
    try { connectUrl = buildGoogleAuthUrl(); } catch { /* ignore */ }
    return {
      configured: false,
      redirectUri,
      message: 'Add the redirect URI below in Google Cloud Console, then click Connect.',
      connectUrl,
    };
  }

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2 });
    const response = await searchconsole.sites.list();
    return { configured: true, redirectUri, sites: response.data.siteEntry || [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const needsApiEnable = /has not been used|is disabled|accessNotConfigured/i.test(msg);
    const project = (clientId || '').split('-')[0];
    let connectUrl: string | undefined;
    try { connectUrl = buildGoogleAuthUrl(); } catch { /* ignore */ }
    return {
      configured: false,
      redirectUri,
      connectUrl,
      enableApiUrl: needsApiEnable && project
        ? `https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=${project}`
        : undefined,
      message: needsApiEnable
        ? 'Enable the Google Search Console API in your Cloud project (link below), wait 2–5 minutes, then refresh this page.'
        : `Google auth error: ${msg}`,
    };
  }
}
