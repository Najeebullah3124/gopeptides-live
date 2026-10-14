import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { load } from 'cheerio';
import { prisma } from '../config/database';
import { logAudit } from '../utils/audit';

import { ApiError, created, noContent, ok } from '../utils/apiResponse';
import { mergeSeoMeta, parseSeoMeta, type SeoMeta } from '../services/seoService';
import { blogSeoForLang, blogTopSeoLang } from '../utils/blogSeo';

interface LangOverride {
  title?: string;
  content?: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
}

type LangCode = 'en' | 'nl' | 'de';

interface BlogPostBody {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  status?: string;
  categoryId?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoData?: string | SeoMeta;
  readTime?: number;
  baseLanguage?: string;
  translations?: Record<string, LangOverride>;
}

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function stripBlogBrandSuffix(title: string): string {
  return title.replace(/\s*[|—–-]\s*GoPeptides(\s+Blog)?\s*$/i, '').trim();
}

function mergeBlogSeo(
  existing: { seoData: string | null; seoTitle: string | null; seoDescription: string | null },
  body: Pick<BlogPostBody, 'seoTitle' | 'seoDescription' | 'seoData'>,
): { seoData: string; seoTitle: string | null; seoDescription: string | null } {
  const patch: SeoMeta = {};
  if (body.seoData !== undefined) {
    Object.assign(patch, typeof body.seoData === 'object' ? body.seoData : parseSeoMeta(body.seoData));
  }
  if (body.seoTitle !== undefined) patch.title = stripBlogBrandSuffix(body.seoTitle || '') || undefined;
  if (body.seoDescription !== undefined) patch.description = body.seoDescription?.trim() || undefined;
  const merged = mergeSeoMeta(parseSeoMeta(existing.seoData), patch);
  return {
    seoData: JSON.stringify(merged),
    seoTitle: merged.title ?? existing.seoTitle,
    seoDescription: merged.description ?? existing.seoDescription,
  };
}

function parseTranslations(raw: string): Record<string, LangOverride> {
  try { return JSON.parse(raw); } catch { return {}; }
}

const ALLOWED_BLOG_TAGS = new Set(['a', 'b', 'blockquote', 'br', 'code', 'em', 'h2', 'h3', 'h4', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'strike', 'strong', 'ul']);

function allowedUrl(value: string, image = false): boolean {
  if (value.startsWith('/uploads/')) return true;
  if (!image && value.startsWith('mailto:')) return true;
  return /^https?:\/\//i.test(value);
}

function sanitizeBlogContent(content: string): string {
  const $ = load(content || '', null, false);
  $('script, style, iframe, object, embed, form').remove();

  $('*').each((_, element) => {
    const node = $(element);
    const htmlElement = element as { tagName: string; attribs?: Record<string, string> };
    const tag = htmlElement.tagName.toLowerCase();
    if (!ALLOWED_BLOG_TAGS.has(tag)) {
      node.replaceWith(node.contents());
      return;
    }

    for (const attribute of Object.keys(htmlElement.attribs || {})) {
      const allowed = (tag === 'a' && ['href', 'target', 'title', 'rel'].includes(attribute))
        || (tag === 'img' && ['src', 'alt', 'title'].includes(attribute));
      if (!allowed) node.removeAttr(attribute);
    }

    if (tag === 'a') {
      const href = node.attr('href') || '';
      if (!allowedUrl(href)) node.removeAttr('href');
      if (node.attr('target') === '_blank') node.attr('rel', 'noopener noreferrer');
    }
    if (tag === 'img' && !allowedUrl(node.attr('src') || '', true)) node.remove();
  });

  return $.root().html() || '';
}

export function publishErrors(post: Pick<BlogPostBody, 'content' | 'featuredImage' | 'featuredImageAlt' | 'seoTitle' | 'seoDescription'>): string[] {
  const $ = load(post.content || '', null, false);
  const words = $.text().trim().split(/\s+/).filter(Boolean).length;
  const missingImageAlt = $('img').toArray().some((image) => !$(image).attr('alt')?.trim());
  const errors: string[] = [];
  if (words < 500) errors.push('Content must contain at least 500 words');
  if (!$('h2').length) errors.push('Content must include at least one H2 heading');
  if (!post.featuredImage) errors.push('A featured image is required');
  if (!post.featuredImageAlt?.trim()) errors.push('Featured image alt text is required');
  const seoTitle = stripBlogBrandSuffix(post.seoTitle || '');
  if (!seoTitle || seoTitle.length < 30 || seoTitle.length > 70) errors.push('SEO title (English): 30 to 70 characters (without "| GoPeptides Blog")');
  if (!post.seoDescription || post.seoDescription.length < 120 || post.seoDescription.length > 160) errors.push('Meta description (English): 120 to 160 characters');
  if (missingImageAlt) errors.push('Every inline image needs alt text');
  return errors;
}

function requirePublishable(post: Pick<BlogPostBody, 'content' | 'featuredImage' | 'featuredImageAlt' | 'seoTitle' | 'seoDescription'>): void {
  const errors = publishErrors(post);
  if (errors.length) throw ApiError.badRequest(errors.join('. '));
}

function sanitizeTranslations(translations?: Record<string, LangOverride>): Record<string, LangOverride> {
  return Object.fromEntries(Object.entries(translations || {}).map(([lang, value]) => [lang, {
    ...value,
    ...(value.seoTitle ? { seoTitle: stripBlogBrandSuffix(value.seoTitle) } : {}),
    ...(value.content !== undefined ? { content: sanitizeBlogContent(value.content) } : {}),
  }]));
}

// Free Google Translate (same backend as translate.google.com, no API key)
async function gtxTranslate(text: string, target: string, source: string): Promise<string> {
  if (!text.trim() || source === target) return text;
  const { data } = await axios.get('https://translate.googleapis.com/translate_a/single', {
    params: { client: 'gtx', sl: source, tl: target, dt: 't', q: text },
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000,
  });
  return (data[0] as string[][]).map((chunk) => chunk[0] ?? '').join('');
}

async function resolveTranslation(
  post: { id: string; title: string; content: string; excerpt: string; baseLanguage?: string | null; translations: string },
  lang: LangCode,
): Promise<{
  title: string;
  content: string;
  excerpt: string;
  seoTitle?: string;
  seoDescription?: string;
  autoTranslated: boolean;
}> {
  const baseLang = (post.baseLanguage || 'en') as LangCode;
  const stored = parseTranslations(post.translations);
  const hit = stored[lang];

  // Prefer explicit NL/DE/EN tab content even when baseLanguage matches.
  // (Admin "English" fields are often still English while baseLanguage was set to nl.)
  if (hit?.content?.trim()) {
    return {
      title: hit.title?.trim() || post.title,
      content: hit.content,
      excerpt: hit.excerpt?.trim() || post.excerpt,
      seoTitle: hit.seoTitle?.trim() || undefined,
      seoDescription: hit.seoDescription?.trim() || undefined,
      autoTranslated: false,
    };
  }

  if (lang === baseLang) {
    return { title: post.title, content: post.content, excerpt: post.excerpt, autoTranslated: false };
  }

  // No stored translation → auto-translate using free Google Translate
  try {
    const [title, content, excerpt] = await Promise.all([
      gtxTranslate(post.title, lang, baseLang),
      gtxTranslate(post.content, lang, baseLang),
      gtxTranslate(post.excerpt, lang, baseLang),
    ]);

    // Cache body only — keep any existing seoTitle/seoDescription on that lang
    const updated = { ...stored, [lang]: { ...hit, title, content, excerpt } };
    prisma.blogPost.update({
      where: { id: post.id },
      data: { translations: JSON.stringify(updated) },
    }).catch(() => { /* non-blocking cache write */ });

    return { title, content, excerpt, autoTranslated: true };
  } catch (err) {
    console.error(`[translate] failed to auto-translate blog ${post.id} to ${lang}:`, err);
    return { title: post.title, content: post.content, excerpt: post.excerpt, autoTranslated: false };
  }
}

// Used by admin endpoints (no language resolution needed)
function serializePost(post: Record<string, unknown>): Record<string, unknown> {
  return {
    ...post,
    content: typeof post.content === 'string' ? sanitizeBlogContent(post.content) : post.content,
    tags: parseTags(post.tags as string),
    translations: sanitizeTranslations(parseTranslations((post.translations as string) ?? '{}')),
  };
}

// Public: list published posts
export async function listPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Number(req.query.limit) || 9);
    const skip = (page - 1) * limit;
    const categorySlug = req.query.category as string | undefined;
    const lang = (['nl', 'de'].includes(req.query.lang as string) ? req.query.lang : 'en') as LangCode;

    const where: Record<string, unknown> = { status: 'PUBLISHED' };
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    // For listings apply stored translations only (no per-card API calls)
    ok(res, {
      data: posts.map((p) => {
        const base = serializePost(p as unknown as Record<string, unknown>);
        const stored = base.translations as Record<string, { title?: string; excerpt?: string; content?: string }>;
        const override = lang !== 'en' ? (stored[lang] ?? {}) : {};
        return {
          ...base,
          title: override.title || base.title,
          excerpt: override.excerpt || (base.excerpt as string),
          lang,
          hasTranslation: lang !== 'en' ? !!(stored[lang]?.content) : true,
        };
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// Public: get post by slug + increment view count
export async function getPostBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug } = req.params;
    const lang = (['nl', 'de'].includes(req.query.lang as string) ? req.query.lang : 'en') as LangCode;

    let post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post) {
      const needle = slug.trim().toLowerCase();
      const all = await prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });
      post =
        all.find((p) => {
          const seo = parseSeoMeta(p.seoData);
          return seo.slugEn?.toLowerCase() === needle || seo.slugDe?.toLowerCase() === needle;
        }) || null;
    }

    if (!post || post.status !== 'PUBLISHED') throw ApiError.notFound('Blog post not found');

    // Increment views and resolve translation in parallel
    const [, resolved] = await Promise.all([
      prisma.blogPost.update({ where: { id: post.id }, data: { viewsCount: { increment: 1 } } }),
      resolveTranslation(post, lang),
    ]);

    const serialized = serializePost(post as unknown as Record<string, unknown>);
    // Only this language's own SEO box — never the top box when it belongs to another language.
    const ownSeo = blogSeoForLang(post, lang);
    const seoTitle = ownSeo.title || resolved.title;
    const seoDescription = ownSeo.description || resolved.excerpt;
    const savedSeo = parseSeoMeta(typeof serialized.seoData === 'string' ? serialized.seoData : null);
    const keepSavedH1 = lang === 'en' && blogTopSeoLang(post) === 'en' && savedSeo.h1;
    ok(res, {
      ...serialized,
      title: resolved.title,
      content: sanitizeBlogContent(resolved.content),
      excerpt: resolved.excerpt,
      seoTitle,
      seoDescription,
      seoData: JSON.stringify({
        ...savedSeo,
        title: seoTitle,
        description: seoDescription,
        h1: keepSavedH1 ? savedSeo.h1 : resolved.title,
      }),
      lang,
      hasTranslation: !resolved.autoTranslated,
      autoTranslated: resolved.autoTranslated,
    });
  } catch (err) {
    next(err);
  }
}

// Public: list categories
export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lang = (['nl', 'de'].includes(req.query.lang as string) ? req.query.lang : 'en') as string;
    const categories = await prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    ok(res, categories.map((cat) => {
      let translations: Record<string, { name?: string; description?: string }> = {};
      try {
        if (cat.translations) translations = JSON.parse(cat.translations);
      } catch (e) {}
      const override = lang !== 'en' ? (translations[lang] || {}) : {};
      return {
        ...cat,
        name: override.name || cat.name,
        description: override.description || cat.description,
        translations,
      };
    }));
  } catch (err) {
    next(err);
  }
}

// Admin: list all posts
export async function adminListPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    ok(res, {
      data: posts.map((p) => serializePost(p as unknown as Record<string, unknown>)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// Admin: get single post by id
export async function adminGetPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post) throw ApiError.notFound('Blog post not found');
    ok(res, serializePost(post as unknown as Record<string, unknown>));
  } catch (err) {
    next(err);
  }
}

// Admin: create post
export async function adminCreatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as BlogPostBody;
    const authorId = (req as Request & { user?: { id: string } }).user?.id;
    if (!authorId) throw ApiError.unauthorized('Not authenticated');

    const slug = String(body.slug || '').trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw ApiError.badRequest('Slug must be lowercase letters, numbers, and single dashes only.');
    }
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) throw ApiError.badRequest('Slug already in use');
    const content = sanitizeBlogContent(body.content);
    if (body.status === 'PUBLISHED') requirePublishable({ ...body, content });

    const now = new Date();
    const seoFields = mergeBlogSeo({ seoData: null, seoTitle: null, seoDescription: null }, body);
    const post = await prisma.blogPost.create({
      data: {
        title: body.title,
        slug,
        content,
        excerpt: body.excerpt,
        featuredImage: body.featuredImage || null,
        featuredImageAlt: body.featuredImageAlt || null,
        status: body.status || 'DRAFT',
        categoryId: body.categoryId || null,
        authorId,
        tags: JSON.stringify(body.tags || []),
        seoTitle: seoFields.seoTitle,
        seoDescription: seoFields.seoDescription,
        seoData: seoFields.seoData,
        readTime: body.readTime || null,
        baseLanguage: body.baseLanguage || 'en',
        translations: JSON.stringify(sanitizeTranslations(body.translations)),
        publishedAt: body.status === 'PUBLISHED' ? now : null,
      },
    });

    await logAudit({
      userId: authorId,
      action: 'CREATE',
      entity: 'BlogPost',
      entityId: post.id,
      metadata: { title: post.title, status: post.status },
      ipAddress: req.ip,
    });

    created(res, serializePost(post as unknown as Record<string, unknown>), 'Blog post created');
  } catch (err) {
    next(err);
  }
}

// Admin: update post
export async function adminUpdatePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as Partial<BlogPostBody>;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Blog post not found');

    if (body.slug && body.slug !== existing.slug) {
      const nextSlug = String(body.slug).trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
        throw ApiError.badRequest('Slug must be lowercase letters, numbers, and single dashes only.');
      }
      const slugConflict = await prisma.blogPost.findUnique({ where: { slug: nextSlug } });
      if (slugConflict) throw ApiError.badRequest('Slug already in use');
      body.slug = nextSlug;
    }

    const wasPublished = existing.status === 'PUBLISHED';
    const isPublishing = body.status === 'PUBLISHED' && !wasPublished;
    const content = body.content === undefined ? existing.content : sanitizeBlogContent(body.content);
    const nextStatus = body.status ?? existing.status;
    if (nextStatus === 'PUBLISHED') {
      requirePublishable({
        content,
        featuredImage: body.featuredImage ?? existing.featuredImage ?? undefined,
        featuredImageAlt: body.featuredImageAlt ?? existing.featuredImageAlt ?? undefined,
        seoTitle: body.seoTitle ?? existing.seoTitle ?? undefined,
        seoDescription: body.seoDescription ?? existing.seoDescription ?? undefined,
      });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.content !== undefined ? { content } : {}),
        ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
        ...(body.featuredImage !== undefined ? { featuredImage: body.featuredImage } : {}),
        ...(body.featuredImageAlt !== undefined ? { featuredImageAlt: body.featuredImageAlt } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId || null } : {}),
        ...(body.tags !== undefined ? { tags: JSON.stringify(body.tags) } : {}),
        ...(body.readTime !== undefined ? { readTime: body.readTime } : {}),
        ...(body.translations !== undefined ? { translations: JSON.stringify(sanitizeTranslations(body.translations)) } : {}),
        ...(isPublishing ? { publishedAt: new Date() } : {}),
        ...(body.seoTitle !== undefined || body.seoDescription !== undefined || body.seoData !== undefined
          ? mergeBlogSeo(existing, body)
          : {}),
      },
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE',
      entity: 'BlogPost',
      entityId: post.id,
      metadata: { title: post.title, status: post.status },
      ipAddress: req.ip,
    });

    ok(res, serializePost(post as unknown as Record<string, unknown>), 'Blog post updated');
  } catch (err) {
    next(err);
  }
}

// Admin: delete post
export async function adminDeletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const post = await prisma.blogPost.delete({ where: { id } });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'DELETE',
      entity: 'BlogPost',
      entityId: id,
      metadata: { title: post.title },
      ipAddress: req.ip,
    });

    noContent(res);
  } catch (err) {
    next(err);
  }
}

// Admin: upload featured image (uses existing upload middleware)
export async function adminUploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw ApiError.badRequest('No file uploaded');
    const url = `/uploads/${file.filename}`;
    ok(res, { url });
  } catch (err) {
    next(err);
  }
}

// Admin: create category
export async function adminCreateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, slug, description, translations } = req.body as { name: string; slug: string; description?: string; translations?: any };
    const category = await prisma.blogCategory.create({ 
      data: { 
        name, 
        slug, 
        description,
        translations: translations ? JSON.stringify(translations) : null 
      } 
    });
    created(res, category, 'Category created');
  } catch (err) {
    next(err);
  }
}

// Admin: update category
export async function adminUpdateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, slug, description, translations } = req.body as { name?: string; slug?: string; description?: string; translations?: any };
    const category = await prisma.blogCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(translations !== undefined ? { translations: translations ? JSON.stringify(translations) : null } : {}),
      },
    });
    ok(res, category, 'Category updated');
  } catch (err) {
    next(err);
  }
}

// Admin: delete category
export async function adminDeleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const postsCount = await prisma.blogPost.count({ where: { categoryId: id } });
    if (postsCount > 0) {
      throw ApiError.badRequest(`Cannot delete category because it has ${postsCount} attached blog(s). Please move or delete them first.`);
    }
    await prisma.blogCategory.delete({ where: { id } });
    noContent(res);
  } catch (err) {
    next(err);
  }
}
