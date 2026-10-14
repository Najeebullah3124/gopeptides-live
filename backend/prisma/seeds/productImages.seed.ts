import fs from 'fs';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import {
  BRAND_IMAGE_BY_SLUG,
  resolveBrandImagePath,
  resolveBrandImagesDir,
  resolveProductImageOutputDirs,
} from '../../src/services/labelBrandImageMap';
import { processBrandProductPhoto } from '../../src/services/labelShineService';

/** Absolute path to Nexipep-Ecommerce/new-brand-images */
export const NEW_BRAND_IMAGES_DIR = resolveBrandImagesDir();

export function productImageUrl(slug: string): string {
  return `/products/${slug}.png`;
}

export interface SeedProductImagesResult {
  files: number;
  db: number;
  skipped: number;
}

/**
 * Copy all 33 brand vial photos from new-brand-images/ into frontend public/products,
 * and upsert Image rows for matching products.
 */
export async function seedProductImages(prisma: PrismaClient): Promise<SeedProductImagesResult> {
  if (!fs.existsSync(NEW_BRAND_IMAGES_DIR)) {
    throw new Error(
      `Brand images folder not found: ${NEW_BRAND_IMAGES_DIR}\n` +
        'Expected: Nexipep-Ecommerce/new-brand-images/'
    );
  }

  const outputDirs = resolveProductImageOutputDirs();
  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  let files = 0;
  let db = 0;
  let skipped = 0;

  console.log(`Seeding product images from ${NEW_BRAND_IMAGES_DIR}`);

  for (const slug of Object.keys(BRAND_IMAGE_BY_SLUG)) {
    const source = resolveBrandImagePath(slug);
    if (!source) {
      console.warn(`  [skip] missing source for ${slug}`);
      skipped += 1;
      continue;
    }

    const buffer = await processBrandProductPhoto(source);
    for (const dir of outputDirs) {
      await fs.promises.writeFile(path.join(dir, `${slug}.png`), buffer);
    }
    files += 1;

    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) {
      console.warn(`  [db-skip] no product for slug "${slug}"`);
      continue;
    }

    await prisma.image.deleteMany({ where: { productId: product.id } });
    await prisma.image.create({
      data: {
        productId: product.id,
        url: productImageUrl(slug),
        alt: `${product.name} ${product.weight}`,
        isPrimary: true,
        position: 0,
      },
    });
    db += 1;
    console.log(`  [ok] ${slug} ← ${path.basename(source)}`);
  }

  return { files, db, skipped };
}
