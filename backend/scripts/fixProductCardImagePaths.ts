/**
 * Fix product card photos when DB image URLs still point to old/misleading paths,
 * or when products have no Image row but a matching file exists in public/products.
 *
 * Usage:
 *   npx tsx scripts/fixProductCardImagePaths.ts
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const publicProductsDirCandidates = [
  path.resolve(__dirname, '../../frontend/products'), // live nginx root
  path.resolve(__dirname, '../../frontend-build/public/products'),
];

const DIRECT_FALLBACK_BY_SLUG: Record<string, string> = {
  'bpc-157-20-mg': '/products/bpc-157-10mg.webp',
  'glow-70mg': '/products/glow-50mg.webp',
  'retatrutide-5-mg': '/products/retatrutide-10mg.webp',
};

const FORCE_REPLACEMENT_BY_SLUG: Record<string, string> = {
  'retatrutide-40-mg': '/products/retatrutide-20mg.webp',
  'selank-5-mg': '/products/selank-10mg.webp',
  'bac-water-3-ml': '/products/bac-water-10ml.png',
  'dsip-5-mg': '/products/dsip-5mg.png',
  'epi-thalon': '/products/epitalon-10mg.png',
};

const SLUG_TO_FILENAME: Record<string, string> = {
  'dsip-5-mg': 'dsip-5mg.png',
  'epi-thalon': 'epitalon-10mg.png',
  'alcoholdoekjes-100-stuks': 'Alcoholdoekjes.png',
  'genetek-bac-water-10-ml': 'Genetek BAC water.png',
  'insulinespuit-0-3-ml': 'Insulinespuit-0.3ml.png',
  'insulinespuit-0-5-ml': 'Insulinespuit-0.5ml.png',
  'insulinespuit-1-0-ml': 'Insulinespuit-1ml.png',
  'ipa-morelin': 'Ipamorelin-10mg.png',
  'kpv-30-mg': 'KPV.png',
  'lemon-bottle-10-ml': 'Lemon Bottle.png',
  'melanotan-10mg': 'Melanotan I 10 mg.png',
  'pt141-10mg': 'PT-141-10mg.png',
};

function listProductFiles(): Map<string, string> {
  const byLower = new Map<string, string>();
  for (const dir of publicProductsDirCandidates) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      byLower.set(name.toLowerCase(), name);
    }
  }
  return byLower;
}

function existsPublicProduct(urlPath: string, fileIndex: Map<string, string>): boolean {
  if (!urlPath.startsWith('/products/')) return false;
  const base = urlPath.split('/').pop() || '';
  return fileIndex.has(base.toLowerCase());
}

function canonicalUrl(urlPath: string, fileIndex: Map<string, string>): string | null {
  if (!urlPath.startsWith('/products/')) return null;
  const base = urlPath.split('/').pop() || '';
  const actual = fileIndex.get(base.toLowerCase());
  return actual ? `/products/${actual}` : null;
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function candidateUrls(slug: string, currentUrl: string, fileIndex: Map<string, string>): string[] {
  const currentBase = currentUrl.split('/').pop() || '';
  const noExt = currentBase.replace(/\.[^.]+$/, '');
  const normalizedSlug = slug.toLowerCase();
  const typoSlug = normalizedSlug.replace('retatrutide', 'retatutride');
  const fromCurrentTypos = noExt.replace('retatrutide', 'retatutride');
  const explicitFile = SLUG_TO_FILENAME[normalizedSlug];

  const raw = unique([
    explicitFile ? `/products/${explicitFile}` : '',
    `/products/${normalizedSlug}.webp`,
    `/products/${typoSlug}.webp`,
    `/products/${normalizedSlug}.png`,
    `/products/${noExt}.webp`,
    `/products/${noExt}.png`,
    `/products/${fromCurrentTypos}.webp`,
    currentUrl,
    DIRECT_FALLBACK_BY_SLUG[normalizedSlug] || '',
    FORCE_REPLACEMENT_BY_SLUG[normalizedSlug] || '',
  ]).filter(Boolean);

  return raw
    .filter((u) => existsPublicProduct(u, fileIndex))
    .map((u) => canonicalUrl(u, fileIndex)!)
    .filter(Boolean);
}

function resolveBestUrl(slug: string, currentUrl: string, fileIndex: Map<string, string>): string | null {
  const forced = FORCE_REPLACEMENT_BY_SLUG[slug];
  if (forced && existsPublicProduct(forced, fileIndex)) {
    return canonicalUrl(forced, fileIndex);
  }
  const candidates = candidateUrls(slug, currentUrl, fileIndex);
  return candidates[0] || null;
}

async function main() {
  const fileIndex = listProductFiles();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] } },
    orderBy: { slug: 'asc' },
  });

  let checked = 0;
  let updated = 0;
  let created = 0;
  const stillMissing: string[] = [];

  for (const product of products) {
    checked++;
    const primary = product.images.find((i) => i.isPrimary) || product.images[0];
    const current = primary?.url?.trim() || '';
    const best = resolveBestUrl(product.slug, current, fileIndex);

    if (!best) {
      stillMissing.push(`${product.slug} (${product.sku})`);
      continue;
    }

    if (!primary) {
      await prisma.image.create({
        data: {
          productId: product.id,
          url: best,
          alt: `${product.name} ${product.weight}`,
          isPrimary: true,
          position: 0,
        },
      });
      created++;
      console.log(`CREATED ${product.slug} (${product.sku}) -> ${best}`);
      continue;
    }

    if (best !== current) {
      await prisma.image.update({
        where: { id: primary.id },
        data: { url: best },
      });
      updated++;
      console.log(`UPDATED ${product.slug} (${product.sku}) ${current || '(empty)'} -> ${best}`);
    }
  }

  const reportsAsProductImage = await prisma.image.count({
    where: { url: { startsWith: '/photos/reports/' } },
  });

  console.log(`fixProductCardImagePaths: checked=${checked} updated=${updated} created=${created}`);
  console.log(`imagesPointingToReports=${reportsAsProductImage}`);
  if (stillMissing.length) {
    console.log(`stillMissing=${stillMissing.length}`);
    for (const line of stillMissing) console.log(`  - ${line}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
