/**
 * Smoke-check ContactMessage admin inbox helpers (create → list shape → read → delete).
 * Usage: npx tsx scripts/checkContactMessages.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.contactMessage.create({
    data: {
      name: 'Check User',
      email: 'check-contact@example.com',
      subject: 'Inbox self-check',
      message: 'ponytail contact inbox works',
    },
  });
  if (!row.id || row.isRead) throw new Error('create failed');

  const listed = await prisma.contactMessage.findMany({
    where: { id: row.id },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (listed.length !== 1) throw new Error('list failed');

  const read = await prisma.contactMessage.update({
    where: { id: row.id },
    data: { isRead: true, readAt: new Date() },
  });
  if (!read.isRead || !read.readAt) throw new Error('mark read failed');

  await prisma.contactMessage.delete({ where: { id: row.id } });
  console.log('checkContactMessages: ok');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
