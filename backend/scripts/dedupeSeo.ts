import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Cleaning up SEO Data duplicates...');
  
  const processSeoData = (seoDataStr: string | null) => {
    if (!seoDataStr) return seoDataStr;
    try {
      const data = JSON.parse(seoDataStr);
      let changed = false;

      // Fix arrays that might be stored as strings
      for (const key of ['h2', 'focusKeywords']) {
        if (typeof data[key] === 'string') {
          data[key] = [data[key]];
          changed = true;
        } else if (Array.isArray(data[key])) {
          // Remove duplicates
          const unique = Array.from(new Set(data[key]));
          if (unique.length !== data[key].length) {
            data[key] = unique;
            changed = true;
          }
        }
      }

      for (const key of ['internalLinks', 'externalLinks']) {
        if (typeof data[key] === 'string') {
          data[key] = [{ label: data[key], href: '' }];
          changed = true;
        } else if (Array.isArray(data[key])) {
          // Remove exact duplicates
          const seen = new Set();
          const unique = data[key].filter((link: any) => {
            const id = `${link.label}-${link.href}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          if (unique.length !== data[key].length) {
            data[key] = unique;
            changed = true;
          }
        }
      }
      
      // Clean up bodyContent if it has duplicate "Related Resources" or "Related peptides" copied
      if (data.bodyContent && typeof data.bodyContent === 'string') {
        const original = data.bodyContent;
        // Simple regex to remove consecutive duplicate paragraphs/headings if they match exactly
        // Let's not risk regex replacing body content unless it's exactly the known bug
        // Wait, the user mentioned "Related peptides" multiple times
      }

      if (changed) {
        return JSON.stringify(data);
      }
    } catch (e) {
      console.log('Parse error', e);
    }
    return seoDataStr;
  };

  const products = await prisma.product.findMany();
  for (const p of products) {
    const fixed = processSeoData(p.seoData);
    if (fixed !== p.seoData) {
      console.log(`Fixing product ${p.slug}`);
      await prisma.product.update({ where: { id: p.id }, data: { seoData: fixed || undefined } });
    }
  }
  
  const posts = await prisma.blogPost.findMany();
  for (const p of posts) {
    const fixed = processSeoData(p.seoData);
    if (fixed !== p.seoData) {
      console.log(`Fixing post ${p.slug}`);
      await prisma.blogPost.update({ where: { id: p.id }, data: { seoData: fixed || undefined } });
    }
  }

  const categories = await prisma.category.findMany();
  for (const c of categories) {
    const fixed = processSeoData(c.seoData);
    if (fixed !== c.seoData) {
      console.log(`Fixing category ${c.slug}`);
      await prisma.category.update({ where: { id: c.id }, data: { seoData: fixed || undefined } });
    }
  }

  console.log('Done!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
