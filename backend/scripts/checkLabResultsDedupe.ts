import assert from 'node:assert/strict';
import { dedupeLabResultCards } from '../src/services/labResultsDedupe';

const cards = [
  {
    slug: 'retatrutide-10mg',
    name: 'Retatrutide',
    sku: 'GP-RETA-10MG',
    batch: 'GP-260522-001',
    testDate: '22-05-2026',
    reportUrl: null,
    reportImages: ['/photos/reports/retatrutide-purity.png'],
    tests: [{ label: 'Purity', value: '>99%' }],
  },
  {
    slug: 'retatrutide-30mg',
    name: 'Retatrutide',
    sku: 'GP-RETA-30MG',
    batch: 'GP-RETA-30MG',
    testDate: null,
    reportUrl: null,
    reportImages: ['/photos/reports/retatrutide-purity.png'],
    tests: [],
  },
  {
    slug: 'bpc157-tb500-wolf-10mg',
    name: 'BPC-157 + TB-500',
    sku: 'GP-WOLF-10MG',
    batch: 'GP-260518-002',
    testDate: '18-05-2026',
    reportUrl: null,
    reportImages: ['/photos/reports/bpc-157-tb-500-wolverine-5mg-5mg.png'],
    tests: [{ label: 'BPC-157', value: '6.12 mg' }],
  },
  {
    slug: 'bpc157-tb500-wolf-20mg',
    name: 'BPC-157 + TB-500',
    sku: 'GP-WOLF-20MG',
    batch: 'GP-260518-002',
    testDate: '18-05-2026',
    reportUrl: null,
    reportImages: ['/photos/reports/bpc-157-tb-500-wolverine-5mg-5mg.png'],
    tests: [{ label: 'BPC-157', value: '6.12 mg' }],
  },
  {
    slug: 'bac-water-3-ml',
    name: 'BAC water',
    sku: 'GP-BACW-3ML',
    batch: 'GP-260526-005',
    testDate: '26-05-2026',
    reportUrl: null,
    reportImages: ['/photos/reports/bac-water-benzyl-alcohol.png'],
    tests: [{ label: 'Benzyl Alcohol', value: '9.05 mg/ml' }],
  },
  {
    slug: 'genetek-bac-water-10-ml',
    name: 'Genetek BAC water',
    sku: 'GP-BACW-GT-10ML',
    batch: 'GP-BACW-GT-10ML',
    testDate: null,
    reportUrl: null,
    reportImages: [],
    tests: [{ label: 'Identity', value: 'pass' }],
  },
];

const out = dedupeLabResultCards(cards);
assert.equal(out.length, 4);
assert.equal(out.filter((c) => c.name === 'Retatrutide').length, 1);
assert.equal(out.find((c) => c.name === 'Retatrutide')?.slug, 'retatrutide-10mg');
assert.deepEqual(out.find((c) => c.name === 'Retatrutide')?.familySlugs.sort(), [
  'retatrutide-10mg',
  'retatrutide-30mg',
]);
assert.equal(out.filter((c) => c.name === 'BPC-157 + TB-500').length, 1);
assert.equal(out.filter((c) => c.name === 'BAC water').length, 1);
assert.equal(out.filter((c) => c.name === 'Genetek BAC water').length, 1);
console.log('checkLabResultsDedupe: ok');
