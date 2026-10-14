import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const variant = await prisma.labelVariant.findFirst({
    include: { product: true }
  });
  console.log(`Product: ${variant?.product.name} ${variant?.dosage}`);
  console.log(`Dimensions: ${variant?.labelWidthMm}mm x ${variant?.labelHeightMm}mm`);
}

main().finally(() => prisma.$disconnect());
