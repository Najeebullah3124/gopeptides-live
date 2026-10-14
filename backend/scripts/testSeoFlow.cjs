const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');

const p = new PrismaClient();

async function main() {
  // 1. Emulate saving keywords via SEO Center for the Science page in English
  const testKeywords = ['science test peptide', 'laboratory research ONLY', 'TEST_FLOW_2026'];
  console.log('--- Step 1: Saving keywords to DB ---');
  console.log(`Setting focusKeywords for science (en) to: ${testKeywords.join(', ')}`);
  
  const row = await p.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  const data = row ? JSON.parse(row.value) : {};
  
  if (!data['science']) data['science'] = {};
  if (!data['science']['en']) data['science']['en'] = {};
  
  // Update focusKeywords
  data['science']['en'].focusKeywords = testKeywords;
  
  await p.systemSetting.upsert({
    where: { key: 'SEO_PAGE_META' },
    update: { value: JSON.stringify(data) },
    create: { key: 'SEO_PAGE_META', value: JSON.stringify(data) },
  });
  console.log('Saved to DB successfully.\n');

  // 2. We need to wait a tiny bit to ensure the frontend can fetch the updated settings.
  // Actually, the frontend fetches settings on initial load or navigation. 
  // Puppeteer loading the page fresh will definitely fetch the latest settings.
  console.log('--- Step 2: Fetching live HTML via Puppeteer ---');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const url = 'http://localhost:5173/science?lang=en';
  console.log(`Navigating to: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  const keywords = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="keywords"]');
    return meta ? meta.getAttribute('content') : null;
  });
  
  console.log(`Keywords found on live page: ${keywords || 'NONE'}`);
  
  if (keywords === testKeywords.join(', ')) {
    console.log('\n✅ TEST PASSED: Flow is working perfectly!');
  } else {
    console.log('\n❌ TEST FAILED: Keywords did not match.');
  }
  
  await browser.close();
}

main().catch(console.error).finally(() => p.$disconnect());
