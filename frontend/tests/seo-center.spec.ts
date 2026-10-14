import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('gp-age-verified', 'yes');
    localStorage.setItem('gp-welcome-dismissed', 'yes');
  });
  await page.reload();
  await page.fill('input[type="email"]', 'admin@gopeptides.nl');
  await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD || '');
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.status() === 200,
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: /Inloggen|Log in/i }).click();
  await loginResponse;
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe('SEO Center', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('overview dashboard loads', async ({ page }) => {
    await page.goto('/admin/seo');
    await expect(page.locator('h2')).toContainText('SEO Center');
    await expect(page.getByText('Indexed content')).toBeVisible();
    await expect(page.getByText('Image alt issues')).toBeVisible();
    await expect(page.getByText('Active redirects')).toBeVisible();
  });

  test('navigates all SEO category tabs', async ({ page }) => {
    await page.goto('/admin/seo');

    const tabs = [
      { path: '/admin/seo/on-page', heading: 'Content SEO inventory' },
      { path: '/admin/seo/technical', heading: 'Indexing & crawlability' },
      { path: '/admin/seo/off-page', heading: 'Tracked keywords' },
      { path: '/admin/seo/content-i18n', heading: 'Storefront locales' },
      { path: '/admin/seo/performance', heading: 'Image SEO' },
    ];

    for (const tab of tabs) {
      await page.goto(tab.path);
      await expect(page.locator('h3').filter({ hasText: tab.heading })).toBeVisible();
    }
  });

  test('sidebar links to SEO Center', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'SEO Center' }).click();
    await expect(page).toHaveURL(/\/admin\/seo/);
    await expect(page.locator('h2')).toContainText('SEO Center');
  });

  test('redirect manager create and delete', async ({ page }) => {
    const source = `/seo-ui-test-${Date.now()}`;
    const dest = '/shop';

    await page.goto('/admin/seo/technical');
    await page.getByPlaceholder('/old-page').fill(source);
    await page.getByPlaceholder('/new-page').fill(dest);
    await page.getByRole('button', { name: 'Add redirect' }).click();
    await expect(page.getByText(`${source} → ${dest}`)).toBeVisible();

    const row = page.locator('div').filter({ hasText: `${source} → ${dest}` });
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(`${source} → ${dest}`)).not.toBeVisible();
  });

  test('public robots and sitemap via frontend proxy', async ({ request }) => {
    const robots = await request.get('http://127.0.0.1:3001/robots.txt');
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain('User-agent:');
    expect(robotsText).toContain('Sitemap:');

    const sitemap = await request.get('http://127.0.0.1:3001/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain('<urlset');
  });
});
