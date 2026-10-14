/**
 * HMAC + paid-status rules for EcomTrade24 webhooks.
 * Run: npx tsx scripts/checkEcomtrade24Webhook.ts
 */
import assert from 'assert';
import crypto from 'crypto';
import {
  isEcomtradeFailedStatus,
  isEcomtradePaidStatus,
  parseEcomtradeWebhookPayload,
  verifyEcomtradeWebhookSignature,
} from '../src/services/ecomtrade24Service';

process.env.ECOMTRADE24_WEBHOOK_SECRET = 'test-e24-secret';
process.env.ECOMTRADE24_API_KEY = 'test-key';

const body = Buffer.from(
  JSON.stringify({
    event: 'payment.session',
    session_id: 12345,
    order_id: 'ORDER-1001',
    status: 'paid',
    amount: '99.00',
    currency: 'EUR',
  }),
  'utf8',
);
const goodSig = crypto.createHmac('sha256', 'test-e24-secret').update(body).digest('hex');

assert.strictEqual(verifyEcomtradeWebhookSignature(body, goodSig), true, 'valid HMAC');
assert.strictEqual(verifyEcomtradeWebhookSignature(body, `sha256=${goodSig}`), true, 'sha256= prefix');
assert.strictEqual(verifyEcomtradeWebhookSignature(body, '0'.repeat(goodSig.length)), false, 'wrong HMAC');
assert.strictEqual(verifyEcomtradeWebhookSignature(body, undefined), false, 'missing sig');

const parsed = parseEcomtradeWebhookPayload(body);
assert.strictEqual(parsed.order_id, 'ORDER-1001');
assert.strictEqual(parsed.status, 'paid');
assert.ok(isEcomtradePaidStatus('paid'));
assert.ok(isEcomtradePaidStatus('settled'));
assert.ok(!isEcomtradePaidStatus('pending'));
assert.ok(isEcomtradeFailedStatus('expired'));

console.log('checkEcomtrade24Webhook: ok');
