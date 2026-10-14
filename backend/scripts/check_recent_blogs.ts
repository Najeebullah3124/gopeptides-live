import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const blogs = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(blogs.map(b => ({ id: b.id, title: b.title, slug: b.slug, baseLang: b.baseLanguage })), null, 2));
}

main().finally(() => prisma.$disconnect());
