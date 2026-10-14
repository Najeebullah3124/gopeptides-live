import { google } from 'googleapis';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { resolveSiteUrl, siteUrl } from './seoService';
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleRedirectUri,
  getGoogleRefreshToken,
} from './seoIntegrationsService';

export type MerchantSettings = {
  accountId: string;
  dataSourceId: string;
  feedLabel: string;
  contentLanguage: string;
};

export type MerchantFeedItem = {
  offerId: string;
  contentLanguage: string;
  feedLabel: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  condition: 'NEW';
  brand: string;
  price: { amountMicros: string; currencyCode: string };
  googleProductCategory: string;
  customLabel0: string;
  unitPricingMeasure?: { value: number; unit: string };
  unitPricingBaseMeasure?: { value: number; unit: string };
  shippingWeight?: { value: number; unit: string };
};

const SETTINGS_KEYS = {
  accountId: 'merchant_account_id',
  dataSourceId: 'merchant_data_source_id',
  feedLabel: 'merchant_feed_label',
  contentLanguage: 'merchant_content_language',
  lastSyncAt: 'merchant_last_sync_at',
  lastSyncResult: 'merchant_last_sync_result',
} as const;

const DEFAULT_DATA_SOURCE_ID = '10681156555';
const BRAND = 'GoPeptides';
const CURRENCY = 'EUR';
const GOOGLE_CATEGORY = 'Business & Industrial > Science & Laboratory';

function priceToMicros(price: number): string {
  return String(Math.round(price * 1_000_000));
}

function absoluteAssetUrl(base: string, url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const root = base.replace(/\/$/, '');
  return `${root}${url.startsWith('/') ? url : `/${url}`}`;
}

async function readSetting(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value?.trim() || null;
}

async function writeSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getMerchantSettings(): Promise<MerchantSettings> {
  const [accountId, dataSourceId, feedLabel, contentLanguage] = await Promise.all([
    readSetting(SETTINGS_KEYS.accountId),
    readSetting(SETTINGS_KEYS.dataSourceId),
    readSetting(SETTINGS_KEYS.feedLabel),
    readSetting(SETTINGS_KEYS.contentLanguage),
  ]);
  return {
    accountId: accountId || env.merchant.accountId || '',
    dataSourceId: dataSourceId || env.merchant.dataSourceId || DEFAULT_DATA_SOURCE_ID,
    feedLabel: feedLabel || env.merchant.feedLabel || 'NL',
    contentLanguage: contentLanguage || env.merchant.contentLanguage || 'nl',
  };
}

export async function saveMerchantSettings(patch: Partial<MerchantSettings>): Promise<MerchantSettings> {
  if (patch.accountId !== undefined) await writeSetting(SETTINGS_KEYS.accountId, patch.accountId.trim());
  if (patch.dataSourceId !== undefined) await writeSetting(SETTINGS_KEYS.dataSourceId, patch.dataSourceId.trim());
  if (patch.feedLabel !== undefined) await writeSetting(SETTINGS_KEYS.feedLabel, patch.feedLabel.trim());
  if (patch.contentLanguage !== undefined) await writeSetting(SETTINGS_KEYS.contentLanguage, patch.contentLanguage.trim());
  return getMerchantSettings();
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  shortDesc: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  weight: string;
  images: Array<{ url: string; isPrimary: boolean; position: number }>;
};

function parseWeight(weightStr: string): { value: number; unit: string } | null {
  if (!weightStr) return null;
  const match = weightStr.match(/(\d+(?:\+\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return null;
  const numStr = match[1];
  const unit = match[2].toLowerCase();
  let value = 0;
  if (numStr.includes('+')) {
    value = numStr.split('+').reduce((sum, val) => sum + parseFloat(val), 0);
  } else {
    value = parseFloat(numStr);
  }
  if (isNaN(value)) return null;
  return { value, unit };
}

export function mapProductToMerchantFeed(
  product: ProductRow,
  base: string,
  settings: MerchantSettings,
): MerchantFeedItem {
  const image = product.images.find((i) => i.isPrimary) || product.images[0];
  const imageLink = image?.url ? absoluteAssetUrl(base, image.url) : absoluteAssetUrl(base, '/logo-336.webp');
  const description = (product.shortDesc || product.description || product.name).slice(0, 5000);
  
  const parsed = parseWeight(product.weight);
  const unitPricingMeasure = parsed ? { value: parsed.value, unit: parsed.unit } : undefined;
  const unitPricingBaseMeasure = parsed ? { value: 1, unit: parsed.unit } : undefined;
  const shippingWeight = { value: 0.05, unit: 'kg' };

  return {
    offerId: product.sku,
    contentLanguage: settings.contentLanguage,
    feedLabel: settings.feedLabel,
    title: product.name.slice(0, 150),
    description,
    link: `${base.replace(/\/$/, '')}/${product.slug}`,
    imageLink,
    availability: product.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    condition: 'NEW',
    brand: BRAND,
    price: { amountMicros: priceToMicros(product.price), currencyCode: CURRENCY },
    googleProductCategory: GOOGLE_CATEGORY,
    customLabel0: 'Research peptide',
    unitPricingMeasure,
    unitPricingBaseMeasure,
    shippingWeight,
  };
}

export async function listMerchantFeedProducts(host?: string | null): Promise<{
  base: string;
  settings: MerchantSettings;
  products: MerchantFeedItem[];
  productSitemapUrl: string;
}> {
  const base = resolveSiteUrl(host);
  const settings = await getMerchantSettings();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDesc: true,
      description: true,
      price: true,
      stock: true,
      sku: true,
      weight: true,
      images: { orderBy: { position: 'asc' }, select: { url: true, isPrimary: true, position: true } },
    },
    orderBy: { name: 'asc' },
  });
  return {
    base,
    settings,
    products: products.map((p) => mapProductToMerchantFeed(p, base, settings)),
    productSitemapUrl: `${base}/product-sitemap.xml`,
  };
}

async function getGoogleAccessToken(): Promise<string> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) throw new Error('Connect Google in SEO Center (Off-Page) with Merchant API scope enabled');
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, getGoogleRedirectUri());
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error('Could not obtain Google access token — reconnect Google OAuth');
  return token;
}

function toProductInput(item: MerchantFeedItem) {
  return {
    contentLanguage: item.contentLanguage,
    feedLabel: item.feedLabel,
    offerId: item.offerId,
    productAttributes: {
      title: item.title,
      description: item.description,
      link: item.link,
      imageLink: item.imageLink,
      availability: item.availability,
      condition: item.condition,
      brand: item.brand,
      price: item.price,
      googleProductCategory: item.googleProductCategory,
      customLabel0: item.customLabel0,
      unitPricingMeasure: item.unitPricingMeasure,
      unitPricingBaseMeasure: item.unitPricingBaseMeasure,
      shippingWeight: item.shippingWeight,
    },
  };
}

function isInsufficientMerchantScope(message: string): boolean {
  return /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes/i.test(message);
}

function isMerchantProjectNotRegistered(message: string): boolean {
  return /not registered with the merchant account|register the GCP project with the merchant account/i.test(message);
}

export async function syncProductsToMerchant(host?: string | null): Promise<{
  submitted: number;
  failed: number;
  errors: Array<{ offerId: string; error: string }>;
  dataSource: string;
}> {
  const settings = await getMerchantSettings();
  if (!settings.accountId) {
    throw new Error('Set your Merchant Center account ID in SEO Center → Merchant API (numeric ID from Merchant Center URL)');
  }
  const { products } = await listMerchantFeedProducts(host);
  const dataSource = `accounts/${settings.accountId}/dataSources/${settings.dataSourceId}`;
  const token = await getGoogleAccessToken();
  const parent = `accounts/${settings.accountId}`;
  const url = `https://merchantapi.googleapis.com/products/v1/${parent}/productInputs:insert?dataSource=${encodeURIComponent(dataSource)}`;

  let submitted = 0;
  let failed = 0;
  const errors: Array<{ offerId: string; error: string }> = [];

  for (const item of products) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toProductInput(item)),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        if (isInsufficientMerchantScope(text)) {
          throw new Error('Google token is missing Merchant API scope. In SEO Center, click "Connect Google (GSC + Merchant)" again, approve permissions, then re-run Sync products.');
        }
        if (isMerchantProjectNotRegistered(text)) {
          throw new Error('Google Cloud project "gopeptides" is not registered with Merchant Center account 5811796899 yet. In Merchant Center, complete the Merchant API developer registration for GCP project 542750734796, wait 5 minutes, then re-run Sync products.');
        }
        throw new Error(text.slice(0, 500));
      }
      submitted += 1;
    } catch (err: unknown) {
      if (err instanceof Error && (isInsufficientMerchantScope(err.message) || isMerchantProjectNotRegistered(err.message))) {
        throw err;
      }
      failed += 1;
      errors.push({ offerId: item.offerId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const result = { submitted, failed, errors, dataSource };
  await writeSetting(SETTINGS_KEYS.lastSyncAt, new Date().toISOString());
  await writeSetting(SETTINGS_KEYS.lastSyncResult, JSON.stringify(result));
  return result;
}

export async function registerMerchantDeveloper(developerEmail: string): Promise<{
  developerEmail: string;
  name?: string;
  gcpIds?: string[];
}> {
  const settings = await getMerchantSettings();
  if (!settings.accountId) {
    throw new Error('Set your Merchant Center account ID in SEO Center -> Merchant API before registering the GCP project.');
  }
  const email = developerEmail.trim();
  if (!email) {
    throw new Error('Developer email is required for Merchant API registration.');
  }

  const token = await getGoogleAccessToken();
  const url = `https://merchantapi.googleapis.com/accounts/v1/accounts/${settings.accountId}/developerRegistration:registerGcp`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ developerEmail: email }),
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    if (/already registered|already exists|developerregistration/i.test(text)) {
      return { developerEmail: email };
    }
    if (isInsufficientMerchantScope(text)) {
      throw new Error('Google token is missing Merchant API scope. In SEO Center, click "Connect Google (GSC + Merchant)" again, approve permissions, then re-run registration.');
    }
    throw new Error(text.slice(0, 500) || 'Could not register Google Cloud project with Merchant Center.');
  }

  try {
    const data = JSON.parse(text) as { name?: string; gcpIds?: string[] };
    return { developerEmail: email, ...data };
  } catch {
    return { developerEmail: email };
  }
}

export async function getMerchantStatus(host?: string | null): Promise<{
  settings: MerchantSettings;
  productCount: number;
  productSitemapUrl: string;
  feedPreviewUrl: string;
  googleConfigured: boolean;
  googleConnected: boolean;
  connectUrl?: string;
  enableApiUrl?: string;
  lastSyncAt?: string;
  lastSync?: { submitted: number; failed: number; errors: Array<{ offerId: string; error: string }> };
  message?: string;
}> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const googleConfigured = Boolean(clientId && clientSecret);
  const refreshToken = googleConfigured ? await getGoogleRefreshToken() : null;
  const googleConnected = Boolean(refreshToken);
  const base = resolveSiteUrl(host);
  const settings = await getMerchantSettings();
  const productCount = await prisma.product.count({ where: { isActive: true } });
  const lastSyncAt = (await readSetting(SETTINGS_KEYS.lastSyncAt)) || undefined;
  const lastSyncRaw = await readSetting(SETTINGS_KEYS.lastSyncResult);
  let lastSync: { submitted: number; failed: number; errors: Array<{ offerId: string; error: string }> } | undefined;
  if (lastSyncRaw) {
    try { lastSync = JSON.parse(lastSyncRaw); } catch { /* ignore */ }
  }

  let connectUrl: string | undefined;
  let enableApiUrl: string | undefined;
  let message: string | undefined;
  if (!googleConfigured) {
    message = 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env';
  } else if (!googleConnected) {
    message = 'Connect Google in SEO Center to authorize Merchant API (content scope).';
    try {
      const { buildGoogleAuthUrl } = await import('./seoIntegrationsService');
      connectUrl = buildGoogleAuthUrl();
    } catch { /* ignore */ }
  } else if (!settings.accountId) {
    message = 'Enter your Merchant Center account ID below, then click Sync products.';
  }

  const project = (clientId || '').split('-')[0];
  if (googleConfigured) {
    enableApiUrl = project
      ? `https://console.developers.google.com/apis/api/merchantapi.googleapis.com/overview?project=${project}`
      : 'https://console.developers.google.com/apis/library/merchantapi.googleapis.com';
  }

  return {
    settings,
    productCount,
    productSitemapUrl: `${base}/product-sitemap.xml`,
    feedPreviewUrl: `${base}/api/feeds/merchant/products`,
    googleConfigured,
    googleConnected,
    connectUrl,
    enableApiUrl,
    lastSyncAt,
    lastSync,
    message,
  };
}

/** ponytail: one assert-based self-check — run via `npx tsx -e "import './src/services/merchantService'"` */
export function merchantFeedSelfCheck(): void {
  const item = mapProductToMerchantFeed(
    {
      id: 'x',
      name: 'Test Peptide 5mg',
      slug: 'test-peptide',
      shortDesc: 'HPLC tested',
      description: 'Long description',
      price: 49.99,
      stock: 3,
      sku: 'SKU-TEST',
      weight: '5 mg',
      images: [{ url: '/photos/test.webp', isPrimary: true, position: 0 }],
    },
    'https://gopeptides.nl',
    { accountId: '1', dataSourceId: DEFAULT_DATA_SOURCE_ID, feedLabel: 'NL', contentLanguage: 'nl' },
  );
  if (item.price.amountMicros !== '49990000') throw new Error('price micros mismatch');
  if (!item.link.endsWith('/test-peptide')) throw new Error('link mismatch');
  if (!item.imageLink.includes('/photos/test.webp')) throw new Error('image mismatch');
  if (!item.unitPricingMeasure || item.unitPricingMeasure.value !== 5 || item.unitPricingMeasure.unit !== 'mg') {
    throw new Error('unitPricingMeasure mismatch');
  }
  if (!item.shippingWeight || item.shippingWeight.value !== 0.05 || item.shippingWeight.unit !== 'kg') {
    throw new Error('shippingWeight mismatch');
  }
}
