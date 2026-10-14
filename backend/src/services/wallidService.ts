import crypto from 'crypto';
import { getWallidConfig } from '../config/wallid';

export type WallidCreateResult = {
  paymentId: string;
  redirectUrl: string;
};

export type WallidLineItem = {
  name: string;
  quantity: number;
  /** Line total in major currency units (e.g. EUR), not cents. */
  lineTotal: number;
  imageUrl?: string | null;
  productUrl?: string | null;
};

export type WallidWebhookPayload = {
  status: string;
  order_id: string;
  amount?: number | string;
  paymentId?: string;
  payment_id?: string;
  api_payment_id?: string;
  reference?: string;
};

type WallidErrorBody = {
  errors?: Array<{ detail?: string; title?: string }>;
  error?: string;
  message?: string;
  code?: number;
};

type WallidCreateResponse = {
  api_payment_id?: string;
  payment_link?: string;
  status?: string;
  amount?: number;
  order_id?: string;
};

/**
 * Wallid custom Pay-by-Bank API (confirmed by Wallid support Lilik):
 * POST https://payment-api.wallid.co/api/payment-gw/v1/create
 * Auth: HTTP Basic (keyId:keySecret)
 * Amounts are minor units (cents). Response includes payment_link + api_payment_id.
 */
export async function createWallidPayment(input: {
  total: number;
  orderNumber: string;
  currency: string;
  checkoutUrl: string;
  successUrl: string;
  items: WallidLineItem[];
}): Promise<WallidCreateResult> {
  const cfg = getWallidConfig();
  if (!cfg.configured) {
    throw new Error('Wallid is not configured (WALLID_KEY_ID / WALLID_KEY_SECRET)');
  }
  if (input.total < 0.5) {
    throw new Error('Wallid minimum amount is 0.50');
  }

  const amountCents = toMinorUnits(input.total);
  const items = (input.items.length ? input.items : [{
    name: `Order ${input.orderNumber}`,
    quantity: 1,
    lineTotal: input.total,
  }]).map((item) => ({
    name: item.name.slice(0, 120) || 'Item',
    category: 'physical',
    quantity: Math.max(1, Math.round(item.quantity) || 1),
    amount: toMinorUnits(item.lineTotal),
    price: toMinorUnits(item.lineTotal / Math.max(1, item.quantity)),
    image_url: item.imageUrl || 'https://gopeptides.nl/logo-336.webp',
    product_url: item.productUrl || 'https://gopeptides.nl/shop',
  }));

  const payload = {
    order_id: input.orderNumber,
    currency: input.currency.toUpperCase(),
    amount: amountCents,
    success_url: input.successUrl,
    fail_url: input.checkoutUrl,
    items,
  };

  const response = (await wallidGwRequest('POST', '/api/payment-gw/v1/create', payload)) as WallidCreateResponse;
  const paymentId = typeof response.api_payment_id === 'string' ? response.api_payment_id.trim() : '';
  const redirectUrl = typeof response.payment_link === 'string' ? response.payment_link.trim() : '';
  if (!paymentId || !redirectUrl) {
    throw new Error(formatWallidError(response) || 'Wallid did not return api_payment_id/payment_link');
  }

  return { paymentId, redirectUrl };
}

export async function getWallidPaymentStatus(paymentId: string): Promise<unknown> {
  // Support did not document status path; try common variants and surface first success.
  const paths = [
    `/api/payment-gw/v1/${encodeURIComponent(paymentId)}`,
    `/api/payment-gw/v1/${encodeURIComponent(paymentId)}/status`,
    `/api/payment-gw/v1/payments/${encodeURIComponent(paymentId)}`,
  ];
  let lastErr: Error | null = null;
  for (const path of paths) {
    try {
      return await wallidGwRequest('GET', path, null);
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr || new Error('Wallid status lookup failed');
}

/** HMAC-SHA256(rawBody, terminalSecret) — headers: X-Wallid-Signature | X-Webhook-Signature */
export function verifyWallidWebhookSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
  const cfg = getWallidConfig();
  if (!cfg.keySecret || !signatureHeader) return false;
  const expected = crypto.createHmac('sha256', cfg.keySecret).update(rawBody).digest('hex');
  const provided = signatureHeader.trim();
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(provided, 'utf8'));
  } catch {
    return false;
  }
}

export function parseWallidWebhookPayload(rawBody: Buffer | string): WallidWebhookPayload {
  const data = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')) as WallidWebhookPayload;
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON payload');
  if (!data.status) throw new Error('Missing required field: status');
  if (!data.order_id) throw new Error('Missing required field: order_id');
  return data;
}

function toMinorUnits(major: number): number {
  return Math.round(Number(major) * 100);
}

function formatWallidError(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const body = response as WallidErrorBody;
  if (Array.isArray(body.errors) && body.errors.length) {
    return body.errors
      .map((e) => e.detail || e.title || 'Unknown error')
      .filter(Boolean)
      .join(', ');
  }
  if (typeof body.error === 'string') return body.error;
  if (typeof body.message === 'string') return body.message;
  return null;
}

async function wallidGwRequest(
  method: 'GET' | 'POST',
  endpoint: string,
  data: Record<string, unknown> | null,
): Promise<unknown> {
  const cfg = getWallidConfig();
  const base = cfg.apiBaseUrl.replace(/\/$/, '');
  const url = `${base}${endpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`, 'utf8').toString('base64')}`,
  };
  if (data) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  let decoded: unknown = null;
  if (text) {
    try {
      decoded = JSON.parse(text);
    } catch {
      decoded = text;
    }
  }

  if (!res.ok) {
    const detail = formatWallidError(decoded) || (typeof decoded === 'string' ? decoded.slice(0, 300) : text.slice(0, 300)) || res.statusText;
    throw new Error(`Wallid HTTP ${res.status}: ${detail}`);
  }

  return decoded;
}
