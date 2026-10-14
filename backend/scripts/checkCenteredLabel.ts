import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mmToPx, renderCenteredLabelPng } from '../src/services/labelRenderService';

async function main(): Promise<void> {
  const render = await renderCenteredLabelPng({
    productName: 'Tirzepatide',
    productSlug: 'tirzepatide',
    dosage: '15 mg',
    batchNumber: 'GP-260526-002',
    storageUnopened: '-20 C',
    storageReconstituted: '2-8 C, 30 days',
    storageNote: 'Keep cool and dry',
    shelfLifeDate: '26-05-2028',
    qrUrl: 'https://gopeptides.nl/products/tirzepatide',
    barcodeText: 'GP260526002',
    labelWidthMm: 40,
    labelHeightMm: 20,
    language: 'en',
  });
  const image = await sharp(render.buffer).metadata();

  assert.equal(image.width, mmToPx(40));
  assert.equal(image.height, mmToPx(20));
  console.log(`Centered label check passed: ${image.width}x${image.height}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
