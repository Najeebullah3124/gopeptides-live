import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const models = Object.keys(prisma);
  console.log(models);

  // Check if there is a blog model
  if (prisma.blog) {
     const blogs = await prisma.blog.findMany({ select: { title: true, slug: true } });
     console.log(blogs);
  }
}
main().finally(() => prisma.$disconnect());
