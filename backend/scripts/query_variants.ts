import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const productNames = [
    '5-Amino-1MQ', 'Acetic Acid water', 'Cagrilintide', 'Epithalon',
    'Ipamorelin', 'KLOW', 'Melanotan I', 'PT-141', 'NAD+', 'Tesamorelin', 'Tirzepatide'
  ];

  const products = await prisma.product.findMany({
    where: { name: { in: productNames } },
    select: { id: true, name: true, slug: true, weight: true }
  });

  console.log(JSON.stringify(products, null, 2));
}

main().finally(() => prisma.$disconnect());
