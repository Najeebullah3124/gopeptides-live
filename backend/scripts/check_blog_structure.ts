import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const blogs = await prisma.blogPost.findMany();
  console.log(JSON.stringify(blogs.slice(0, 2), null, 2));
}

main().finally(() => prisma.$disconnect());
