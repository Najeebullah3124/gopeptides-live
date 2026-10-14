import assert from 'node:assert/strict';
import { makeProductSlug } from '../src/services/seoToolkitService';

assert.equal(makeProductSlug('Tirzepatide', '15 mg'), 'tirzepatide-15mg');
assert.equal(makeProductSlug('BPC-157 + TB-500', '10+10 mg'), 'bpc-157-tb-500-10-10mg');
console.log('Product slug checks passed.');
