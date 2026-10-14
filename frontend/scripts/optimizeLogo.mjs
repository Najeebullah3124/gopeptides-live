import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(__dirname, '../public');
const src = path.join(pub, 'logo.jpeg');

async function main() {
  await sharp(src).resize(336).webp({ quality: 85 }).toFile(path.join(pub, 'logo-336.webp'));
  await sharp(src).resize(168).webp({ quality: 85 }).toFile(path.join(pub, 'logo-168.webp'));
  const meta = await sharp(path.join(pub, 'logo-336.webp')).metadata();
  const stat = await import('node:fs/promises').then((fs) => fs.stat(path.join(pub, 'logo-336.webp')));
  console.log(`logo-336.webp ${meta.width}x${meta.height} ${Math.round(stat.size / 1024)}KiB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
