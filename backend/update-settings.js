const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contactStr = await prisma.systemSetting.findUnique({ where: { key: 'site.contact' } });
  if (contactStr) {
    const contact = JSON.parse(contactStr.value);
    contact.phone = '+31 6 85 10 89 14';
    contact.whatsappNumber = '31685108914';
    await prisma.systemSetting.update({
      where: { key: 'site.contact' },
      data: { value: JSON.stringify(contact) }
    });
  }

  const socialStr = await prisma.systemSetting.findUnique({ where: { key: 'site.social' } });
  if (socialStr) {
    const social = JSON.parse(socialStr.value);
    social.whatsapp = 'https://wa.me/31685108914';
    social.instagram = 'https://www.instagram.com/GoPeptides1';
    social.tiktok = 'https://www.tiktok.com/@Go.peptides';
    social.facebook = 'https://facebook.com/GoPeptides';
    social.twitter = 'https://x.com/GoPeptides';
    
    await prisma.systemSetting.update({
      where: { key: 'site.social' },
      data: { value: JSON.stringify(social) }
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'contact_phone' },
    update: { value: '+31 6 85 10 89 14' },
    create: { key: 'contact_phone', value: '+31 6 85 10 89 14' }
  });

  await prisma.systemSetting.upsert({
    where: { key: 'contact_whatsapp_number' },
    update: { value: '31685108914' },
    create: { key: 'contact_whatsapp_number', value: '31685108914' }
  });

  console.log("Settings updated successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
