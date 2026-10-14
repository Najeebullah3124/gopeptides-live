import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'maintenance_mode' },
    update: { value: 'false' },
    create: { key: 'maintenance_mode', value: 'false' },
  });
  console.log('Maintenance mode disabled.');
}
main().finally(() => prisma.$disconnect());
