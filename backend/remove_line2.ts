import sharp from 'sharp';
import path from 'path';

async function main() {
  const inPath = path.join('assets', 'label-tiff-background.tiff');
  
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;
  
  console.log(`Image: ${W} x ${H}, channels: ${C}`);
  
  // Paint over rows 305-318 (broader blend zone to eliminate seam)
  const startRow = 305;
  const endRow = 318;
  const sampleAbove = 300;
  const sampleBelow = 323;
  
  for (let y = startRow; y <= endRow; y++) {
    // t = 0 means fully sample from above, t = 1 means fully from below
    const t = (y - startRow) / (endRow - startRow);
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * C;
      const idxAbove = (sampleAbove * W + x) * C;
      const idxBelow = (sampleBelow * W + x) * C;
      
      for (let c = 0; c < C; c++) {
        data[idx + c] = Math.round(data[idxAbove + c] * (1 - t) + data[idxBelow + c] * t);
      }
    }
  }
  
  console.log('Blending done, saving...');
  
  const fs = await import('fs');
  
  // Save TIFF
  await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } })
    .tiff({ compression: 'lzw', xres: 600 / 25.4, yres: 600 / 25.4 })
    .toFile(inPath + '.tmp.tiff');
  
  // Save debug PNG
  await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } })
    .resize({ width: 1200 })
    .png()
    .toFile('assets/_debug-tiff-fixed2.png');
  
  fs.renameSync(inPath + '.tmp.tiff', inPath);
  
  console.log('Done! Saved to', inPath);
}

main().catch(console.error);
