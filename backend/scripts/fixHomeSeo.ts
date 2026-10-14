import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  if (!row) return;

  const data = JSON.parse(row.value);
  let changed = false;

  for (const pageKey of Object.keys(data)) {
    for (const lang of Object.keys(data[pageKey])) {
      if (data[pageKey][lang].h2 && data[pageKey][lang].h2.length > 0) {
        data[pageKey][lang].h2 = [];
        changed = true;
      }
      if (data[pageKey][lang].bodyContent) {
        data[pageKey][lang].bodyContent = '';
        changed = true;
      }
    }
  }

  if (changed) {
    await prisma.systemSetting.update({
      where: { key: 'SEO_PAGE_META' },
      data: { value: JSON.stringify(data) },
    });
    console.log('Fixed SEO Meta for ALL pages on server!');
  } else {
    console.log('No duplicate H2s/Content found to fix.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
