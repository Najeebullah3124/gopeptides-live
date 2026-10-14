import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  console.log(row?.value || 'NOT FOUND');
}
main().catch(console.error).finally(() => prisma.$disconnect());
