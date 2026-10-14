import { PrismaClient } from '@prisma/client';
import { siteUrl } from '../src/services/seoService';

const prisma = new PrismaClient();
const origin = siteUrl();

function fixUrl(url: string): string {
  if (!url || !/localhost|127\.0\.0\.1/i.test(url)) return url;
  try {
    const u = new URL(url);
    return `${origin}${u.pathname}${u.search}`;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/i, origin);
  }
}

function fixSeoJson(raw: string | null): { next: string | null; changed: boolean } {
  if (!raw) return { next: raw, changed: false };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    let changed = false;
    if (typeof data.canonicalUrl === 'string') {
      const fixed = fixUrl(data.canonicalUrl);
      if (fixed !== data.canonicalUrl) { data.canonicalUrl = fixed; changed = true; }
    }
    for (const key of ['internalLinks', 'externalLinks'] as const) {
      if (!Array.isArray(data[key])) continue;
      data[key] = data[key].map((link: { label?: string; href?: string }) => {
        if (!link?.href) return link;
        const fixed = fixUrl(link.href);
        if (fixed !== link.href) { changed = true; return { ...link, href: fixed }; }
        return link;
      });
    }
    return { next: changed ? JSON.stringify(data) : raw, changed };
  } catch {
    return { next: raw, changed: false };
  }
}

async function fixModel(model: { findMany: () => Promise<Array<{ id: string; seoData: string | null }>>; update: (args: unknown) => Promise<unknown> }, name: string) {
  const records = await model.findMany();
  let fixed = 0;
  for (const record of records) {
    const { next, changed } = fixSeoJson(record.seoData);
    if (changed) {
      await model.update({ where: { id: record.id }, data: { seoData: next } });
      fixed++;
    }
  }
  console.log(`Fixed localhost URLs in ${fixed} ${name} record(s)`);
}

async function fixPages() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  if (!row) return;
  const data = JSON.parse(row.value);
  let changed = false;
  for (const pageKey of Object.keys(data)) {
    for (const lang of Object.keys(data[pageKey])) {
      const { next, changed: rowChanged } = fixSeoJson(JSON.stringify(data[pageKey][lang]));
      if (rowChanged) {
        data[pageKey][lang] = JSON.parse(next!);
        changed = true;
      }
    }
  }
  if (changed) {
    await prisma.systemSetting.update({ where: { key: 'SEO_PAGE_META' }, data: { value: JSON.stringify(data) } });
    console.log('Fixed localhost URLs in SEO_PAGE_META');
  } else {
    console.log('No localhost URLs in SEO_PAGE_META');
  }
}

async function main() {
  console.log(`Rewriting localhost SEO URLs to ${origin}`);
  await fixModel(prisma.product, 'product');
  await fixModel(prisma.category, 'category');
  await fixModel(prisma.blogPost, 'blogPost');
  await fixPages();
  await import('../src/services/seoService').then((m) => m.invalidateHtmlSitemapCache());
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
