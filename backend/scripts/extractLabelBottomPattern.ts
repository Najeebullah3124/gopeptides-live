import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const outDir = path.resolve(process.cwd(), 'assets');

/** Crisp side wisps matching the bottle sticker — no photo extraction. */
function buildBottomPatternSvg(width: number, height: number): string {
  const h = height;
  const w = width;
  const side = Math.round(w * 0.34);

  const strokes: Array<{ d: string; sw: number; c: string; o: number }> = [
    { d: `M 0 ${h} C ${Math.round(side * 0.4)} ${Math.round(h * 0.8)}, ${Math.round(side * 0.6)} ${Math.round(h * 0.55)}, ${Math.round(side * 0.25)} ${Math.round(h * 0.35)}`, sw: 1.3, c: '#73c8dd', o: 0.42 },
    { d: `M 0 ${Math.round(h * 0.92)} C ${Math.round(side * 0.45)} ${Math.round(h * 0.72)}, ${Math.round(side * 0.55)} ${Math.round(h * 0.48)}, ${Math.round(side * 0.2)} ${Math.round(h * 0.28)}`, sw: 1, c: '#9bdcec', o: 0.38 },
    { d: `M ${Math.round(side * 0.05)} ${h} C ${Math.round(side * 0.55)} ${Math.round(h * 0.65)}, ${Math.round(side * 0.7)} ${Math.round(h * 0.4)}, ${Math.round(side * 0.35)} ${Math.round(h * 0.2)}`, sw: 0.85, c: '#c6ecf4', o: 0.5 },
    { d: `M 0 ${Math.round(h * 0.78)} C ${Math.round(side * 0.25)} ${Math.round(h * 0.6)}, ${Math.round(side * 0.4)} ${Math.round(h * 0.42)}, ${Math.round(side * 0.1)} ${Math.round(h * 0.22)}`, sw: 0.75, c: '#4fb4cf', o: 0.3 },
    { d: `M ${w} ${h} C ${w - Math.round(side * 0.4)} ${Math.round(h * 0.8)}, ${w - Math.round(side * 0.6)} ${Math.round(h * 0.55)}, ${w - Math.round(side * 0.25)} ${Math.round(h * 0.35)}`, sw: 1.3, c: '#73c8dd', o: 0.42 },
    { d: `M ${w} ${Math.round(h * 0.92)} C ${w - Math.round(side * 0.45)} ${Math.round(h * 0.72)}, ${w - Math.round(side * 0.55)} ${Math.round(h * 0.48)}, ${w - Math.round(side * 0.2)} ${Math.round(h * 0.28)}`, sw: 1, c: '#9bdcec', o: 0.38 },
    { d: `M ${w - Math.round(side * 0.05)} ${h} C ${w - Math.round(side * 0.55)} ${Math.round(h * 0.65)}, ${w - Math.round(side * 0.7)} ${Math.round(h * 0.4)}, ${w - Math.round(side * 0.35)} ${Math.round(h * 0.2)}`, sw: 0.85, c: '#c6ecf4', o: 0.5 },
    { d: `M ${w} ${Math.round(h * 0.78)} C ${w - Math.round(side * 0.25)} ${Math.round(h * 0.6)}, ${w - Math.round(side * 0.4)} ${Math.round(h * 0.42)}, ${w - Math.round(side * 0.1)} ${Math.round(h * 0.22)}`, sw: 0.75, c: '#4fb4cf', o: 0.3 },
  ];

  const strokeNodes = strokes
    .map(
      (s) =>
        `<path d="${s.d}" fill="none" stroke="${s.c}" stroke-width="${s.sw}" opacity="${s.o}" stroke-linecap="round"/>`
    )
    .join('\n');

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="leftFill" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#c6ecf4" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="rightFill" x1="1" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#c6ecf4" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="fadeMaskGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black"/>
        <stop offset="32%" stop-color="white"/>
        <stop offset="100%" stop-color="white"/>
      </linearGradient>
      <mask id="fadeMask">
        <rect width="${w}" height="${h}" fill="url(#fadeMaskGrad)"/>
      </mask>
    </defs>
    <rect width="${side}" height="${h}" fill="url(#leftFill)"/>
    <rect x="${w - side}" width="${side}" height="${h}" fill="url(#rightFill)"/>
    <g mask="url(#fadeMask)">${strokeNodes}</g>
  </svg>`;
}

async function buildBottomPattern(): Promise<Buffer> {
  const targetW = 1600;
  const targetH = 460;
  return sharp(Buffer.from(buildBottomPatternSvg(targetW, targetH))).png().toBuffer();
}

async function main() {
  const pattern = await buildBottomPattern();
  const outPath = path.join(outDir, 'label-bottom-pattern.png');
  await fs.promises.writeFile(outPath, pattern);
  const meta = await sharp(pattern).metadata();
  console.log(`Saved ${outPath} (${meta.width}x${meta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
