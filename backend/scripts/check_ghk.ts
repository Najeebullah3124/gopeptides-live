import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { sku: 'GP-GHKCU-50MG' },
    select: { images: true }
  });
  console.log('GHK-Cu images:', products[0]?.images);
}

main().catch(console.error).finally(() => prisma.$disconnect());
