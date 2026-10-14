/**
 * Seed client-provided lab numbers (no scan photos) into Product.seoData.
 * Appears on /labresults as result rows. Preserves existing labReportImages.
 *
 * Dosage-exact where content implies a strength (e.g. Tirz 22.63 → 20mg SKU).
 *
 * Usage: npx tsx scripts/seedLabReportsClientText.ts
 * Prod:  cd /var/www/html/backend && npm run seed:lab-reports-client-text
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Seed = {
  id: string;
  slugExact?: string[];
  match?: {
    skuIncludes?: string[];
    slugIncludes?: string[];
    nameIncludes?: string[];
    excludeSlugIncludes?: string[];
    excludeNameIncludes?: string[];
  };
  labPurity?: string;
  labContent?: string;
  labTests: Array<{ label: string; value: string }>;
};

/** Client batch: title → measured values (photos not provided). */
const SEEDS: Seed[] = [
  {
    id: '5-amino-1mq',
    slugExact: ['5-amino-1mq-50mg'],
    labPurity: '99.58%',
    labContent: '53.22 mg',
    labTests: [
      { label: '5-Amino-1MQ', value: '53.22 mg' },
      { label: 'Purity', value: '99.58%' },
    ],
  },
  {
    id: 'acetic-acid-water',
    slugExact: ['aawater-10ml', 'acetic-acid-water', 'aa-water'],
    match: {
      skuIncludes: ['GP-AA', 'AAWATER', 'AA-10'],
      slugIncludes: ['aawater', 'acetic-acid'],
      nameIncludes: ['Acetic Acid Water'],
    },
    labContent: '10 ml',
    labTests: [
      { label: 'pH test', value: '3.4' },
      { label: 'Identity', value: '0.64%' },
    ],
  },
  {
    id: 'cagrilintide',
    slugExact: ['cagrilintide-5mg'],
    labPurity: '99.34%',
    labContent: '5.56 mg',
    labTests: [
      { label: 'Cagrilintide', value: '5.56 mg' },
      { label: 'Purity', value: '99.34%' },
    ],
  },
  {
    id: 'epithalon',
    slugExact: ['epi-thalon', 'epithalon', 'epitalon-10mg', 'epithalon-10mg'],
    match: {
      skuIncludes: ['EPI', 'EPITH'],
      slugIncludes: ['epi-thalon', 'epithalon', 'epitalon'],
      nameIncludes: ['Epithalon', 'Epitalon'],
    },
    labPurity: '99.45%',
    labContent: '11.24 mg',
    labTests: [
      { label: 'Epithalon', value: '11.24 mg' },
      { label: 'Purity', value: '99.45%' },
    ],
  },
  {
    id: 'ipamorelin',
    slugExact: ['ipa-morelin', 'ipamorelin-10mg', 'ipamorelin'],
    match: {
      skuIncludes: ['GP-IPA', 'IPA-10'],
      slugIncludes: ['ipa-morelin', 'ipamorelin'],
      nameIncludes: ['Ipamorelin'],
      excludeNameIncludes: ['CJC', '+'],
      excludeSlugIncludes: ['cjc'],
    },
    labPurity: '99.41%',
    labContent: '10.75 mg',
    labTests: [
      { label: 'Ipamorelin', value: '10.75 mg' },
      { label: 'Purity', value: '99.41%' },
    ],
  },
  {
    id: 'klow',
    slugExact: ['klow-80mg'],
    labContent: '87.09 mg',
    labTests: [
      { label: 'GHK-Cu', value: '54.45 mg' },
      { label: 'BPC-157', value: '11.34 mg' },
      { label: 'TB-500', value: '9.97 mg' },
      { label: 'KPV', value: '11.33 mg' },
      { label: 'Total content', value: '87.09 mg' },
    ],
  },
  {
    id: 'melanotan',
    slugExact: ['melanotan-10mg', 'melanotan-i', 'melanotan'],
    match: {
      skuIncludes: ['MELA'],
      slugIncludes: ['melanotan'],
      nameIncludes: ['Melanotan'],
    },
    labPurity: '99.53%',
    labContent: '10.96 mg',
    labTests: [
      { label: 'Melanotan', value: '10.96 mg' },
      { label: 'Purity', value: '99.53%' },
    ],
  },
  {
    id: 'pt141',
    slugExact: ['pt141-10mg', 'pt-141-10mg', 'pt141'],
    match: {
      skuIncludes: ['PT141', 'PTP141', 'PT-141'],
      slugIncludes: ['pt141', 'pt-141'],
      nameIncludes: ['PT141', 'PT-141', 'Bremelanotide'],
    },
    labPurity: '99.48%',
    labContent: '10.88 mg',
    labTests: [
      { label: 'PT-141', value: '10.88 mg' },
      { label: 'Purity', value: '99.48%' },
    ],
  },
  // Stored; public /labresults still hides NAD+ via API filter
  {
    id: 'nad',
    slugExact: ['nad-500mg'],
    labContent: '583.86 mg',
    labTests: [{ label: 'NAD+', value: '583.86 mg' }],
  },
  {
    id: 'tesamorelin',
    slugExact: ['tesamorelin-10mg'],
    labPurity: '99.62%',
    labContent: '12.1 mg',
    labTests: [
      { label: 'Tesamorelin', value: '12.1 mg' },
      { label: 'Purity', value: '99.62%' },
    ],
  },
  {
    id: 'tirzepatide',
    slugExact: ['tirzepatide-20mg'],
    labPurity: '99.39%',
    labContent: '22.63 mg',
    labTests: [
      { label: 'Tirzepatide', value: '22.63 mg' },
      { label: 'Purity', value: '99.39%' },
    ],
  },
];

function matchesLoose(
  p: { name: string; slug: string; sku: string },
  m: NonNullable<Seed['match']>,
): boolean {
  const name = p.name.toLowerCase();
  const slug = p.slug.toLowerCase();
  const sku = p.sku.toLowerCase();
  if (m.excludeSlugIncludes?.some((s) => slug.includes(s.toLowerCase()))) return false;
  if (m.excludeNameIncludes?.some((s) => name.includes(s.toLowerCase()))) return false;
  if (m.skuIncludes?.some((s) => sku.includes(s.toLowerCase()))) return true;
  if (m.slugIncludes?.some((s) => slug.includes(s.toLowerCase()))) return true;
  if (m.nameIncludes?.some((s) => name.includes(s.toLowerCase()))) return true;
  return false;
}

function findHits(
  products: Array<{ id: string; name: string; slug: string; sku: string; seoData: string | null }>,
  seed: Seed,
) {
  if (seed.slugExact?.length) {
    const exact = products.filter((p) =>
      seed.slugExact!.some((s) => p.slug.toLowerCase() === s.toLowerCase()),
    );
    if (exact.length) return exact;
  }
  if (seed.match) return products.filter((p) => matchesLoose(p, seed.match!));
  return [];
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, sku: true, seoData: true },
  });

  let ok = 0;
  let miss = 0;

  for (const seed of SEEDS) {
    const hits = findHits(products, seed);
    if (!hits.length) {
      console.error('NO MATCH', seed.id);
      miss++;
      continue;
    }

    for (const p of hits) {
      let seo: Record<string, unknown> = {};
      try {
        seo = JSON.parse(p.seoData || '{}') as Record<string, unknown>;
      } catch {
        seo = {};
      }

      seo.labTests = seed.labTests;
      if (seed.labPurity) seo.labPurity = seed.labPurity;
      if (seed.labContent) seo.labContent = seed.labContent;
      // Don't point at broken Janoshik /verify homepage
      if (
        !seo.labReportUrl ||
        String(seo.labReportUrl).includes('janoshik.com/verify')
      ) {
        const imgs = Array.isArray(seo.labReportImages)
          ? (seo.labReportImages as string[])
          : [];
        if (imgs[0]) seo.labReportUrl = imgs[0];
        else delete seo.labReportUrl;
      }

      await prisma.product.update({
        where: { id: p.id },
        data: { seoData: JSON.stringify(seo) },
      });
      console.log('OK', seed.id, '→', p.sku || p.slug);
      ok++;
    }
  }

  console.log(`Done: ${ok} updated, ${miss} unmatched`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
