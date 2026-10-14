import puppeteer, { Browser } from 'puppeteer';
import { cache } from './cacheService';
import { siteUrl } from './seoService';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;
  browserInstance = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });
  return browserInstance;
}

export async function renderPageDynamically(pathStr: string): Promise<string> {
  // Try to hit the local port first to avoid public network loopbacks if possible,
  // but fallback to siteUrl() for full pathing. Local port 3001 is where express listens.
  // Wait, if it hits local port 3001, React router needs the correct base. Using siteUrl() is safest.
  const url = `${siteUrl()}${pathStr}`;
  const cacheKey = `prerender:v2:${pathStr}`;
  const cached = await cache.get<string>(cacheKey);
  if (cached) return cached;

  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rt = req.resourceType();
      if (['image', 'media', 'font'].includes(rt) || req.url().includes('google-analytics') || req.url().includes('googletagmanager')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Check if #root is populated
    await page.waitForFunction(
      'document.getElementById("root") && document.getElementById("root").innerHTML.trim().length > 10',
      { timeout: 5000 }
    ).catch(() => {});

    // Ensure we don't cache 404s/errors if possible, though React handles 404 via UI.
    const html = await page.content();
    
    // Cache for 24 hours (86400 seconds)
    await cache.set(cacheKey, html, 86400);
    return html;
  } catch (error) {
    console.error(`[DynamicRender] Failed to render ${url}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}
