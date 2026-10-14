import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('https://gopeptides.nl/', { waitUntil: 'networkidle2' });
  const html = await page.content();
  console.log("Root content length:", html.split('id="root"')[1].substring(0, 100).length);
  console.log(html.substring(0, 500));
  await browser.close();
})();
