import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanSeoData(model: any, name: string) {
  const records = await model.findMany();
  let fixed = 0;
  for (const record of records) {
    if (!record.seoData) continue;
    let data;
    try { data = JSON.parse(record.seoData); } catch (e) { continue; }
    
    let changed = false;
    if (data.h2 && data.h2.length > 0) {
      data.h2 = [];
      changed = true;
    }
    if (data.bodyContent) {
      data.bodyContent = '';
      changed = true;
    }
    
    if (changed) {
      await model.update({ where: { id: record.id }, data: { seoData: JSON.stringify(data) } });
      fixed++;
    }
  }
  console.log(`Cleaned ${fixed} records in ${name}`);
}

async function main() {
  await cleanSeoData(prisma.product, 'Product');
  await cleanSeoData(prisma.category, 'Category');
  await cleanSeoData(prisma.blogPost, 'BlogPost');
  console.log('All done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
