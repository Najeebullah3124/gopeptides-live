import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.blogPost.updateMany({
    where: { slug: 'guidelines-for-reconstituting-sourced-peptides-a-researchers-standard-protocol' },
    data: { featuredImage: '/products/tb-500-10mg.webp' }
  });
  
  await prisma.blogPost.updateMany({
    where: { slug: 'the-ultimate-guide-to-bpc-157-benefits-uses-and-research-mechanisms' },
    data: { featuredImage: '/products/bpc-157-10mg.webp' }
  });

  console.log('Updated featured images successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
