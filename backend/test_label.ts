import { renderTiffLabelPng } from './src/services/labelRenderService';
import fs from 'fs';

async function main() {
  const payload = {
    productName: '5-Amino-1MQ',
    productSlug: '5-amino-1mq',
    dosage: '45 mg',
    batchNumber: 'GP-260605-003',
    barcodeText: 'GP-260605-003',
    qrUrl: 'https://gopeptides.nl',
    labelWidthMm: 80,
    labelHeightMm: 40,
    language: 'nl'
  };

  const { buffer } = await renderTiffLabelPng(payload as any);
  const outPath = '../preview-label.png';
  fs.writeFileSync(outPath, buffer);
  console.log('Saved to', outPath);
}

main().catch(console.error);
