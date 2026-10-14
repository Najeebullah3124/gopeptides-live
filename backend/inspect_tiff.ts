import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function main() {
  const inPath = path.join('assets', 'label-tiff-background.tiff');
  const meta = await sharp(inPath).metadata();
  console.log(JSON.stringify({ width: meta.width, height: meta.height, format: meta.format, density: meta.density }, null, 2));
  
  // Export to PNG so we can view it and identify the line position
  const pngPath = path.join('assets', '_debug-tiff-bg.png');
  await sharp(inPath).resize({ width: 1200 }).png().toFile(pngPath);
  console.log('Debug PNG saved to', pngPath);
}

main().catch(console.error);
