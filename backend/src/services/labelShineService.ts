import sharp from 'sharp';

/** Prepare a storefront product photo from a brand vial image (resize only, no shine overlay). */
export async function processBrandProductPhoto(sourcePath: string, size = 1200): Promise<Buffer> {
  return sharp(sourcePath)
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
}
