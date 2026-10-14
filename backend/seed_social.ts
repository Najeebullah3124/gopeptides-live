import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const socialData = {
    whatsapp: "https://wa.me/31615636154",
    instagram: "https://www.instagram.com/gopeptides",
    tiktok: "https://www.tiktok.com/@gopeptides",
    facebook: "https://facebook.com/gopeptides",
    twitter: "https://x.com/gopeptides"
  };

  await prisma.systemSetting.upsert({
    where: { key: 'site.social' },
    update: { value: JSON.stringify(socialData) },
    create: { key: 'site.social', value: JSON.stringify(socialData) }
  });

  console.log('Social settings seeded successfully as JSON object!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
