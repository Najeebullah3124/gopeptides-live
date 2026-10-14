/**
 * Assert seeded products expose labReportImages paths that exist under frontend-build/public.
 * ponytail: filesystem check only — fails if seed/matcher broke or PNG missing from public/.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const publicRoot = path.resolve(__dirname, '../../frontend-build/public');

async function main() {
  const products = await prisma.product.findMany({
    select: { name: true, slug: true, sku: true, seoData: true },
  });

  let withImages = 0;
  let missingFiles = 0;

  for (const p of products) {
    let seo: Record<string, unknown> = {};
    try {
      seo = JSON.parse(p.seoData || '{}') as Record<string, unknown>;
    } catch {
      continue;
    }
    const imgs = Array.isArray(seo.labReportImages) ? (seo.labReportImages as string[]) : [];
    if (!imgs.length) continue;
    withImages++;
    for (const url of imgs) {
      if (typeof url !== 'string' || !url.startsWith('/')) {
        console.error('BAD URL', p.sku, url);
        missingFiles++;
        continue;
      }
      const file = path.join(publicRoot, url.replace(/^\//, ''));
      if (!fs.existsSync(file)) {
        console.error('MISSING FILE', p.sku, file);
        missingFiles++;
      }
    }
    // Blend must not steal pure CoAs
    if (/WOLF/i.test(p.sku) && imgs.some((u) => /bpc-157-purity|tb-500-purity/.test(u))) {
      console.error('BLEND FALSE MATCH', p.sku, imgs);
      missingFiles++;
    }
  }

  console.log(`Products with labReportImages: ${withImages}`);
  if (missingFiles) {
    console.error(`FAIL: ${missingFiles} issue(s)`);
    process.exit(1);
  }
  console.log('OK');
}

main().finally(() => prisma.$disconnect());
