const puppeteer = require('puppeteer');

async function checkPage(url, lang) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set language cookie if needed, or append query param
  const fullUrl = lang ? `${url}?lang=${lang}` : url;
  
  await page.goto(fullUrl, { waitUntil: 'networkidle0' });
  
  const keywords = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="keywords"]');
    return meta ? meta.getAttribute('content') : null;
  });
  
  console.log(`URL: ${fullUrl}`);
  console.log(`Keywords found: ${keywords || 'NONE'}\n`);
  
  await browser.close();
}

async function main() {
  const baseUrl = 'http://localhost:5173';
  
  console.log('--- EN (English) ---');
  await checkPage(`${baseUrl}/`, 'en');
  await checkPage(`${baseUrl}/contact`, 'en');
  await checkPage(`${baseUrl}/terms`, 'en');
  
  console.log('--- NL (Dutch) ---');
  await checkPage(`${baseUrl}/`, 'nl');
  await checkPage(`${baseUrl}/contact`, 'nl');
  await checkPage(`${baseUrl}/terms`, 'nl');
}

main().catch(console.error);
