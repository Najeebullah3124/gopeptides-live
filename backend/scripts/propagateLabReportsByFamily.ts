/**
 * Propagate existing CoA (labReportImages + real lab fields) to ALL dosage variants
 * of the same product family. CoAs are product-level, not dosage-specific.
 *
 * - Copies only fields already present on a source SKU (never invents data)
 * - Blends stay separate (Wolverine ≠ BPC-157; CJC blend ≠ single peptides)
 * - Genetek BAC water does NOT get GoPeptides BAC CoA
 *
 * Usage (live): upload → npx tsx scripts/propagateLabReportsByFamily.ts → delete script
 * NEVER copy local prisma/dev.db over production.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Family = {
  id: string;
  /** Prefer this slug as the CoA source when it already has images. */
  sourceSlug: string;
  match: (p: { name: string; slug: string; sku: string }) => boolean;
};

function hay(p: { name: string; slug: string; sku: string }): string {
  return `${p.name} ${p.slug} ${p.sku}`.toLowerCase();
}

const FAMILIES: Family[] = [
  {
    id: 'retatrutide',
    sourceSlug: 'retatrutide-20mg',
    match: (p) => /retatrutide/.test(hay(p)),
  },
  {
    id: 'ghk-cu',
    sourceSlug: 'ghk-cu-50mg',
    match: (p) => /ghk/.test(hay(p)) && !/glow|klow/.test(hay(p)),
  },
  {
    id: 'mots-c',
    sourceSlug: 'mots-c-10mg',
    match: (p) => /mots/.test(hay(p)),
  },
  {
    id: 'bpc-157',
    sourceSlug: 'bpc-157-10mg',
    match: (p) => {
      const h = hay(p);
      if (/wolf|tb.?500|tb500|\+/.test(h) && /bpc/.test(h)) return false;
      return /bpc.?157|bpc157/.test(h);
    },
  },
  {
    id: 'tb-500',
    sourceSlug: 'tb-500-10mg',
    match: (p) => {
      const h = hay(p);
      if (/wolf|bpc/.test(h)) return false;
      return /tb.?500|tb500|thymosin/.test(h);
    },
  },
  {
    id: 'selank',
    sourceSlug: 'selank-10mg',
    match: (p) => /selank/.test(hay(p)),
  },
  {
    id: 'semax',
    sourceSlug: 'semax-10mg',
    match: (p) => /semax/.test(hay(p)),
  },
  {
    id: 'ss-31',
    sourceSlug: 'ss-31-10mg',
    match: (p) => /ss.?31|elamipretide/.test(hay(p)),
  },
  {
    id: 'glow',
    sourceSlug: 'glow-70mg',
    match: (p) => /glow/.test(hay(p)) && !/klow/.test(hay(p)),
  },
  {
    id: 'cjc-ipa',
    sourceSlug: 'cjc1295-ipamorelin-5mg',
    match: (p) => {
      const h = hay(p);
      return (/cjc/.test(h) && /ipam/.test(h)) || /cjc.?ipa|cjcipa/.test(h);
    },
  },
  {
    id: 'wolverine',
    sourceSlug: 'bpc157-tb500-wolf-10mg',
    match: (p) => {
      const h = hay(p);
      return /wolf/.test(h) || (/bpc/.test(h) && /tb/.test(h));
    },
  },
  {
    id: 'bac-water',
    sourceSlug: 'bac-water-3-ml',
    match: (p) => {
      const h = hay(p);
      if (/genetek/.test(h)) return false;
      return /bac/.test(h) && /water|bacw/.test(h);
    },
  },
  {
    id: 'nad',
    sourceSlug: 'nad-500mg',
    match: (p) => /\bnad\+?\b|nad-|\bnad\d/.test(hay(p)),
  },
];

const COPY_KEYS = [
  'labReportImages',
  'labBatch',
  'labTestDate',
  'labTests',
  'labContent',
  'labPurity',
  'labReportUrl',
] as const;

function parseSeo(raw: string | null): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function hasImages(seo: Record<string, unknown>): boolean {
  return Array.isArray(seo.labReportImages) && seo.labReportImages.length > 0;
}

function pickSource(
  members: Array<{ id: string; slug: string; seoData: string | null }>,
  preferredSlug: string,
) {
  const preferred = members.find((m) => m.slug === preferredSlug);
  if (preferred && hasImages(parseSeo(preferred.seoData))) return preferred;
  return members.find((m) => hasImages(parseSeo(m.seoData))) || null;
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, sku: true, seoData: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const family of FAMILIES) {
    const members = products.filter((p) => family.match(p));
    if (!members.length) {
      console.log(`SKIP family ${family.id}: no members`);
      continue;
    }
    const source = pickSource(members, family.sourceSlug);
    if (!source) {
      console.log(`SKIP family ${family.id}: no source with labReportImages`);
      continue;
    }
    const srcSeo = parseSeo(source.seoData);
    console.log(`FAMILY ${family.id} source=${source.slug} members=${members.length}`);

    for (const m of members) {
      const seo = parseSeo(m.seoData);
      let changed = false;
      for (const key of COPY_KEYS) {
        if (!(key in srcSeo) || srcSeo[key] === undefined || srcSeo[key] === null) continue;
        const next = JSON.stringify(srcSeo[key]);
        const prev = JSON.stringify(seo[key]);
        if (next !== prev) {
          seo[key] = srcSeo[key];
          changed = true;
        }
      }
      // Do not invent purity if source has none
      if (!('labPurity' in srcSeo) && 'labPurity' in seo) {
        // leave existing sibling purity alone if source has none — only sync when source has it
      }
      if (!changed) {
        skipped += 1;
        console.log(`  same ${m.slug}`);
        continue;
      }
      await prisma.product.update({
        where: { id: m.id },
        data: { seoData: JSON.stringify(seo) },
      });
      updated += 1;
      console.log(`  UPDATED ${m.slug} ${m.sku}`);
    }
  }

  const withImgs = await prisma.product.findMany({ select: { slug: true, seoData: true } });
  const n = withImgs.filter((p) => hasImages(parseSeo(p.seoData))).length;
  console.log(`propagateLabReportsByFamily: updated=${updated} unchanged=${skipped} productsWithImages=${n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
