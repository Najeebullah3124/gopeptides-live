/** ponytail: one-off audit helper — lists slug/sku/image for all active products */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { images: { orderBy: { position: 'asc' } } },
    orderBy: { slug: 'asc' },
  });
  for (const p of products) {
    const url = p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url || 'NO_IMAGE';
    console.log(`${p.slug}|${p.sku}|${url}`);
  }
  console.log(`total=${products.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
