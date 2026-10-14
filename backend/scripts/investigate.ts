import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();
  console.log("Categories:");
  categories.forEach(c => console.log(`- ${c.name} (${c.slug}) [ID: ${c.id}]`));

  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, slug: true, weight: true, price: true, categoryId: true, isFeatured: true }
  });
  console.log("\nProducts:");
  products.forEach(p => console.log(`- ${p.name} [SKU: ${p.sku}] [Slug: ${p.slug}] - ${p.weight} - €${p.price} (Cat: ${p.categoryId})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
