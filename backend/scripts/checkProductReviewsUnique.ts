/**
 * ponytail: fail if seeded reviews reuse body text, wrong totals, or flat length/count.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SEED_DOMAIN = 'seed.gopeptides.reviews';

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  const rows = await prisma.review.findMany({
    where: { guestEmail: { endsWith: `@${SEED_DOMAIN}` }, approved: true },
    select: { body: true, productId: true, createdAt: true },
  });
  if (!rows.length) throw new Error('No seeded reviews');

  const total = rows.length;
  if (total < 100 || total > 120) {
    throw new Error(`Total out of 100–120 range: ${total}`);
  }

  const bodies = rows.map((r) => r.body);
  if (new Set(bodies).size !== bodies.length) {
    throw new Error('Duplicate review bodies');
  }

  const words = bodies.map(wordCount);
  const minWords = Math.min(...words);
  const maxWords = Math.max(...words);
  if (minWords > 8) throw new Error(`Min word count too high (${minWords}); need ≤8 for ultra-short mix`);
  if (maxWords < 45) throw new Error(`Max word count too low (${maxWords}); need ≥45 for long mix`);

  const byProduct = new Map<string, number>();
  for (const r of rows) {
    byProduct.set(r.productId, (byProduct.get(r.productId) || 0) + 1);
  }
  const counts = [...byProduct.values()];
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min === max) throw new Error(`All products have same review count (${min})`);

  const times = rows.map((r) => r.createdAt.getTime());
  const spanDays = (Math.max(...times) - Math.min(...times)) / (86400 * 1000);
  if (spanDays < 30) throw new Error(`Date span too narrow: ${spanDays.toFixed(1)} days`);

  console.log(
    `OK: ${total} unique bodies, words ${minWords}–${maxWords}, per-product ${min}–${max}, ~${spanDays.toFixed(0)}d span`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
