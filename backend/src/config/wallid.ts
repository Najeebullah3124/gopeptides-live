export type WallidConfig = {
  keyId: string;
  keySecret: string;
  apiBaseUrl: string;
  paymentType: string;
  configured: boolean;
};

export function getWallidConfig(): WallidConfig {
  const keyId = (process.env.WALLID_KEY_ID || '').trim();
  const keySecret = (process.env.WALLID_KEY_SECRET || '').trim();
  const apiBaseUrl = (process.env.WALLID_API_BASE_URL || 'https://payment-api.wallid.co').replace(/\/$/, '');
  // Legacy Woo plugin used pay.wallid.co public create; custom API uses payment-api.wallid.co (support-confirmed).
  const paymentType = (process.env.WALLID_PAYMENT_TYPE || 'CUSTOM').trim() || 'CUSTOM';

  return {
    keyId,
    keySecret,
    apiBaseUrl,
    paymentType,
    configured: Boolean(keyId && keySecret),
  };
}

export function isWallidConfigured(): boolean {
  return getWallidConfig().configured;
}

export function isWallidMethod(method?: string): boolean {
  return method === 'wallid';
}

/**
 * success/checkout URLs for Wallid must stay on our storefront.
 * Prefer browser Origin (local Vite + multi-TLD) over CLIENT_URL when allowlisted.
 */
const CLIENT_ORIGIN_RE =
  /^https?:\/\/(localhost(:\d+)?|(www\.)?gopeptides\.(nl|de|eu|be))$/i;

export function resolveWallidClientBase(reqOrigin: string | undefined, fallback: string): string {
  const origin = (reqOrigin || '').trim().replace(/\/$/, '');
  if (origin && CLIENT_ORIGIN_RE.test(origin)) return origin;
  return fallback.replace(/\/$/, '');
}
