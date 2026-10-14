/**
 * Attach Janoshik (and related) lab-report PNG paths into Product.seoData.labReportImages.
 * Dosage-exact: only the SKU that matches the CoA sample strength gets the photo.
 * NAD+ stays excluded from /labresults list (API filter) — image path still stored if matched.
 *
 * Images: frontend-build/public/photos/reports/*.png → URL /photos/reports/...
 *
 * Usage: npx tsx scripts/seedLabReportImages.ts
 * Prod:  upload PNGs to /var/www/html/frontend/photos/reports/ then run on server DB.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = '/photos/reports';

type ImageSeed = {
  id: string;
  /** Prefer exact slug(s) when set — dosage-perfect CoA attach. */
  slugExact?: string[];
  match?: {
    skuIncludes?: string[];
    slugIncludes?: string[];
    nameIncludes?: string[];
    excludeSlugIncludes?: string[];
    excludeNameIncludes?: string[];
    excludeSkuIncludes?: string[];
  };
  images: string[];
  lab?: {
    labBatch: string;
    labTestDate: string;
    labContent?: string;
    labPurity?: string;
    labTests: Array<{ label: string; value: string }>;
  };
};

/** Sample strength on each CoA → only that catalog slug. */
const SEEDS: ImageSeed[] = [
  {
    id: 'bac-water',
    slugExact: ['bac-water', 'bac-water-3ml', 'bacteriostatic-water'],
    match: {
      skuIncludes: ['BAC', 'BACWATER'],
      slugIncludes: ['bac-water', 'bacwater', 'bacteriostatic'],
      nameIncludes: ['Bac Water', 'BAC Water', 'Bacteriostatic'],
    },
    images: [`${BASE}/bac-water-benzyl-alcohol.png`],
    lab: {
      labBatch: 'GP-260526-005',
      labTestDate: '21-07-2026',
      labContent: '3 ml',
      labTests: [
        { label: 'Benzyl Alcohol', value: '9.05 mg/ml' },
        { label: 'Janoshik key', value: '1ZDADVRAUK8A' },
        { label: 'Task', value: '#209082' },
      ],
    },
  },
  {
    id: 'bpc-157',
    slugExact: ['bpc-157-10mg'],
    images: [`${BASE}/bpc-157-purity.png`],
  },
  {
    id: 'cjc-ipa',
    slugExact: ['cjc1295-ipamorelin-5mg'],
    images: [`${BASE}/cjc-1295-ipamorelin-blend.png`],
  },
  {
    id: 'ghk-cu',
    slugExact: ['ghk-cu-50mg'],
    images: [
      `${BASE}/ghk-cu-purity.png`,
      `${BASE}/ghk-cu-heavy-metal.png`,
      `${BASE}/ghk-cu-endotoxin.png`,
    ],
  },
  {
    id: 'mots-c',
    slugExact: ['mots-c-10mg'],
    images: [
      `${BASE}/mots-c-purity.png`,
      `${BASE}/mots-c-heavy-metal.png`,
      `${BASE}/mots-c-endotoxin.png`,
    ],
  },
  {
    id: 'retatrutide',
    slugExact: ['retatrutide-20mg'],
    images: [
      `${BASE}/retatrutide-purity.png`,
      `${BASE}/retatrutide-heavy-metal.png`,
      `${BASE}/retatrutide-endotoxin.png`,
    ],
  },
  {
    id: 'selank',
    slugExact: ['selank-10mg'],
    images: [`${BASE}/selank-purity.png`],
  },
  {
    id: 'semax',
    slugExact: ['semax-10mg'],
    images: [`${BASE}/semax-purity.png`],
  },
  {
    id: 'ss-31',
    slugExact: ['ss-31-10mg'],
    images: [`${BASE}/ss-31-purity.png`],
  },
  {
    id: 'tb-500',
    slugExact: ['tb-500-10mg'],
    images: [`${BASE}/tb-500-purity.png`],
  },
  // CoA sample "GLOW 70mg"; catalog currently has glow-50mg only — attach there + lab text 70mg.
  {
    id: 'glow',
    slugExact: ['glow-70mg', 'glow-50mg'],
    match: {
      skuIncludes: ['GLOW'],
      slugIncludes: ['glow'],
      nameIncludes: ['GLOW', 'Glow'],
      excludeNameIncludes: ['KLOW'],
    },
    images: [`${BASE}/glow-70mg.png`],
    lab: {
      labBatch: 'GP-260605-001',
      labTestDate: '28-07-2026',
      labContent: '70 mg',
      labTests: [
        { label: 'GHK-Cu (GHK) [Cu]', value: '53.19 mg (46.59) [6.60]' },
        { label: 'TB-500 (TB4)', value: '10.94 mg' },
        { label: 'BPC-157', value: '11.36 mg' },
        { label: 'Janoshik key', value: 'W7MEWTIYJS6P' },
        { label: 'Task', value: '#209078' },
      ],
    },
  },
  // Wolverine stack CoA is 5+5mg — not 10+10
  {
    id: 'wolverine',
    slugExact: ['bpc157-tb500-wolf-10mg'],
    images: [`${BASE}/bpc-157-tb-500-wolverine-5mg-5mg.png`],
    lab: {
      labBatch: 'GP-260518-002',
      labTestDate: '27-07-2026',
      labContent: '5 mg + 5 mg',
      labTests: [
        { label: 'BPC-157', value: '6.12 mg' },
        { label: 'TB-500 (TB4)', value: '5.67 mg' },
        { label: 'Janoshik key', value: '7LNSNLSWCMZ7' },
        { label: 'Task', value: '#208092' },
      ],
    },
  },
  {
    id: 'nad',
    slugExact: ['nad-500mg'],
    images: [`${BASE}/nad-plus.png`],
  },
];

function matchesLoose(
  p: { name: string; slug: string; sku: string },
  m: NonNullable<ImageSeed['match']>,
): boolean {
  const name = p.name.toLowerCase();
  const slug = p.slug.toLowerCase();
  const sku = p.sku.toLowerCase();
  if (m.excludeSkuIncludes?.some((s) => sku.includes(s.toLowerCase()))) return false;
  if (m.excludeSlugIncludes?.some((s) => slug.includes(s.toLowerCase()))) return false;
  if (m.excludeNameIncludes?.some((s) => name.includes(s.toLowerCase()))) return false;
  if (m.skuIncludes?.some((s) => sku.includes(s.toLowerCase()))) return true;
  if (m.slugIncludes?.some((s) => slug.includes(s.toLowerCase()))) return true;
  if (m.nameIncludes?.some((s) => name.includes(s.toLowerCase()))) return true;
  return false;
}

function findHits(
  products: Array<{ id: string; name: string; slug: string; sku: string; seoData: string | null }>,
  seed: ImageSeed,
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

async function stripLabImages(
  p: { id: string; sku: string; seoData: string | null },
  reason: string,
) {
  let seo: Record<string, unknown> = {};
  try {
    seo = JSON.parse(p.seoData || '{}') as Record<string, unknown>;
  } catch {
    return;
  }
  if (!Array.isArray(seo.labReportImages) || !seo.labReportImages.length) return;
  delete seo.labReportImages;
  if (typeof seo.labReportUrl === 'string' && String(seo.labReportUrl).includes('/photos/reports/')) {
    delete seo.labReportUrl;
  }
  await prisma.product.update({
    where: { id: p.id },
    data: { seoData: JSON.stringify(seo) },
  });
  console.log('CLEARED', reason, p.sku);
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, sku: true, seoData: true },
  });

  const keepIds = new Set<string>();
  for (const seed of SEEDS) {
    for (const p of findHits(products, seed)) keepIds.add(p.id);
  }

  // Remove photos from wrong dosages / blends left by older family seed
  for (const p of products) {
    if (keepIds.has(p.id)) continue;
    await stripLabImages(p, 'non-exact-dosage');
  }

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
      seo.labReportImages = seed.images;
      if (seed.lab) {
        seo.labBatch = seed.lab.labBatch;
        seo.labTestDate = seed.lab.labTestDate;
        if (seed.lab.labContent) seo.labContent = seed.lab.labContent;
        if (seed.lab.labPurity) seo.labPurity = seed.lab.labPurity;
        seo.labTests = seed.lab.labTests;
        seo.labReportUrl = seed.images[0];
      } else if (!seo.labReportUrl || String(seo.labReportUrl).includes('janoshik.com/verify')) {
        seo.labReportUrl = seed.images[0];
      }

      await prisma.product.update({
        where: { id: p.id },
        data: { seoData: JSON.stringify(seo) },
      });
      console.log('OK', seed.id, p.sku || p.slug, '→', seed.images.length, 'image(s)');
      ok++;
    }
  }

  console.log(`Done: ${ok} product rows updated, ${miss} seed groups unmatched`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
