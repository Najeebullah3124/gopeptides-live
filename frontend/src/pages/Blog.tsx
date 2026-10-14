import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { blogService } from '@/services/blogService';
import { Skeleton } from '@/components/ui/Skeleton';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, resolveImageUrl } from '@/utils/helpers';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { useLangStore } from '@/stores/langStore';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

export default function BlogPage() {
  const { t } = useT();
  const lang = useLangStore((s) => s.lang);
  const pageSeo = usePageSeo('/blog');
  const seo = lang === 'nl'
    ? { title: 'Peptide Onderzoek en Gidsen | GoPeptides', description: 'Lees onderzoeksgidsen, peptide-inzichten en laboratoriumupdates van GoPeptides. Verken HPLC-documentatie, COA-uitleg en onderzoeksmethoden.' }
    : lang === 'de'
      ? { title: 'Peptidforschung und Leitfaeden | GoPeptides', description: 'Lesen Sie Forschungsguides, Peptid-Einblicke und Labor-Updates von GoPeptides. Entdecken Sie HPLC-Dokumentation und Forschungsmethoden.' }
      : { title: 'Peptide Research Guides and Insights | GoPeptides', description: 'Read peptide research guides, laboratory insights, and method updates from GoPeptides. Explore HPLC documentation, COA guidance, and research context.' };
  useSEO({
    title: pageSeo.editable?.title || seo.title,
    description: pageSeo.editable?.description || seo.description,
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates,
  });
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');

  const categories = useQuery({
    queryKey: ['blog', 'categories'],
    queryFn: () => blogService.listCategories(),
  });

  const posts = useQuery({
    queryKey: ['blog', 'posts', page, category, lang],
    queryFn: () => blogService.listPosts(page, 9, category || undefined, lang),
  });

  const data = posts.data?.data ?? [];
  const meta = posts.data?.meta;

  return (
    <div className="container-app py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="badge bg-primary/10 text-primary mb-3">{t('blog.eyebrow')}</div>
        <h1 className="text-4xl font-extrabold text-ink mb-3">{pageSeo.editable?.h1 || t('blog.title')}</h1>
        <p className="text-ink-muted max-w-xl mx-auto">{t('blog.subtitle')}</p>
      </div>

      {/* Category filter */}
      {(categories.data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <button
            onClick={() => { setCategory(''); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              !category
                ? 'bg-primary text-white border-primary'
                : 'border-line text-ink-muted hover:text-ink hover:border-ink'
            }`}
          >
            {t('blog.all')}
          </button>
          {categories.data?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.slug); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                category === cat.slug
                  ? 'bg-primary text-white border-primary'
                  : 'border-line text-ink-muted hover:text-ink hover:border-ink'
              }`}
            >
              {cat.translations?.[lang]?.name || cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Post grid */}
      {posts.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card overflow-hidden">
              <Skeleton className="h-48 rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card p-16 text-center text-ink-muted">
          <p className="text-lg font-semibold mb-2">{t('blog.empty.title')}</p>
          <p className="text-sm">{t('blog.empty.sub')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="card overflow-hidden group hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Featured image */}
              <div className="h-48 bg-surfaceAlt overflow-hidden shrink-0 relative">
                {post.featuredImage ? (
                  <img
                    src={resolveImageUrl(post.featuredImage)}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // If image fails to load, show fallback
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) parent.classList.add('show-fallback');
                    }}
                  />
                ) : null}
                {/* Fallback shown when image is null OR fails to load */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-gold/10 ${
                  post.featuredImage ? 'opacity-0 group-[.show-fallback]:opacity-100' : 'opacity-100'
                }`}>
                  <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center mb-2">
                    <svg className="w-6 h-6 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  {post.category && (
                    <span className="text-xs font-semibold text-primary/60 uppercase tracking-wider">{post.category.translations?.[lang]?.name || post.category.name}</span>
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                {post.category && (
                  <Badge tone="primary" className="mb-2 self-start">
                    {post.category.translations?.[lang]?.name || post.category.name}
                  </Badge>
                )}
                <h2 className="font-bold text-ink text-lg leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2 flex-1">
                  {post.title}
                </h2>
                <p className="text-sm text-ink-muted line-clamp-3 mb-3">{post.excerpt}</p>

                <div className="flex items-center justify-between text-xs text-ink-muted mt-auto pt-2 border-t border-lineSoft">
                  <span>
                    {t('blog.by')} {post.author.firstName} {post.author.lastName}
                  </span>
                  <div className="flex items-center gap-2">
                    {post.readTime && (
                      <span>{t('blog.minRead', { n: post.readTime })}</span>
                    )}
                    <span>
                      {post.publishedAt ? formatDate(post.publishedAt) : ''}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('blog.previous')}
          </Button>
          <span className="text-sm text-ink-muted">
            {t('blog.pageOf', { page, total: meta.totalPages })}
          </span>
          <Button
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('blog.next')}
          </Button>
        </div>
      )}
      
      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}
