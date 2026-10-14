import sharp from 'sharp';
import path from 'path';

async function main() {
  const inPath = path.join('assets', 'label-tiff-background.tiff');
  const outPath = path.join('assets', 'label-tiff-background.tiff');
  
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels; // 4 with ensureAlpha
  
  console.log(`Image: ${W} x ${H}, channels: ${C}`);
  
  // The teal line is on rows 311-313
  const lineRows = [311, 312, 313];
  const sampleAbove = 308; // row to sample from above the line
  const sampleBelow = 315; // row to sample from below the line
  
  for (const y of lineRows) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * C;
      const idxAbove = (sampleAbove * W + x) * C;
      const idxBelow = (sampleBelow * W + x) * C;
      
      // Blend 50/50 between row above and row below
      for (let c = 0; c < C; c++) {
        data[idx + c] = Math.round((data[idxAbove + c] + data[idxBelow + c]) / 2);
      }
    }
  }
  
  console.log('Painting done, saving...');
  
  // Save as TIFF
  await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } })
    .tiff({ compression: 'lzw', xres: 600 / 25.4, yres: 600 / 25.4 })
    .toFile(outPath + '.tmp.tiff');
  
  // Also save debug PNG
  await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } })
    .resize({ width: 1200 })
    .png()
    .toFile('assets/_debug-tiff-fixed.png');
  
  console.log('Saved temp file. Now replacing original...');
  
  // Replace original
  const fs = await import('fs');
  fs.renameSync(outPath + '.tmp.tiff', outPath);
  
  console.log('Done! TIFF background updated successfully.');
  console.log('Debug PNG: assets/_debug-tiff-fixed.png');
}

main().catch(console.error);
