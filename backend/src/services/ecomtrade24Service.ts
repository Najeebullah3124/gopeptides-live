import crypto from 'crypto';
import { getEcomtrade24Config } from '../config/ecomtrade24';

export type EcomtradeSessionCreateInput = {
  amount: number;
  currency: string;
  orderNumber: string;
  email: string;
  country?: string;
  returnUrl: string;
  cancelUrl: string;
};

export type EcomtradeSessionCreated = {
  sessionId: string;
  checkoutUrl: string;
};

export type EcomtradeWebhookPayload = {
  event?: string;
  session_id?: string | number;
  order_id?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
};

function normalizeSignature(header: string): string {
  return header.trim().replace(/^sha256=/i, '').toLowerCase();
}

export function verifyEcomtradeWebhookSignature(rawBody: Buffer, headerValue?: string): boolean {
  const cfg = getEcomtrade24Config();
  if (!cfg.webhookSecret || !headerValue) return false;
  const expected = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
  const provided = normalizeSignature(headerValue);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function ecomtradeSignatureFromHeaders(headers: Record<string, unknown>): string | undefined {
  const pick = (k: string) => {
    const v = headers[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return undefined;
  };
  return (
    pick('x-ecomtrade24-signature') ||
    pick('x-signature') ||
    pick('x-webhook-signature')
  );
}

export function parseEcomtradeWebhookPayload(raw: Buffer): EcomtradeWebhookPayload {
  const json = JSON.parse(raw.toString('utf8')) as EcomtradeWebhookPayload;
  if (!json || typeof json !== 'object') throw new Error('Invalid webhook JSON');
  return json;
}

export function isEcomtradePaidStatus(status?: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'paid' || s === 'settled' || s === 'completed';
}

export function isEcomtradeFailedStatus(status?: string): boolean {
  const s = String(status || '').toLowerCase();
  return s === 'failed' || s === 'expired';
}

function formatAmount(n: number): string {
  return n.toFixed(2);
}

export async function createEcomtradeSession(
  input: EcomtradeSessionCreateInput,
): Promise<EcomtradeSessionCreated> {
  const cfg = getEcomtrade24Config();
  if (!cfg.configured) throw new Error('EcomTrade24 is not configured');

  // ponytail: Free plan allowlists 1 domain — always send gopeptides.nl. Omit `method` so hosted checkout shows card/PayPal/iDEAL/crypto.
  const body: Record<string, unknown> = {
    amount: formatAmount(input.amount),
    currency: (input.currency || 'EUR').toUpperCase(),
    domain: cfg.shopDomain,
    order_id: input.orderNumber,
    email: input.email,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    meta: { source: 'gopeptides' },
  };
  if (input.country && /^[A-Z]{2}$/.test(input.country)) body.country = input.country;

  const res = await fetch(`${cfg.apiBaseUrl}/gateway/session.php`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`EcomTrade24 session invalid JSON (${res.status})`);
  }

  if (!res.ok || json.ok === false) {
    const err = String(json.error || json.message || json.code || text || res.status);
    throw new Error(`EcomTrade24 session failed: ${err}`);
  }

  const checkoutUrl = String(json.checkout_url || '').trim();
  const sessionId = json.session_id != null ? String(json.session_id) : '';
  if (!checkoutUrl || !sessionId) {
    throw new Error('EcomTrade24 session missing checkout_url or session_id');
  }
  return { sessionId, checkoutUrl };
}

export async function getEcomtradeSessionStatus(sessionId: string): Promise<Record<string, unknown>> {
  const cfg = getEcomtrade24Config();
  if (!cfg.configured) throw new Error('EcomTrade24 is not configured');
  const url = `${cfg.apiBaseUrl}/gateway/session_status.php?session_id=${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: 'application/json' },
  });
  const json = (await res.json()) as Record<string, unknown>;
  return json;
}

export function ecomtradeStatusPayloadIsPaid(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const obj = payload as Record<string, unknown>;
  const session = obj.session && typeof obj.session === 'object' ? (obj.session as Record<string, unknown>) : obj;
  return isEcomtradePaidStatus(String(session.status || obj.status || ''));
}

export function iso2Country(raw?: string): string | undefined {
  const s = (raw || '').trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  const map: Record<string, string> = {
    netherlands: 'NL',
    nederland: 'NL',
    germany: 'DE',
    deutschland: 'DE',
    belgium: 'BE',
    belgie: 'BE',
    belgië: 'BE',
  };
  return map[s.toLowerCase()];
}
