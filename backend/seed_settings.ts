import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contactData = {
    email: "info@gopeptides.nl",
    phone: "+31 6 15636154",
    whatsappNumber: "31615636154",
    translations: {
      en: { address: "Amsterdam, Netherlands", hours: "Mon-Sat · Open 24 hours", responseTime: "Within 1 business day" },
      nl: { address: "Amsterdam, Nederland", hours: "Ma-Za · 24 uur geopend", responseTime: "Binnen 1 werkdag" },
      de: { address: "Amsterdam, Niederlande", hours: "Mo-Sa · 24 Stunden geöffnet", responseTime: "Innerhalb 1 Werktages" }
    }
  };

  await prisma.systemSetting.upsert({
    where: { key: 'site.contact' },
    update: { value: JSON.stringify(contactData) },
    create: { key: 'site.contact', value: JSON.stringify(contactData) }
  });

  console.log('Settings seeded successfully as JSON objects!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
