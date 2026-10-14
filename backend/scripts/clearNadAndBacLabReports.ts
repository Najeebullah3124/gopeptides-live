/**
 * Clear NAD+ and BAC Water lab fields from Product.seoData (client: remove NAD reports; BAC CoA coming later).
 * Usage: npx tsx scripts/clearNadAndBacLabReports.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LAB_KEYS = ['labBatch', 'labTestDate', 'labReportUrl', 'labPurity', 'labContent', 'labTests'] as const;

function isTarget(p: { name: string; slug: string; sku: string }): 'nad' | 'bac' | null {
  const hay = `${p.name} ${p.slug} ${p.sku}`.toLowerCase();
  if (/\bnad\+?\b/.test(hay) || hay.includes('nad-') || hay.includes('nad_') || hay.includes('nad500') || hay.includes('nad1000')) {
    return 'nad';
  }
  if (hay.includes('bac') && (hay.includes('water') || hay.includes('bacwater') || hay.includes('bacteriostatic'))) {
    return 'bac';
  }
  return null;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, sku: true, seoData: true },
  });

  let cleared = 0;
  for (const p of products) {
    const kind = isTarget(p);
    if (!kind) continue;
    let seo: Record<string, unknown> = {};
    try {
      seo = JSON.parse(p.seoData || '{}') as Record<string, unknown>;
    } catch {
      seo = {};
    }
    let changed = false;
    for (const k of LAB_KEYS) {
      if (k in seo) {
        delete seo[k];
        changed = true;
      }
    }
    if (!changed) {
      console.log(`skip (no lab fields): ${kind} ${p.slug}`);
      continue;
    }
    await prisma.product.update({
      where: { id: p.id },
      data: { seoData: JSON.stringify(seo) },
    });
    cleared += 1;
    console.log(`cleared lab fields: ${kind} ${p.slug}`);
  }

  console.log(`clearNadAndBacLabReports: done (${cleared} products)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
