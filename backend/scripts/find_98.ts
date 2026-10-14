import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  for (const p of products) {
    if (p.benefits && p.benefits.includes('98')) {
      console.log('Benefits:', p.name, p.benefits);
    }
    if (p.translations && p.translations.includes('98')) {
      console.log('Translations:', p.name, p.translations.substring(0, 100));
    }
    if (p.seoData && p.seoData.includes('98')) {
      console.log('seoData:', p.name, p.seoData);
    }
  }
}
main().finally(() => prisma.$disconnect());
