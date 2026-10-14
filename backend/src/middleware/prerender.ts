import { Request, Response, NextFunction } from 'express';
import puppeteer, { Browser } from 'puppeteer';

const BOT_USER_AGENTS = [
  'googlebot', 'yahoo! slurp', 'bingbot', 'yandex', 'baiduspider',
  'facebookexternalhit', 'twitterbot', 'rogerbot', 'linkedinbot',
  'embedly', 'quora link preview', 'showyoubot', 'outbrain',
  'pinterest', 'developers.google.com/+/web/snippet',
  'slackbot', 'vkshare', 'w3c_validator', 'redditbot', 'applebot',
  'whatsapp', 'flipboard', 'tumblr', 'bitlybot', 'skypeuripreview',
  'nuzzel', 'discordbot', 'google page speed', 'qwantify',
  'pinterestbot', 'bitrix link preview', 'xing-contenttabreceiver',
  'chrome-lighthouse', 'telegrambot', 'screaming frog', 'cheerio'
];

let browserInstance: Browser | null = null;
const CACHE = new Map<string, { html: string, expires: number }>();

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

export const prerenderMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const isBot = BOT_USER_AGENTS.some(bot => userAgent.includes(bot));

  if (!isBot) {
    return next();
  }

  // Only prerender GET requests that are not API calls or static files
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }

  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  
  // Check memory cache (1 hr TTL)
  const cached = CACHE.get(url);
  if (cached && cached.expires > Date.now()) {
    res.send(cached.html);
    return;
  }

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Abort unnecessary resources for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Wait for the app to render content
    await page.waitForSelector('#root > *', { timeout: 5000 }).catch(() => {});
    
    const html = await page.content();
    await page.close();

    CACHE.set(url, { html, expires: Date.now() + 1000 * 60 * 60 });
    res.send(html);
  } catch (error) {
    console.error('Prerender error:', error);
    next();
  }
};
