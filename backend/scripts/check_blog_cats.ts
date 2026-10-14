import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.blogCategory.findMany();
  console.log(cats);
  
  // also get the author id
  const user = await prisma.user.findFirst();
  console.log("Author ID:", user?.id);
}

main().finally(() => prisma.$disconnect());
