import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database';
import { parseSeoMeta, type SeoMeta } from '../src/services/seoService';

type KeywordRow = {
  page: string;
  primary: string;
  secondary: string[];
  longTail: string[];
  titleDirection: string;
};

function truncate(value: string, max = 155): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).trimEnd()}...`;
}

function toKeywords(...values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => (value || '').replace(/\s+/g, ' ').trim()).filter(Boolean)));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
}

function keywordMapPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'SEO_Keyword_Map_GoPeptides.md'),
    path.resolve(process.cwd(), '..', 'SEO_Keyword_Map_GoPeptides.md'),
  ];
  return candidates.find((filePath) => fs.existsSync(filePath)) || null;
}

function loadKeywordRows(): KeywordRow[] {
  const filePath = keywordMapPath();
  if (!filePath) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('Page | Primary keyword'))
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 8)
    .map((parts) => ({
      page: parts[1],
      primary: parts[2],
      secondary: parts[3].split(',').map((item) => item.trim()).filter(Boolean),
      longTail: parts[4].split(',').map((item) => item.trim()).filter(Boolean),
      titleDirection: parts[7],
    }));
}

const KEYWORD_ROWS = loadKeywordRows();

function matchKeywordRow(label: string, slug: string, pageType: string): KeywordRow | null {
  const haystack = normalizeKey(`${label} ${slug} ${pageType}`);
  return KEYWORD_ROWS.find((entry) => {
    const pageKey = normalizeKey(entry.page);
    return haystack.includes(pageKey) || pageKey.includes(normalizeKey(label)) || pageKey.includes(normalizeKey(slug));
  }) || null;
}

function mergeKeywords(current: SeoMeta, row: KeywordRow | null, fallback: string[]): string[] {
  return toKeywords(
    ...(current.focusKeywords || []),
    ...(row ? [row.primary, ...row.secondary, ...row.longTail] : []),
    ...fallback,
  ).slice(0, 8);
}

function withProductSeo(
  current: SeoMeta,
  input: { name: string; slug: string; shortDesc?: string; description?: string; image?: string | null; weight?: string | null },
): SeoMeta {
  const row = matchKeywordRow(input.name, input.slug, 'product');
  const dose = input.weight?.trim() ? ` ${input.weight.trim()}` : '';
  const fallbackTitle = `${input.name}${dose} Research Peptide`;
  const titleRaw = row?.titleDirection || fallbackTitle;
  const titleBase = dose && !titleRaw.includes(input.weight!.trim()) ? fallbackTitle : titleRaw;
  const descriptionBase = input.shortDesc || input.description || `Browse HPLC-tested ${input.name}${dose} research peptide details, batch documentation, and Certificate of Analysis support from GoPeptides.`;
  return {
    ...current,
    title: `${titleBase} | GoPeptides`,
    description: truncate(descriptionBase),
    focusKeywords: mergeKeywords(current, row, [input.name, `${input.name}${dose} research peptide`, `${input.name} peptides Europe`]),
    robots: current.robots || 'index,follow',
    socialImage: current.socialImage || input.image || undefined,
    h1: current.h1 || `${input.name}${dose}`.trim(),
    h2: current.h2?.length ? current.h2 : [`${input.name}${dose} specifications`, `${input.name} batch COA`],
  };
}

function withCategorySeo(current: SeoMeta, input: { name: string; slug: string; description?: string | null }): SeoMeta {
  const row = matchKeywordRow(input.name, input.slug, 'category');
  const titleBase = row?.titleDirection || `${input.name} Research Peptides`;
  const descriptionBase = input.description || `Browse HPLC-tested ${input.name} research peptides with batch documentation and Certificate of Analysis support from GoPeptides.`;
  return {
    ...current,
    title: `${titleBase} | GoPeptides`,
    description: truncate(descriptionBase),
    focusKeywords: mergeKeywords(current, row, [input.name, `${input.name} research peptides`, `${input.name} peptides Europe`]),
    robots: current.robots || 'index,follow',
    h1: current.h1 || titleBase,
  };
}

function withBlogSeo(current: SeoMeta, input: { title: string; slug: string; description?: string | null; image?: string | null }): SeoMeta {
  const row = matchKeywordRow(input.title, input.slug, 'post');
  const descriptionBase = input.description || 'Read this GoPeptides research article covering peptide science, batch documentation, and research-use-only guidance.';
  return {
    ...current,
    title: `${input.title} | GoPeptides Blog`,
    description: truncate(descriptionBase),
    focusKeywords: mergeKeywords(current, row, [input.title, 'research peptides blog', 'peptide research guides']),
    robots: current.robots || 'index,follow',
    socialImage: current.socialImage || input.image || undefined,
    h1: current.h1 || input.title,
  };
}

async function main() {
  const [products, categories, posts] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDesc: true,
        description: true,
        weight: true,
        seoData: true,
        images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
      },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, description: true, seoData: true },
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, slug: true, excerpt: true, featuredImage: true, seoTitle: true, seoDescription: true, seoData: true },
    }),
  ]);

  for (const product of products) {
    const nextSeo = withProductSeo(parseSeoMeta(product.seoData), {
      name: product.name,
      slug: product.slug,
      shortDesc: product.shortDesc,
      description: product.description,
      weight: product.weight,
      image: product.images[0]?.url,
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { seoData: JSON.stringify(nextSeo) },
    });
  }

  for (const category of categories) {
    const nextSeo = withCategorySeo(parseSeoMeta(category.seoData), {
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    await prisma.category.update({
      where: { id: category.id },
      data: { seoData: JSON.stringify(nextSeo) },
    });
  }

  for (const post of posts) {
    const nextSeo = withBlogSeo(parseSeoMeta(post.seoData), {
      title: post.title,
      slug: post.slug,
      description: post.seoDescription || post.excerpt,
      image: post.featuredImage,
    });
    await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        seoTitle: nextSeo.title,
        seoDescription: nextSeo.description,
        seoData: JSON.stringify(nextSeo),
      },
    });
  }

  console.log(`SEO metadata seeded: ${products.length} products, ${categories.length} categories, ${posts.length} published blog posts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
