import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanModel(model: any, name: string) {
  const records = await model.findMany();
  let fixed = 0;
  for (const record of records) {
    if (!record.seoData) continue;
    let data;
    try { data = JSON.parse(record.seoData); } catch (e) { continue; }
    
    let changed = false;
    if (data.h1) { data.h1 = ''; changed = true; }
    if (data.h2 && data.h2.length > 0) { data.h2 = []; changed = true; }
    if (data.bodyContent) { data.bodyContent = ''; changed = true; }
    if (data.internalLinks && data.internalLinks.length > 0) { data.internalLinks = []; changed = true; }
    if (data.externalLinks && data.externalLinks.length > 0) { data.externalLinks = []; changed = true; }
    
    if (changed) {
      await model.update({ where: { id: record.id }, data: { seoData: JSON.stringify(data) } });
      fixed++;
    }
  }
  console.log(`Cleaned ${fixed} records in ${name}`);
}

async function cleanPages() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  if (!row) return;
  const data = JSON.parse(row.value);
  let changed = false;

  for (const pageKey of Object.keys(data)) {
    for (const lang of Object.keys(data[pageKey])) {
      if (data[pageKey][lang].h1) { data[pageKey][lang].h1 = ''; changed = true; }
      if (data[pageKey][lang].h2 && data[pageKey][lang].h2.length > 0) { data[pageKey][lang].h2 = []; changed = true; }
      if (data[pageKey][lang].bodyContent) { data[pageKey][lang].bodyContent = ''; changed = true; }
      if (data[pageKey][lang].internalLinks && data[pageKey][lang].internalLinks.length > 0) { data[pageKey][lang].internalLinks = []; changed = true; }
      if (data[pageKey][lang].externalLinks && data[pageKey][lang].externalLinks.length > 0) { data[pageKey][lang].externalLinks = []; changed = true; }
    }
  }

  if (changed) {
    await prisma.systemSetting.update({ where: { key: 'SEO_PAGE_META' }, data: { value: JSON.stringify(data) } });
    console.log('Cleaned SEO_PAGE_META for Pages');
  } else {
    console.log('No garbage found in SEO_PAGE_META');
  }
}

async function main() {
  await cleanModel(prisma.product, 'Product');
  await cleanModel(prisma.category, 'Category');
  await cleanModel(prisma.blogPost, 'BlogPost');
  await cleanPages();
  console.log('All garbage SEO data cleared!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
