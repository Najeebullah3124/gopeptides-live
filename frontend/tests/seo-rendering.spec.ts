import { test, expect } from '@playwright/test';

// SEO tests hit Express directly (:3001) — Vite (:5173) doesn't inject server-side SEO tags.
const API_BASE = process.env.SEO_TEST_API || 'http://127.0.0.1:3001';

test.describe('Server-rendered SEO HTML', () => {
  test('homepage (NL default) includes canonical, hreflang, and JSON-LD', async ({ request }) => {
    const res = await request.get(`${API_BASE}/`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('<link rel="canonical"');
    expect(html).toContain('hreflang="nl"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="de"');
    expect(html).toContain('hreflang="x-default"');
    expect(html).toContain('application/ld+json');
    expect(html).toMatch(/<title>[^<]+GoPeptides[^<]*<\/title>/i);
    // NL is default: canonical should NOT have ?lang= param
    expect(html).toMatch(/rel="canonical" href="[^"]*[^?lang=nl]"/);
  });

  test('English locale /?lang=en includes en html lang and ?lang=en canonical', async ({ request }) => {
    const res = await request.get(`${API_BASE}/?lang=en`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/<html[^>]*lang="en"/i);
    expect(html).toContain('lang=en');
    expect(html).toContain('hreflang="nl"');
    expect(html).toContain('hreflang="x-default"');
  });

  test('German locale /?lang=de includes de html lang', async ({ request }) => {
    const res = await request.get(`${API_BASE}/?lang=de`);
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toMatch(/<html[^>]*lang="de"/i);
    expect(html).toContain('lang=de');
  });

  test('sitemap includes query-param locale URLs and hreflang links', async ({ request }) => {
    const res = await request.get(`${API_BASE}/sitemap.xml`);
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).toContain('lang=en');
    expect(xml).toContain('lang=de');
    expect(xml).toContain('hreflang');
    expect(xml).toContain('x-default');
  });
});
