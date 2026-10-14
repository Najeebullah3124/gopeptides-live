import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const rows = await p.product.findMany({
    where: { isActive: true },
    select: {
      price: true,
      name: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { price: 'asc' },
  });

  const prices = rows.map((r) => r.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const sorted = [...prices].sort((a, b) => a - b);
  const p33 = sorted[Math.floor(sorted.length * 0.33)];
  const p66 = sorted[Math.floor(sorted.length * 0.66)];

  const buckets = { lt40: 0, b40_60: 0, gt60: 0 };
  for (const x of prices) {
    if (x < 40) buckets.lt40++;
    else if (x <= 60) buckets.b40_60++;
    else buckets.gt60++;
  }

  const byCat: Record<string, number[]> = {};
  for (const r of rows) {
    const k = r.category?.slug || '?';
    (byCat[k] ||= []).push(r.price);
  }

  console.log(
    JSON.stringify(
      {
        count: rows.length,
        min,
        max,
        p33,
        p66,
        buckets,
        prices: sorted,
        byCat,
      },
      null,
      2,
    ),
  );
}

main().finally(() => p.$disconnect());
