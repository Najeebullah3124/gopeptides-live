import sharp from 'sharp';
import path from 'path';

async function main() {
  const inPath = path.join('assets', 'label-tiff-background.tiff');
  
  // Load full resolution image as raw pixel data
  const img = sharp(inPath);
  const { width, height } = await img.metadata();
  const W = width!;
  const H = height!;
  
  console.log(`Image: ${W} x ${H} px`);
  
  // Get raw RGBA pixel buffer
  const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  
  // Scan every row for the teal line: teal = low R, high G, high B
  // Line color from image looks like approx R~0, G~128, B~128 (teal/cyan)
  const lineRows: number[] = [];
  for (let y = 0; y < H; y++) {
    let tealCount = 0;
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Teal: low red (<80), medium-high green (>80), medium-high blue (>80)
      // and notably: green and blue are much higher than red
      if (r < 80 && g > 80 && b > 80 && (g - r) > 50 && (b - r) > 50) {
        tealCount++;
      }
    }
    const tealPct = tealCount / W;
    if (tealPct > 0.05) {
      lineRows.push(y);
      console.log(`Row ${y}: tealCount=${tealCount} (${(tealPct*100).toFixed(1)}%)`);
    }
  }
  
  if (lineRows.length === 0) {
    console.log('No teal line rows found. Let me show sample pixel values around 25% height...');
    const sampleY = Math.round(H * 0.25);
    for (let dy = -5; dy <= 5; dy++) {
      const y = sampleY + dy;
      const idx = (y * W + Math.round(W * 0.1)) * 4;
      console.log(`Row ${y} left-panel: R=${data[idx]} G=${data[idx+1]} B=${data[idx+2]}`);
    }
  }
}

main().catch(console.error);
