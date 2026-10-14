export type Ecomtrade24Config = {
  apiKey: string;
  webhookSecret: string;
  apiBaseUrl: string;
  shopDomain: string;
  configured: boolean;
};

export function getEcomtrade24Config(): Ecomtrade24Config {
  const apiKey = (process.env.ECOMTRADE24_API_KEY || '').trim();
  const webhookSecret = (process.env.ECOMTRADE24_WEBHOOK_SECRET || '').trim();
  const apiBaseUrl = (process.env.ECOMTRADE24_API_BASE_URL || 'https://pay.ecomtrade24.com').replace(
    /\/$/,
    '',
  );
  const shopDomain = (process.env.ECOMTRADE24_SHOP_DOMAIN || 'gopeptides.nl').trim() || 'gopeptides.nl';

  return {
    apiKey,
    webhookSecret,
    apiBaseUrl,
    shopDomain,
    configured: Boolean(apiKey && webhookSecret),
  };
}

export function isEcomtrade24Configured(): boolean {
  return getEcomtrade24Config().configured;
}

/** EcomTrade24 hosted checkout (card / PayPal / iDEAL / crypto). Legacy `crypto` alias. */
export function isEcomtrade24Method(method?: string): boolean {
  return method === 'ecomtrade24' || method === 'crypto';
}

const CLIENT_ORIGIN_RE =
  /^https?:\/\/(localhost(:\d+)?|(www\.)?gopeptides\.(nl|de|eu|be))$/i;

export function resolveEcomtradeClientBase(reqOrigin: string | undefined, fallback: string): string {
  const origin = (reqOrigin || '').trim().replace(/\/$/, '');
  if (origin && CLIENT_ORIGIN_RE.test(origin)) return origin;
  return fallback.replace(/\/$/, '');
}
