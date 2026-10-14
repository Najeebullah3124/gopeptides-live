/**
 * Runnable check for Wallid webhook HMAC + payload parsing (official Woo contract).
 * Run: npx tsx scripts/checkWallidWebhook.ts
 */
import assert from 'assert';
import crypto from 'crypto';
import {
  parseWallidWebhookPayload,
  verifyWallidWebhookSignature,
} from '../src/services/wallidService';
import { resolveWallidClientBase } from '../src/config/wallid';

process.env.WALLID_KEY_SECRET = 'test-terminal-secret';

const body = Buffer.from(JSON.stringify({ status: 'paid', order_id: 'GP-TEST-1', amount: 12.5 }), 'utf8');
const goodSig = crypto.createHmac('sha256', 'test-terminal-secret').update(body).digest('hex');

assert.strictEqual(verifyWallidWebhookSignature(body, goodSig), true, 'valid HMAC must pass');
assert.strictEqual(verifyWallidWebhookSignature(body, '0'.repeat(goodSig.length)), false, 'wrong HMAC must fail');
assert.strictEqual(verifyWallidWebhookSignature(body, undefined), false, 'missing sig must fail');

const parsed = parseWallidWebhookPayload(body);
assert.strictEqual(parsed.status, 'paid');
assert.strictEqual(parsed.order_id, 'GP-TEST-1');

assert.strictEqual(resolveWallidClientBase('http://localhost:5173', 'https://gopeptides.nl'), 'http://localhost:5173');
assert.strictEqual(resolveWallidClientBase('https://evil.example', 'https://gopeptides.nl'), 'https://gopeptides.nl');
assert.strictEqual(resolveWallidClientBase('https://gopeptides.de', 'https://gopeptides.nl'), 'https://gopeptides.de');

console.log('checkWallidWebhook: ok');
