import { Link, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { blogService } from '@/services/blogService';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, resolveImageUrl } from '@/utils/helpers';


import { useT } from '@/hooks/useT';
import { useLangStore } from '@/stores/langStore';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { JsonLd } from '@/components/seo/JsonLd';
import type { BlogPosting, WithContext } from 'schema-dts';
import { parseSeoData } from '@/utils/seoMeta';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function BlogPostPage() {
  const { t } = useT();
  const lang = useLangStore((s) => s.lang);
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog', 'post', slug, lang],
    queryFn: () => blogService.getPostBySlug(slug!, lang),
    enabled: !!slug,
    retry: false,
  });

  const postPath = slug ? `/blog/${slug}` : '/blog';
  const pageSeo = usePageSeo(postPath);
  const seoData = parseSeoData(post?.seoData);

  useSEO({
    title: post?.seoTitle || seoData.title || post?.title || t('blog.title'),
    description: post?.seoDescription || seoData.description || post?.excerpt || t('blog.subtitle'),
    image: seoData.socialImage || post?.featuredImage || undefined,
    canonical: seoData.canonicalUrl || pageSeo.canonical,
    keywords: seoData.focusKeywords,
    alternates: pageSeo.alternates,
  });

  const blogJsonLd: WithContext<BlogPosting> | null = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt || post.updatedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'GoPeptides' },
    url: `https://gopeptides.nl/blog/${post.slug}`,
    mainEntityOfPage: `https://gopeptides.nl/blog/${post.slug}`,
    ...(post.featuredImage ? { image: resolveImageUrl(post.featuredImage) } : {}),
  } : null;

  const renderedContent = post?.content || '';

  if (isError) return <Navigate to="/blog" replace />;

  return (
    <div className="container-app py-12">
      {blogJsonLd && <JsonLd data={blogJsonLd} />}
      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : post ? (
          <>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-ink-muted mb-6 flex-wrap">
              <Link to="/" className="hover:text-ink transition-colors">Home</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-ink transition-colors">{t('blog.eyebrow')}</Link>
              <span>/</span>
              <span className="text-ink line-clamp-1">{post.title}</span>
            </nav>

            {/* Auto-translated notice */}
            {post.autoTranslated && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-surfaceAlt border border-line text-sm text-ink-muted flex items-center gap-2">
                <span>🌐</span>
                <span>
                  {lang === 'nl'
                    ? 'Automatisch vertaald via Google Translate.'
                    : lang === 'de'
                    ? 'Automatisch übersetzt von Google Translate.'
                    : 'Auto-translated by Google Translate.'}
                </span>
              </div>
            )}

            {/* Category */}
            {post.category && (
              <Badge tone="primary" className="mb-3">
                {post.category.name}
              </Badge>
            )}

            {/* Title — prefer API-localized title over English-only seoData.h1 */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink mb-4 leading-tight">
              {post.title || seoData.h1}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted mb-6 pb-6 border-b border-line">
              <span>
                {t('blog.by')} {post.author.firstName} {post.author.lastName}
              </span>
              {post.publishedAt && (
                <span>· {formatDate(post.publishedAt)}</span>
              )}
              {post.readTime && (
                <span>· {t('blog.minRead', { n: post.readTime })}</span>
              )}
              <span>· {t('blog.views', { n: post.viewsCount })}</span>
            </div>

            {/* Featured image */}
            {post.featuredImage && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-sm">
              <img
                  src={resolveImageUrl(post.featuredImage)}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  width={1200}
                  height={630}
                  className="w-full object-cover max-h-[440px]"
                />
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-surfaceAlt text-ink-muted border border-line"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* TipTap HTML content; the article title above is the single H1. */}
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />

            {/* Back link */}
            <div className="mt-12 pt-6 border-t border-line">
              <Link
                to="/blog"
                className="text-sm font-semibold text-primary hover:text-primary-light transition-colors"
              >
                {t('blog.backToAll')}
              </Link>
            </div>
          </>
        ) : null}
      </div>
      
      <SeoContentBlock seo={seoData} />
    </div>
  );
}
