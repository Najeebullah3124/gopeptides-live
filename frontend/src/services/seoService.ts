import { api, unwrap } from './api';

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
  // Per-language fields for gopeptides.eu (en) and gopeptides.de (de); the plain fields above are nl.
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
};

export type SeoKeyword = {
  id: string;
  keyword: string;
  targetPath?: string | null;
  priority: number;
  notes?: string | null;
};

export type SeoPageRegistryItem = {
  key: string;
  path: string;
  label: string;
  editable: boolean;
  type: 'static' | 'collection' | 'content';
  supportsLangs: Array<'en' | 'nl' | 'de'>;
  seo?: SeoMeta | Record<string, SeoMeta>;
};

export type SeoContentDetails = {
  type: string;
  id: string;
  path: string;
  url: string;
  pageTitle: string;
  metaDescription: string;
  h1: string[];
  h2: string[];
  contentWords: number;
  contentPreview: string;
  images: { total: number; missingAlt: number };
  canonical: string;
  robots: string;
  internalLinks: number;
  externalLinks: number;
  validation: { score: number; issues: Array<{ id: string; label: string; status: string; found: string; expected: string; fix: string }>; passed: string[] };
  sourcePreview: string;
  keywordPlan?: { primary: string; secondary: string[]; longTail: string[]; titleDirection: string } | null;
  editable?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    robots?: string;
    socialImage?: string;
    h1?: string;
    h2?: string[];
    bodyContent?: string;
  };
};

export type SeoImageMetadataItem = {
  filePath: string;
  scope: 'frontend' | 'backend';
  relativePath: string;
  url: string;
  fileName: string;
  metadataCount: number;
  hasMetadata: boolean;
  geotagged: boolean;
  gps: { latitude: number | null; longitude: number | null; altitude: number | null };
  metadata: Record<string, string | number | boolean | null>;
  error?: string;
};

export type SeoImageMetadataAudit = {
  latitude: number;
  longitude: number;
  total: number;
  geotagged: number;
  withMetadata: number;
  items: SeoImageMetadataItem[];
};

export const seoService = {
  dashboard: () => unwrap<any>(api.get('/admin/seo/dashboard')),
  content: () => unwrap<{ products: any[]; categories: any[]; posts: any[]; pages: SeoPageRegistryItem[] }>(api.get('/admin/seo/content')),
  contentDetail: (type: 'product' | 'category' | 'post' | 'page', id: string, lang?: 'en' | 'nl' | 'de') =>
    unwrap<SeoContentDetails>(api.get(`/admin/seo/content/${type}/${id}`, { params: { lang } })),
  updateContent: (type: 'product' | 'category' | 'post' | 'page', id: string, seo: SeoMeta, lang?: 'en' | 'nl' | 'de') =>
    unwrap<any>(api.put(`/admin/seo/content/${type}/${id}`, { seo, lang })),
  schema: () => unwrap<any>(api.get('/admin/seo/schema')),
  indexing: () => unwrap<any>(api.get('/admin/seo/indexing')),
  media: () => unwrap<any[]>(api.get('/admin/seo/media')),
  mediaMetadata: (latitude?: number, longitude?: number) => unwrap<SeoImageMetadataAudit>(api.get('/admin/seo/media/metadata', { params: { latitude, longitude } })),
  updateMediaAlt: (id: string, alt: string) => unwrap<any>(api.put(`/admin/seo/media/${id}`, { alt })),
  convertToWebp: () => unwrap<{ converted: number; skipped: number; errors: string[] }>(api.post('/admin/seo/media/convert-webp')),
  geotagImages: (payload: { latitude: number; longitude: number; altitude?: number | null; paths?: string[] }) =>
    unwrap<{ updated: number; total: number; errors: string[] }>(api.post('/admin/seo/media/geotag', payload)),
  audits: () => unwrap<any[]>(api.get('/admin/seo/audits')),
  runLinkAudit: (targetUrl?: string) => unwrap<any>(api.post('/admin/seo/audits/links', { targetUrl })),
  runLighthouseAudit: (targetUrl?: string) => unwrap<any>(api.post('/admin/seo/audits/lighthouse', { targetUrl })),
  redirects: () => unwrap<any[]>(api.get('/admin/seo/redirects')),
  createRedirect: (payload: { sourcePath: string; destination: string; statusCode: 301 | 302 }) =>
    unwrap<any>(api.post('/admin/seo/redirects', payload)),
  updateRedirect: (id: string, payload: { destination?: string; statusCode?: 301 | 302; isActive?: boolean }) =>
    unwrap<any>(api.put(`/admin/seo/redirects/${id}`, payload)),
  deleteRedirect: (id: string) => api.delete(`/admin/seo/redirects/${id}`),
  keywords: () => unwrap<{ tracked: SeoKeyword[]; onPage: string[] }>(api.get('/admin/seo/keywords')),
  createKeyword: (payload: { keyword: string; targetPath?: string; notes?: string; priority?: number }) =>
    unwrap<SeoKeyword>(api.post('/admin/seo/keywords', payload)),
  updateKeyword: (id: string, payload: Partial<{ keyword: string; targetPath: string; notes: string; priority: number }>) =>
    unwrap<SeoKeyword>(api.put(`/admin/seo/keywords/${id}`, payload)),
  deleteKeyword: (id: string) => api.delete(`/admin/seo/keywords/${id}`),
  scanAnomalies: () => unwrap<any>(api.get('/admin/seo/anomalies')),
  autoFixAnomalies: () => unwrap<any>(api.post('/admin/seo/anomalies/fix')),
  pingSitemaps: () => unwrap<any>(api.post('/admin/seo/ping-sitemaps')),
  getRobotsTxt: () => unwrap<{ content: string }>(api.get('/admin/seo/robots-txt')),
  updateRobotsTxt: (content: string) => unwrap<any>(api.put('/admin/seo/robots-txt', { content })),
  analyzeContent: (payload: { title?: string; description?: string; text?: string; keyword?: string; url?: string; language?: string; wordCount?: number; h2Count?: number; imageCount?: number; internalLinkCount?: number; externalLinkCount?: number }) =>
    unwrap<any>(api.post('/admin/seo/analyze', payload)),
  pingIndexNow: (urls?: string[]) => unwrap<any>(api.post('/admin/seo/indexnow', { urls })),
  searchConsole: () => unwrap<any>(api.get('/admin/seo/search-console')),
  merchant: () => unwrap<any>(api.get('/admin/seo/merchant')),
  updateMerchant: (payload: { accountId?: string; dataSourceId?: string; feedLabel?: string; contentLanguage?: string }) =>
    unwrap<any>(api.put('/admin/seo/merchant', payload)),
  registerMerchantProject: (developerEmail?: string) => unwrap<any>(api.post('/admin/seo/merchant/register-project', { developerEmail })),
  syncMerchant: () => unwrap<any>(api.post('/admin/seo/merchant/sync')),
  toolkit: () => unwrap<any>(api.get('/admin/seo/toolkit')),
  previewSlug: (text: string) => unwrap<{ slug: string }>(api.post('/admin/seo/toolkit/slug', { text })),
  previewReadingTime: (text: string) => unwrap<{ text: string; minutes: number; words: number }>(api.post('/admin/seo/toolkit/reading-time', { text })),
  runHtmlAudit: (targetUrl?: string) => unwrap<any>(api.post('/admin/seo/toolkit/html-audit', { targetUrl })),
};
