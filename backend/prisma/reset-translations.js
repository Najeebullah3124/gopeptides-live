const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  console.log('Resetting product and blog translations...');
  const res1 = await db.product.updateMany({ data: { translations: '{}' } });
  const res2 = await db.blogPost.updateMany({ data: { translations: '{}' } });
  console.log('Reset completed successfully:', { products: res1.count, blogs: res2.count });
}

run().catch(console.error).finally(() => db.$disconnect());
