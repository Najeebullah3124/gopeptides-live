/**
 * Attach the real Janoshik BAC water 3ml CoA to the matching live SKU only.
 * Source: photos/reports/bac-water-benzyl-alcohol.png (sample "BAC water 3ml").
 * Does not invent purity or attach to 10ml / Genetek SKUs.
 *
 * Usage: npx tsx scripts/attachBacWaterCoa.ts
 */
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';

const prisma = new PrismaClient();

const SLUG = 'bac-water-3-ml';
const SKU = 'GP-BACW-3ML';
const IMAGE = '/photos/reports/bac-water-benzyl-alcohol.png';

/** Fields read from the Janoshik CoA scan — nothing else. */
const COA = {
  labBatch: 'GP-260526-005',
  labTestDate: '21-07-2026',
  labContent: '3 ml',
  labTests: [
    { label: 'Benzyl Alcohol', value: '9.05 mg/ml' },
    { label: 'Janoshik key', value: '1ZDADVRAUK8A' },
    { label: 'Task', value: '#209082' },
  ],
};

async function main() {
  const p = await prisma.product.findFirst({
    where: { OR: [{ slug: SLUG }, { sku: SKU }] },
    select: { id: true, slug: true, sku: true, name: true, weight: true, seoData: true },
  });
  if (!p) {
    throw new Error(`No product ${SLUG} / ${SKU}`);
  }
  assert.equal(p.slug, SLUG, 'refusing: slug is not the 3ml SKU');
  assert.equal(p.sku, SKU, 'refusing: sku mismatch');

  let seo: Record<string, unknown> = {};
  try {
    seo = JSON.parse(p.seoData || '{}') as Record<string, unknown>;
  } catch {
    seo = {};
  }

  seo.labBatch = COA.labBatch;
  seo.labTestDate = COA.labTestDate;
  seo.labContent = COA.labContent;
  seo.labTests = COA.labTests;
  seo.labReportImages = [IMAGE];
  delete seo.labPurity;
  delete seo.labReportUrl;

  await prisma.product.update({
    where: { id: p.id },
    data: { seoData: JSON.stringify(seo) },
  });
  console.log(`attachBacWaterCoa: ok ${p.slug} ${p.sku}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
