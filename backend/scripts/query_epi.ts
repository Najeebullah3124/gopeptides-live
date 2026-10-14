import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findMany({
    where: { slug: { contains: 'epita' } },
    select: { id: true, name: true, slug: true, weight: true }
  });

  const p2 = await prisma.product.findMany({
    where: { slug: { contains: 'epitha' } },
    select: { id: true, name: true, slug: true, weight: true }
  });

  console.log(JSON.stringify(p, null, 2));
  console.log(JSON.stringify(p2, null, 2));
}

main().finally(() => prisma.$disconnect());
