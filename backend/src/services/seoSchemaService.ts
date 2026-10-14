import type { Organization, Product, WebSite } from 'schema-dts';
import { prisma } from '../config/database';
import { parseSeoMeta, siteUrl } from './seoService';
export const SCHEMA_TYPES = [
  'Organization',
  'WebSite',
  'WebPage',
  'Product',
  'BreadcrumbList',
  'BlogPosting',
  'FAQPage',
  'CollectionPage',
  'ItemList',
  'LocalBusiness',
] as const;

export type SchemaType = (typeof SCHEMA_TYPES)[number];

export interface SchemaPageInfo {
  path: string;
  label: string;
  types: SchemaType[];
}

export const SCHEMA_PAGES: SchemaPageInfo[] = [
  { path: '/', label: 'Home', types: ['Organization', 'WebSite', 'WebPage'] },
  { path: '/shop', label: 'Shop', types: ['CollectionPage', 'ItemList', 'WebPage'] },
  { path: '/faq', label: 'FAQ', types: ['FAQPage', 'WebPage', 'BreadcrumbList'] },
  { path: '/blog', label: 'Blog index', types: ['CollectionPage', 'WebPage', 'BreadcrumbList'] },
  { path: '/contact', label: 'Contact', types: ['LocalBusiness', 'WebPage', 'BreadcrumbList'] },
  { path: '/about', label: 'About', types: ['Organization', 'WebPage', 'BreadcrumbList'] },
  { path: '/:product-slug', label: 'Product detail', types: ['Product', 'BreadcrumbList', 'WebPage'] },
  { path: '/blog/:slug', label: 'Blog post', types: ['BlogPosting', 'BreadcrumbList', 'WebPage'] },
  { path: '/shop/:slug', label: 'Category listing', types: ['CollectionPage', 'ItemList', 'BreadcrumbList'] },
];

function abs(path: string, base = siteUrl()): string {
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildOrganizationSchema(base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GoPeptides',
    legalName: 'GoPeptides B.V.',
    url: base,
    logo: `${base}/logo-336.webp`,
    email: 'info@gopeptides.nl',
    description:
      'GoPeptides supplies HPLC-tested research peptides for laboratory use only, with batch Certificate of Analysis documentation where available. Based in Amsterdam, Netherlands.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Amsterdam',
      addressCountry: 'NL',
    },
    areaServed: 'EU',
    knowsAbout: [
      'research peptides',
      'HPLC testing',
      'Certificate of Analysis',
      'laboratory reagents',
    ],
    // Kept in sync with the real handles in Settings.social (verified 2026-08-17) — wrong handles here
    // actively break entity verification for Google's Knowledge Graph and AI citation systems.
    sameAs: [
      'https://www.instagram.com/GoPeptides1',
      'https://www.tiktok.com/@Go.peptides',
      'https://facebook.com/GoPeptides',
      'https://x.com/GoPeptides',
      'https://gopeptides.de',
      'https://gopeptides.eu',
      'https://gopeptides.be',
    ],
  };
}

export function buildWebSiteSchema(base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GoPeptides',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${base}/shop?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildWebPageSchema(path: string, name: string, description?: string, base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: abs(path, base),
    isPartOf: { '@type': 'WebSite', name: 'GoPeptides', url: base },
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; path?: string }>, base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: item.path.startsWith('http') ? item.path : abs(item.path, base) } : {}),
    })),
  };
}

export function buildProductSchema(
  product: {
    name: string;
    slug: string;
    shortDesc: string;
    sku: string;
    price: number;
    stock: number;
    category: { slug: string; name: string };
    images?: Array<{ url: string }>;
  },
  pageUrl?: string,
  // Only real, approved reviews reach here (see buildPageSeo) — never fabricated.
  reviewStats?: { count: number; average: number } | null,
  base = siteUrl(),
): Record<string, unknown> {
  const path = `/${product.slug}`;
  const url = pageUrl || abs(path, base);
  const imageUrls = (product.images || []).map((img) => (img.url.startsWith('http') ? img.url : abs(img.url, base)));
  const price = Number(product.price).toFixed(2);
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDesc,
    sku: product.sku,
    url,
    image: imageUrls.length ? imageUrls : [`${base}/logo-336.webp`],
    brand: { '@type': 'Brand', name: 'GoPeptides' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EUR',
      price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  // Google requires aggregateRating to reflect genuine reviews — omit entirely when none exist.
  if (reviewStats && reviewStats.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(reviewStats.average.toFixed(1)),
      reviewCount: reviewStats.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return schema;
}

export function buildBlogPostingSchema(post: {
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string | null;
  publishedAt?: Date | null;
  updatedAt: Date;
}, base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    url: abs(`/blog/${post.slug}`, base),
    datePublished: (post.publishedAt || post.updatedAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: 'GoPeptides' },
    publisher: {
      '@type': 'Organization',
      name: 'GoPeptides',
      logo: { '@type': 'ImageObject', url: `${base}/logo.jpeg` },
    },
    ...(post.featuredImage ? { image: post.featuredImage.startsWith('http') ? post.featuredImage : abs(post.featuredImage, base) } : {}),
  };
}

export function buildFAQPageSchema(items: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function buildCollectionPageSchema(category: { name: string; slug: string; description?: string | null }, base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || `${category.name} peptides at GoPeptides`,
    url: abs(`/shop/${category.slug}`, base),
  };
}

export function buildItemListSchema(items: Array<{ name: string; url: string }>, base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : abs(item.url, base),
    })),
  };
}

export function buildLocalBusinessSchema(base = siteUrl()): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'GoPeptides',
    url: base,
    image: `${base}/logo-336.webp`,
    email: 'info@gopeptides.nl',
    // Real values from Settings.contact / Settings.social — verified 2026-08-17, ties this
    // entity to the actual Google Business Profile (placeId ChIJP40W2xoLxkcR1VHaE5jeXLw).
    telephone: '+31685108914',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Johan Cruijff Boulevard',
      addressLocality: 'Amsterdam',
      addressCountry: 'NL',
    },
    hasMap: 'https://www.google.com/maps/place/?q=place_id:ChIJP40W2xoLxkcR1VHaE5jeXLw',
    sameAs: [
      'https://www.instagram.com/GoPeptides1',
      'https://www.tiktok.com/@Go.peptides',
      'https://facebook.com/GoPeptides',
      'https://x.com/GoPeptides',
    ],
  };
}

const DEFAULT_FAQ: Array<{ question: string; answer: string }> = [
  { question: 'What are research peptides?', answer: 'Research peptides are compounds sold strictly for laboratory research purposes.' },
  { question: 'How fast is shipping?', answer: 'Orders ship within 24 hours across the EU.' },
  { question: 'Do you provide COA documents?', answer: 'Yes, every batch includes HPLC testing and Certificate of Analysis.' },
];

export async function buildSchemaPreview(): Promise<{
  supported: SchemaType[];
  pages: SchemaPageInfo[];
  samples: Record<string, Record<string, unknown>>;
  byPage: Array<{ page: SchemaPageInfo; schemas: Record<string, unknown>[] }>;
}> {
  const [product, category, post, products] = await Promise.all([
    prisma.product.findFirst({
      where: { isActive: true },
      include: { category: true, images: { take: 3, orderBy: { position: 'asc' } } },
    }),
    prisma.category.findFirst({ orderBy: { name: 'asc' } }),
    prisma.blogPost.findFirst({ where: { status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' } }),
    prisma.product.findMany({ where: { isActive: true }, take: 5, select: { name: true, slug: true, category: { select: { slug: true } } } }),
  ]);

  const samples: Record<string, Record<string, unknown>> = {
    Organization: buildOrganizationSchema(),
    WebSite: buildWebSiteSchema(),
    WebPage: buildWebPageSchema('/', 'GoPeptides — Research Peptides', 'Research-grade peptides with HPLC testing and COA.'),
    LocalBusiness: buildLocalBusinessSchema(),
    FAQPage: buildFAQPageSchema(DEFAULT_FAQ),
    BreadcrumbList: buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
      { name: product?.name || 'Product', path: product ? `/${product.slug}` : undefined },
    ]),
    ItemList: buildItemListSchema(
      products.map((p) => ({ name: p.name, url: `/${p.slug}` })),
    ),
  };

  if (product) samples.Product = buildProductSchema(product);
  if (category) samples.CollectionPage = buildCollectionPageSchema(category);
  if (post) samples.BlogPosting = buildBlogPostingSchema(post);

  const byPage = SCHEMA_PAGES.map((page) => {
    const schemas: Record<string, unknown>[] = [];
    for (const type of page.types) {
      if (samples[type]) schemas.push(samples[type]);
    }
    return { page, schemas };
  });

  return { supported: [...SCHEMA_TYPES], pages: SCHEMA_PAGES, samples, byPage };
}

export function collectContentKeywords(items: Array<{ seoData?: string | null; seoTitle?: string | null }>): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const seo = parseSeoMeta(item.seoData);
    for (const kw of seo.focusKeywords || []) {
      const trimmed = kw.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
