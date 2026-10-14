/**
 * Fix contact NL copy in site.contact settings:
 * Netherlands → Nederland, Ma-Sa → Ma-Za (and align hours to 24u if still weekday-only).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ContactTranslations = {
  en?: { address?: string; hours?: string; responseTime?: string };
  nl?: { address?: string; hours?: string; responseTime?: string };
  de?: { address?: string; hours?: string; responseTime?: string };
};

type ContactData = {
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  translations?: ContactTranslations;
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function fixNlAddress(s: string): string {
  return s.replace(/\bNetherlands\b/g, 'Nederland');
}

function fixNlHours(s: string): string {
  return s.replace(/\bMa-Sa\b/g, 'Ma-Za').replace(/\bMa-Vr\b/g, 'Ma-Za');
}

async function main() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'site.contact' } });
  const current: ContactData = row?.value ? JSON.parse(row.value) : {};
  const nl = current.translations?.nl ?? {};

  const nextNl = {
    ...nl,
    address: fixNlAddress(nl.address || 'Amsterdam, Nederland'),
    hours: fixNlHours(nl.hours || 'Ma-Za · 24 uur geopend'),
    responseTime: nl.responseTime || 'Binnen 1 werkdag',
  };

  // If hours still look like old office hours, use the 24h wording from the live contact page.
  if (/09:00|17:00|CET/i.test(nextNl.hours)) {
    nextNl.hours = 'Ma-Za · 24 uur geopend';
  }

  const next: ContactData = {
    ...current,
    translations: {
      ...current.translations,
      nl: nextNl,
      en: {
        address: current.translations?.en?.address || 'Amsterdam, Netherlands',
        hours: current.translations?.en?.hours?.includes('Mon-Fri')
          ? 'Mon-Sat · Open 24 hours'
          : current.translations?.en?.hours || 'Mon-Sat · Open 24 hours',
        responseTime: current.translations?.en?.responseTime || 'Within 1 business day',
      },
      de: {
        address: current.translations?.de?.address || 'Amsterdam, Niederlande',
        hours: current.translations?.de?.hours?.includes('Mo-Fr')
          ? 'Mo-Sa · 24 Stunden geöffnet'
          : current.translations?.de?.hours || 'Mo-Sa · 24 Stunden geöffnet',
        responseTime: current.translations?.de?.responseTime || 'Innerhalb 1 Werktages',
      },
    },
  };

  await prisma.systemSetting.upsert({
    where: { key: 'site.contact' },
    update: { value: JSON.stringify(next) },
    create: { key: 'site.contact', value: JSON.stringify(next) },
  });

  assert(!/\bNetherlands\b/.test(next.translations!.nl!.address!), 'NL address has no Netherlands');
  assert(!/\bMa-Sa\b/.test(next.translations!.nl!.hours!), 'NL hours has Za not Sa');
  assert(/\bNederland\b/.test(next.translations!.nl!.address!), 'NL address has Nederland');
  assert(/\bMa-Za\b/.test(next.translations!.nl!.hours!), 'NL hours has Ma-Za');

  console.log('fixContactNlCopy: ok', next.translations!.nl);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
