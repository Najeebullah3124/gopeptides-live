/**
 * @deprecated Use scripts/seedProductImages.ts — npm run seed:product-images
 */
import fs from 'fs';
import path from 'path';
import {
  BRAND_IMAGE_BY_SLUG,
  resolveBrandImagePath,
  resolveProductImageOutputDirs,
} from '../src/services/labelBrandImageMap';
import { processBrandProductPhoto } from '../src/services/labelShineService';

async function main(): Promise<void> {
  const outputDirs = resolveProductImageOutputDirs();
  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  let ok = 0;
  let skipped = 0;

  for (const slug of Object.keys(BRAND_IMAGE_BY_SLUG)) {
    const source = resolveBrandImagePath(slug);
    if (!source) {
      console.warn(`[skip] missing source for ${slug}`);
      skipped += 1;
      continue;
    }

    const buffer = await processBrandProductPhoto(source);
    for (const dir of outputDirs) {
      const dest = path.join(dir, `${slug}.png`);
      await fs.promises.writeFile(dest, buffer);
    }
    console.log(`[ok] ${slug} ← ${path.basename(source)}`);
    ok += 1;
  }

  console.log(`\nDone: ${ok} product image(s) synced, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
