import assert from 'node:assert/strict';
import { EXPRESS_EU_FEE, quoteExpressEu } from '../src/config/expressEu';

assert.equal(quoteExpressEu('Netherlands', 80, true).surcharge, 0);
assert.equal(quoteExpressEu('NL', 500, true).eligible, false);
assert.equal(quoteExpressEu('Germany', 80, false).surcharge, 0);
assert.equal(quoteExpressEu('Germany', 80, true).surcharge, EXPRESS_EU_FEE);
assert.equal(quoteExpressEu('Deutschland', 80, true).applied, true);
assert.equal(quoteExpressEu('Belgium', 450, false).surcharge, 0);
assert.equal(quoteExpressEu('Belgium', 450, false).included, true);
assert.equal(quoteExpressEu('Belgium', 450, false).applied, true);
assert.equal(quoteExpressEu('Switzerland', 100, true).surcharge, EXPRESS_EU_FEE);
assert.equal(quoteExpressEu('United States', 100, true).eligible, false);
assert.equal(quoteExpressEu('United States', 100, true).surcharge, 0);
console.log('checkExpressEu: ok');
