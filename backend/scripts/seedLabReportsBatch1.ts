/**
 * Apply Janoshik lab report fields into Product.seoData on the DB this script connects to.
 * Production: run ON the server inside /var/www/html/backend → live /labresults updates (no frontend rebuild).
 *
 * Usage: npx tsx scripts/seedLabReportsBatch1.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const VERIFY = 'https://www.janoshik.com/verify/';

type LabTest = { label: string; value: string; url?: string };

type ReportSeed = {
  id: string;
  match: { skuIncludes?: string[]; slugIncludes?: string[]; nameIncludes?: string[] };
  labBatch: string;
  labTestDate: string;
  labReportUrl: string;
  labPurity?: string;
  labContent?: string;
  labTests: LabTest[];
};

const REPORTS: ReportSeed[] = [
  {
    id: 'cjc-5-5',
    match: {
      skuIncludes: ['CJCIPA-5MG', 'CJCIPA'],
      slugIncludes: ['cjc-1295-ipamorelin-5', 'cjc1295-ipamorelin-5'],
      nameIncludes: ['CJC-1295'],
    },
    labBatch: 'GP-260528-001',
    labTestDate: '27-07-2026',
    labReportUrl: VERIFY,
    labContent: '5+5 mg',
    labTests: [
      { label: 'Ipamorelin', value: '5.72 mg', url: VERIFY },
      { label: 'CJC-1295 (mod GRF 1-29)', value: '5.39 mg', url: VERIFY },
      { label: 'Janoshik key (blend)', value: 'VPZMPVD6NYFF', url: VERIFY },
    ],
  },
  {
    id: 'bpc-10',
    match: {
      skuIncludes: ['BPC157-10MG', 'BPC-157-10', 'BPC157'],
      slugIncludes: ['bpc-157-10mg'],
      nameIncludes: ['BPC-157'],
    },
    labBatch: 'GP-260518-001',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.581%',
    labContent: '11.65 mg',
    labTests: [
      { label: 'BPC-157 content', value: '11.65 mg', url: VERIFY },
      { label: 'Purity', value: '99.581%', url: VERIFY },
      { label: 'Janoshik key', value: 'KQ71TC5W33GM', url: VERIFY },
    ],
  },
  // Client: NAD+ removed from labresults; BAC Water CoA will be replaced — do not re-seed bac/nad until new report arrives.
  {
    id: 'ghk-50',
    // purity + heavy metals + endotoxin (same batch)
    match: {
      skuIncludes: ['GHKCU-50', 'GHK-CU-50', 'GHK-50'],
      slugIncludes: ['ghk-cu-50mg'],
      nameIncludes: ['GHK-Cu', 'GHK-CU'],
    },
    labBatch: 'GP-260603-001',
    labTestDate: '24-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.817%',
    labContent: '55.24 mg',
    labTests: [
      { label: 'GHK-Cu content', value: '55.24 mg (GHK 45.83 + Cu 9.41)', url: VERIFY },
      { label: 'Purity', value: '99.817%', url: VERIFY },
      { label: 'Janoshik key (purity)', value: 'S386VZ8ULZL9', url: VERIFY },
      { label: 'Heavy metals (As/Cd/Pb/Hg)', value: 'not detected', url: VERIFY },
      { label: 'Janoshik key (metals)', value: 'YLQW73YAAW7H', url: VERIFY },
      { label: 'Endotoxin', value: '5.063 EU/Vial', url: VERIFY },
      { label: 'Janoshik key (endotoxin)', value: '555A5SHXZ5QN', url: VERIFY },
    ],
  },
  {
    id: 'mots-10',
    // purity + heavy metals + endotoxin
    match: {
      skuIncludes: ['MOTS-10', 'MOTSC-10', 'MOTS-C-10'],
      slugIncludes: ['mots-c-10mg', 'mots-c-10'],
      nameIncludes: ['MOTS-C', 'Mots-C', 'MOTS-c'],
    },
    labBatch: 'GP-260603-005',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.336%',
    labContent: '11.07 mg',
    labTests: [
      { label: 'MOTS-C content', value: '11.07 mg', url: VERIFY },
      { label: 'Purity', value: '99.336%', url: VERIFY },
      { label: 'Janoshik key (purity)', value: 'RIIYYCXRRGDX', url: VERIFY },
      { label: 'Heavy metals (As/Cd/Pb/Hg)', value: 'not detected', url: VERIFY },
      { label: 'Janoshik key (metals)', value: 'CXTJ14DJB9TJ', url: VERIFY },
      { label: 'Endotoxin', value: '0.938 EU/Vial', url: VERIFY },
      { label: 'Janoshik key (endotoxin)', value: 'J2LV536BYZ31', url: VERIFY },
    ],
  },
  {
    id: 'tb500-10',
    match: {
      skuIncludes: ['TB500-10', 'TB-500-10', 'TB500'],
      slugIncludes: ['tb-500-10mg', 'tb-500'],
      nameIncludes: ['TB-500', 'TB500'],
    },
    labBatch: 'GP-260518-004',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.240%',
    labContent: '11.21 mg',
    labTests: [
      { label: 'TB-500 (TB4)', value: '11.21 mg', url: VERIFY },
      { label: 'Purity', value: '99.240%', url: VERIFY },
      { label: 'Janoshik key', value: 'KJ7FGVW9AQNC', url: VERIFY },
    ],
  },
  {
    id: 'selank-10',
    match: {
      skuIncludes: ['SELANK-10', 'SEL-10'],
      slugIncludes: ['selank-10mg', 'selank-10'],
      nameIncludes: ['Selank'],
    },
    labBatch: 'GP-260601-001',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.704%',
    labContent: '11.10 mg',
    labTests: [
      { label: 'Selank', value: '11.10 mg', url: VERIFY },
      { label: 'Purity', value: '99.704%', url: VERIFY },
      { label: 'Janoshik key', value: '9YEB5BQCSRPG', url: VERIFY },
    ],
  },
  {
    id: 'ss31-10',
    match: {
      skuIncludes: ['SS-31-10', 'SS31-10', 'ELAMI'],
      slugIncludes: ['ss-31-10mg', 'ss-31'],
      nameIncludes: ['SS-31', 'Elamipretide'],
    },
    labBatch: 'GP-260603-003',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.771%',
    labContent: '9.83 mg',
    labTests: [
      { label: 'SS-31 (Elamipretide)', value: '9.83 mg', url: VERIFY },
      { label: 'Purity', value: '99.771%', url: VERIFY },
      { label: 'Janoshik key', value: 'MMV8DU5INBHV', url: VERIFY },
    ],
  },
  {
    id: 'semax-10',
    match: {
      skuIncludes: ['SEMAX-10'],
      slugIncludes: ['semax-10mg', 'semax-10'],
      nameIncludes: ['Semax'],
    },
    labBatch: 'GP-260601-003',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.270%',
    labContent: '10.54 mg',
    labTests: [
      { label: 'Semax', value: '10.54 mg', url: VERIFY },
      { label: 'Purity', value: '99.270%', url: VERIFY },
      { label: 'Janoshik key', value: 'EIGSI3VKR73B', url: VERIFY },
    ],
  },
  {
    id: 'reta-20',
    // purity + heavy metals + endotoxin
    match: {
      skuIncludes: ['RETA-20', 'RETA20'],
      slugIncludes: ['retatrutide-20mg'],
      nameIncludes: ['Retatrutide'],
    },
    labBatch: 'GP-260522-003',
    labTestDate: '25-07-2026',
    labReportUrl: VERIFY,
    labPurity: '99.651%',
    labContent: '23.12 mg',
    labTests: [
      { label: 'Retatrutide', value: '23.12 mg', url: VERIFY },
      { label: 'Purity', value: '99.651%', url: VERIFY },
      { label: 'Janoshik key (purity)', value: 'LJEBVDL3C72E', url: VERIFY },
      { label: 'Heavy metals (As/Cd/Pb/Hg)', value: 'not detected', url: VERIFY },
      { label: 'Janoshik key (metals)', value: 'P5GX9Z8NLR7X', url: VERIFY },
      { label: 'Endotoxin', value: '0.230 EU/Vial', url: VERIFY },
      { label: 'Janoshik key (endotoxin)', value: '45WBC8YS9Y5R', url: VERIFY },
    ],
  },
];

function matches(product: { sku: string; slug: string; name: string; weight: string }, seed: ReportSeed): boolean {
  const { sku, slug, name, weight } = product;
  const blob = `${sku} ${slug} ${name} ${weight}`.toLowerCase();

  const skuOk = seed.match.skuIncludes?.some((s) => sku.toUpperCase().includes(s.toUpperCase())) ?? false;
  const slugOk = seed.match.slugIncludes?.some((s) => slug.toLowerCase().includes(s.toLowerCase())) ?? false;
  const nameOk = seed.match.nameIncludes?.some((s) => name.toLowerCase().includes(s.toLowerCase())) ?? false;
  if (!(skuOk || slugOk || nameOk)) return false;

  switch (seed.id) {
    case 'ghk-50':
      return /50/.test(weight) || /50mg/.test(slug) || /50/.test(sku);
    case 'bpc-10':
      if (/tb|wolf|blend/.test(blob)) return false;
      return /10/.test(weight) || /10mg/.test(slug) || /10MG/i.test(sku);
    case 'cjc-5-5':
      return /5\+5|5mg-5mg|5mg\+5|cjcipa-5/.test(blob);
    case 'bac-3ml':
      if (/acetic|aa.?water/.test(blob)) return false;
      return true;
    case 'nad-500':
      return /500/.test(weight) || /500mg/.test(slug) || /500/.test(sku);
    case 'mots-10':
      return /10/.test(weight) || /10mg/.test(slug) || /10/.test(sku);
    case 'tb500-10':
      if (/bpc|wolf|blend/.test(blob)) return false;
      return /10/.test(weight) || /10mg/.test(slug) || /10/.test(sku);
    case 'selank-10':
      return /10/.test(weight) || /10mg/.test(slug) || /10/.test(sku);
    case 'ss31-10':
      return /10/.test(weight) || /10mg/.test(slug) || /10/.test(sku);
    case 'semax-10':
      return /10/.test(weight) || /10mg/.test(slug) || /10/.test(sku);
    case 'reta-20':
      return /20/.test(weight) || /20mg/.test(slug) || /20/.test(sku);
    default:
      return skuOk || slugOk;
  }
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, sku: true, weight: true, seoData: true },
  });

  const used = new Set<string>();
  let ok = 0;
  let miss = 0;

  for (const seed of REPORTS) {
    const candidates = products.filter((p) => matches(p, seed) && !used.has(p.id));
    let hit =
      candidates.find((p) => seed.match.slugIncludes?.some((s) => p.slug.includes(s))) ||
      candidates.find((p) => seed.match.skuIncludes?.some((s) => p.sku.toUpperCase().includes(s.toUpperCase()))) ||
      candidates[0];

    if (seed.id === 'bac-3ml' && candidates.length) {
      hit =
        candidates.find((p) => /3\s*ml/i.test(p.weight) || /3ml/i.test(p.slug)) ||
        candidates.find((p) => p.slug === 'bac-water') ||
        hit;
    }

    if (!hit) {
      miss += 1;
      console.error('NO MATCH', seed.id, seed.labBatch);
      continue;
    }
    used.add(hit.id);

    let seo: Record<string, unknown> = {};
    try {
      seo = JSON.parse(hit.seoData || '{}') as Record<string, unknown>;
    } catch {
      seo = {};
    }

    seo.labBatch = seed.labBatch;
    seo.labTestDate = seed.labTestDate;
    seo.labReportUrl = seed.labReportUrl;
    seo.labTests = seed.labTests;
    if (seed.labPurity) seo.labPurity = seed.labPurity;
    else delete seo.labPurity;
    if (seed.labContent) seo.labContent = seed.labContent;
    else delete seo.labContent;

    await prisma.product.update({
      where: { id: hit.id },
      data: { seoData: JSON.stringify(seo) },
    });

    ok += 1;
    console.log('OK', seed.id, '→', hit.sku, hit.slug);
  }

  console.log(`Done: ${ok} updated, ${miss} unmatched (of ${REPORTS.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
