import type { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { BRAND_IMAGE_BY_SLUG } from '../../src/services/labelBrandImageMap';

type QrMode = 'auto' | 'manual' | 'csv';

interface LabelSeedRow {
  product: string;
  dosage: string;
  batchNumber: string;
  storageUnopened: string;
  storageReconstituted: string;
  storageNote: string;
  shelfLifeDate: string;
}

const LABEL_ROWS: LabelSeedRow[] = [
  { product: '5-Amino-1MQ', dosage: '50 mg', batchNumber: 'GP-260605-003', storageUnopened: '−20°C, droog en donker', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '05-06-2028' },
  { product: 'BPC-157', dosage: '10 mg', batchNumber: 'GP-260518-001', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '18-05-2028' },
  { product: 'BPC-157+TB500', dosage: '5+5 mg', batchNumber: 'GP-260518-002', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '18-05-2028' },
  { product: 'BPC-157+TB500', dosage: '10+10 mg', batchNumber: 'GP-260518-003', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '18-05-2028' },
  { product: 'Cagrilintide', dosage: '5 mg', batchNumber: 'GP-260520-001', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '20-05-2028' },
  { product: 'Cagrilintide', dosage: '10 mg', batchNumber: 'GP-260520-002', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '20-05-2028' },
  { product: 'CJC-1295+Ipamorelin', dosage: '5+5 mg', batchNumber: 'GP-260528-001', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '28-05-2028' },
  { product: 'CJC-1295+Ipamorelin', dosage: '10+10 mg', batchNumber: 'GP-260528-002', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '28-05-2028' },
  { product: 'GHK-Cu', dosage: '50 mg', batchNumber: 'GP-260603-001', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, donker, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-06-2028' },
  { product: 'GHK-Cu', dosage: '100 mg', batchNumber: 'GP-260603-002', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, donker, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-06-2028' },
  { product: 'Glow', dosage: '50 mg', batchNumber: 'GP-260605-001', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, donker, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '05-06-2028' },
  { product: 'KLOW', dosage: '80 mg', batchNumber: 'GP-260605-002', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, donker, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '05-06-2028' },
  { product: 'Mots-C', dosage: '5 mg', batchNumber: 'GP-260603-004', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-06-2028' },
  { product: 'Mots-C', dosage: '10 mg', batchNumber: 'GP-260603-005', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-06-2028' },
  { product: 'NAD+', dosage: '500 mg', batchNumber: 'GP-260603-006', storageUnopened: '−20°C, donker, luchtdicht', storageReconstituted: '2-8°C, donker, binnen 3-5 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-12-2027' },
  { product: 'NAD+', dosage: '1000 mg', batchNumber: 'GP-260603-007', storageUnopened: '−20°C, donker, luchtdicht', storageReconstituted: '2-8°C, donker, binnen 3-5 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-12-2027' },
  { product: 'Retatrutide', dosage: '10 mg', batchNumber: 'GP-260522-001', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '22-05-2028' },
  { product: 'Retatrutide', dosage: '15 mg', batchNumber: 'GP-260522-002', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '22-05-2028' },
  { product: 'Retatrutide', dosage: '20 mg', batchNumber: 'GP-260522-003', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '22-05-2028' },
  { product: 'Retatrutide', dosage: '30 mg', batchNumber: 'GP-260522-004', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '22-05-2028' },
  { product: 'Retatrutide', dosage: '60 mg', batchNumber: 'GP-260522-005', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '22-05-2028' },
  { product: 'Selank', dosage: '10 mg', batchNumber: 'GP-260601-001', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '01-06-2028' },
  { product: 'Semax', dosage: '5 mg', batchNumber: 'GP-260601-002', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '01-06-2028' },
  { product: 'Semax', dosage: '10 mg', batchNumber: 'GP-260601-003', storageUnopened: '−20°C, donker', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '01-06-2028' },
  { product: 'SS-31', dosage: '10 mg', batchNumber: 'GP-260603-003', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 21 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '03-06-2028' },
  { product: 'TB-500', dosage: '10 mg', batchNumber: 'GP-260518-004', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '18-05-2028' },
  { product: 'Tesamorelin', dosage: '5 mg', batchNumber: 'GP-260528-003', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '28-05-2028' },
  { product: 'Tesamorelin', dosage: '10 mg', batchNumber: 'GP-260528-004', storageUnopened: '−20°C', storageReconstituted: '2-8°C, binnen 14 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '28-05-2028' },
  { product: 'Tirzepatide', dosage: '10 mg', batchNumber: 'GP-260526-001', storageUnopened: '−20°C (of 2-8°C kortdurend)', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '26-05-2028' },
  { product: 'Tirzepatide', dosage: '15 mg', batchNumber: 'GP-260526-002', storageUnopened: '−20°C (of 2-8°C kortdurend)', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '26-05-2028' },
  { product: 'Tirzepatide', dosage: '20 mg', batchNumber: 'GP-260526-003', storageUnopened: '−20°C (of 2-8°C kortdurend)', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '26-05-2028' },
  { product: 'Tirzepatide', dosage: '30 mg', batchNumber: 'GP-260526-004', storageUnopened: '−20°C (of 2-8°C kortdurend)', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '26-05-2028' },
  { product: 'Tirzepatide', dosage: '60 mg', batchNumber: 'GP-260526-005', storageUnopened: '−20°C (of 2-8°C kortdurend)', storageReconstituted: '2-8°C, binnen 30 dagen gebruiken', storageNote: 'Koel en droog bewaren', shelfLifeDate: '26-05-2028' },
];

const SLUG_OVERRIDES: Record<string, string> = {
  '5-amino-1mq|50mg': '5-amino-1mq-50mg',
  'bpc-157|10mg': 'bpc-157-10mg',
  'bpc-157+tb500|5+5mg': 'bpc157-tb500-wolf-10mg',
  'bpc-157+tb500|10+10mg': 'bpc157-tb500-wolf-20mg',
  'cagrilintide|5mg': 'cagrilintide-5mg',
  'cagrilintide|10mg': 'cagrilintide-10mg',
  'cjc-1295+ipamorelin|5+5mg': 'cjc1295-ipamorelin-5mg',
  'cjc-1295+ipamorelin|10+10mg': 'cjc1295-ipamorelin-10mg',
  'ghk-cu|50mg': 'ghk-cu-50mg',
  'ghk-cu|100mg': 'ghk-cu-100mg',
  'glow|50mg': 'glow-50mg',
  'klow|80mg': 'klow-80mg',
  'mots-c|5mg': 'mots-c-5mg',
  'mots-c|10mg': 'mots-c-10mg',
  'nad+|500mg': 'nad-500mg',
  'nad+|1000mg': 'nad-1000mg',
  'retatrutide|10mg': 'retatrutide-10mg',
  'retatrutide|15mg': 'retatrutide-15mg',
  'retatrutide|20mg': 'retatrutide-20mg',
  'retatrutide|30mg': 'retatrutide-30mg',
  'retatrutide|60mg': 'retatrutide-60mg',
  'selank|10mg': 'selank-10mg',
  'semax|5mg': 'semax-5mg',
  'semax|10mg': 'semax-10mg',
  'ss-31|10mg': 'ss-31-10mg',
  'tb-500|10mg': 'tb-500-10mg',
  'tesamorelin|5mg': 'tesamorelin-5mg',
  'tesamorelin|10mg': 'tesamorelin-10mg',
  'tirzepatide|10mg': 'tirzepatide-10mg',
  'tirzepatide|15mg': 'tirzepatide-15mg',
  'tirzepatide|20mg': 'tirzepatide-20mg',
  'tirzepatide|30mg': 'tirzepatide-30mg',
  'tirzepatide|60mg': 'tirzepatide-60mg',
};

function normalizeProductName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '')
    .replace(/[()]/g, '')
    .replace(/blend/g, '')
    .replace(/wolverine/g, '')
    .replace(/\+/g, '+');
}

function normalizeDosage(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/mg/g, 'mg');
}

function makeSlugKey(product: string, dosage: string): string {
  return `${normalizeProductName(product)}|${normalizeDosage(dosage)}`;
}

function formatWeight(value: string): string {
  const compact = value.toLowerCase().replace(/\s+/g, '');
  if (compact.includes('+')) {
    return compact
      .split('+')
      .map((part) => part.replace('mg', ''))
      .map((part) => `${part} mg`)
      .join('+');
  }
  return `${compact.replace('mg', '')} mg`;
}

function getLabelSize(productName: string): { width: number; height: number } {
  return normalizeProductName(productName) === 'nad+' ? { width: 30, height: 60 } : { width: 40, height: 20 };
}

export async function seedLabelMetadata(prisma: PrismaClient): Promise<void> {
  const projectRoot = path.resolve(process.cwd(), '..');
  const brandImagesDir = path.join(projectRoot, 'new-brand-images');

  const warnings: string[] = [];

  for (const row of LABEL_ROWS) {
    const slug = SLUG_OVERRIDES[makeSlugKey(row.product, row.dosage)];
    if (!slug) {
      warnings.push(`No slug mapping for ${row.product} ${row.dosage}`);
      continue;
    }

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      warnings.push(`Product not found for slug ${slug}`);
      continue;
    }

    const imageFileName = BRAND_IMAGE_BY_SLUG[slug] || null;
    if (imageFileName) {
      const candidate = path.join(brandImagesDir, imageFileName);
      if (!fs.existsSync(candidate)) {
        warnings.push(`Image missing for ${slug}: ${imageFileName}`);
      }
    } else {
      warnings.push(`No image mapping for ${slug}`);
    }

    const { width, height } = getLabelSize(row.product);

    await prisma.labelVariant.upsert({
      where: {
        productId_dosage: {
          productId: product.id,
          dosage: row.dosage,
        },
      },
      update: {
        batchNumber: row.batchNumber,
        storageUnopened: row.storageUnopened,
        storageReconstituted: row.storageReconstituted,
        storageNote: row.storageNote,
        shelfLifeDate: row.shelfLifeDate,
        languageDefault: 'nl',
        labelWidthMm: width,
        labelHeightMm: height,
        qrMode: 'auto' as QrMode,
        imageFileName,
      },
      create: {
        productId: product.id,
        dosage: row.dosage,
        batchNumber: row.batchNumber,
        storageUnopened: row.storageUnopened,
        storageReconstituted: row.storageReconstituted,
        storageNote: row.storageNote,
        shelfLifeDate: row.shelfLifeDate,
        languageDefault: 'nl',
        labelWidthMm: width,
        labelHeightMm: height,
        qrMode: 'auto',
        imageFileName,
      },
    });

    // Keep product-level storage coherent with the variant seed source.
    await prisma.product.update({
      where: { id: product.id },
      data: {
        storage: `${row.storageUnopened}. ${row.storageReconstituted}. ${row.storageNote}`,
        weight: formatWeight(row.dosage),
      },
    });
  }

  if (warnings.length > 0) {
    console.warn('[label-seed] Completed with warnings:');
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }
}

