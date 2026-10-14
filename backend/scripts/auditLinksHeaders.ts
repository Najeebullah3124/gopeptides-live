import { prisma } from '../src/config/database';
import { buildPageSeo } from '../src/services/seoMetaService';

async function main() {
  const products = await prisma.product.findMany({ where: { isActive: true }, select: { slug: true } });
  const categories = await prisma.category.findMany({ select: { slug: true } });
  const posts = await prisma.blogPost.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true } });

  const issues: string[] = [];
  let checked = 0;

  async function check(kind: string, path: string) {
    for (const lang of ['nl', 'de', 'en'] as const) {
      const query = lang === 'nl' ? '' : `?lang=${lang}`;
      const seo = await buildPageSeo(path, query, 'https://gopeptides.nl');
      checked++;
      const h1 = seo.h1?.trim();
      const h2 = seo.editable?.h2 || [];
      const links = seo.editable?.internalLinks || [];
      if (!h1) issues.push(`[${kind}] ${path} (${lang}): MISSING H1`);
      if (h2.length === 0) issues.push(`[${kind}] ${path} (${lang}): NO H2`);
      if (links.length === 0) issues.push(`[${kind}] ${path} (${lang}): NO INTERNAL LINKS`);
      else if (links.length < 2) issues.push(`[${kind}] ${path} (${lang}): only ${links.length} internal link(s)`);
    }
  }

  for (const p of products) await check('product', `/${p.slug}`);
  for (const c of categories) await check('category', `/shop/${c.slug}`);
  for (const b of posts) await check('post', `/blog/${b.slug}`);

  console.log(`Checked ${checked} page/lang combinations across ${products.length} products, ${categories.length} categories, ${posts.length} posts.`);
  console.log(`Issues found: ${issues.length}`);
  for (const i of issues) console.log(' -', i);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
