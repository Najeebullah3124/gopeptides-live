const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const row = await p.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  if (!row) { console.log('No SEO_PAGE_META in DB'); return; }

  const data = JSON.parse(row.value);
  
  // Show all data for home and terms  
  console.log('\n=== Home (key: "home" or "/") ===');
  const homeData = data['home'] || data['/'];
  if (homeData) {
    for (const lang of ['en', 'nl', 'de']) {
      console.log(`  [${lang}]:`, JSON.stringify(homeData[lang]?.focusKeywords));
    }
  } else {
    console.log('  Not found in DB');
  }

  console.log('\n=== Terms (key: "terms" or "/terms") ===');
  const termsData = data['terms'] || data['/terms'];
  if (termsData) {
    for (const lang of ['en', 'nl', 'de']) {
      console.log(`  [${lang}]:`, JSON.stringify(termsData[lang]?.focusKeywords));
    }
  } else {
    console.log('  Not found in DB');
  }

  console.log('\n=== Contact (key: "contact" or "/contact") ===');
  const contactData = data['contact'] || data['/contact'];
  if (contactData) {
    for (const lang of ['en', 'nl', 'de']) {
      console.log(`  [${lang}]:`, JSON.stringify(contactData[lang]?.focusKeywords));
    }
  } else {
    console.log('  Not found in DB → all langs use hardcoded fallback');
  }
}

main().catch(console.error).finally(() => p.$disconnect());
