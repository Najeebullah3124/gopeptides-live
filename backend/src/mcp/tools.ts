import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { adminRequest, AdminApiError } from './internalApi';

type ZodRawShape = Record<string, z.ZodTypeAny>;

// registerTool's generics (ZodRawShapeCompat conditional types) blow up TS's type-instantiation
// depth when called through a wrapper with a loosely-typed shape param — sidestep it by typing
// the McpServer handle as `any` at this one call site. Runtime behavior is unaffected; we don't
// rely on compile-time inference of the zod shape anywhere (args are read as plain objects).
function tool(
  server: McpServer,
  name: string,
  description: string,
  schema: ZodRawShape,
  handler: (args: Record<string, unknown>) => Promise<unknown>,
): void {
  (server as any).registerTool(
    name,
    { description, inputSchema: schema },
    async (args: Record<string, unknown>) => {
      try {
        const result = await handler(args ?? {});
        return { content: [{ type: 'text' as const, text: JSON.stringify(result ?? { ok: true }, null, 2) }] };
      } catch (err) {
        const message =
          err instanceof AdminApiError
            ? `HTTP ${err.status}: ${typeof err.body === 'string' ? err.body : JSON.stringify(err.body)}`
            : err instanceof Error
              ? err.message
              : String(err);
        return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}

// Deliberately loosely typed (not a fully-nested zod object): the real validation for these
// happens server-side in the proxied admin API. Keeping these shallow avoids pathological
// TypeScript generic-instantiation blowup when combined with the MCP SDK's tool typings.
// Shape reference for seoData: { title, description, focusKeywords[], canonicalUrl, robots,
// socialImage, h1, h2[], bodyContent, internalLinks[{label,href}], externalLinks[{label,href}],
// titleEn/descriptionEn/h1En/h2En[]/bodyContentEn, titleDe/descriptionDe/h1De/h2De[]/bodyContentDe }.
const seoDataSchema = z.record(z.string(), z.unknown());
// Shape reference for translations: { nl?: {name,shortDesc,description,...}, en?: {...}, de?: {...} }
const translationsSchema = z.record(z.string(), z.record(z.string(), z.unknown()));

export function registerAllTools(server: McpServer): void {
  // ── Products ──────────────────────────────────────────────────────────
  tool(server, 'list_products', 'List/search products (public catalog fields).', {
    search: z.string().optional(),
    category: z.string().optional(),
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
    sort: z.string().optional(),
  }, (a) => adminRequest('GET', '/api/products', { query: a as Record<string, string> }));

  tool(server, 'get_product', 'Get a single product by slug.', {
    slug: z.string(),
  }, (a) => adminRequest('GET', `/api/products/${encodeURIComponent(String(a.slug))}`));

  tool(server, 'create_product', 'Create a new product. price/stock are numbers; benefits is a JSON array string.', {
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    shortDesc: z.string(),
    price: z.number(),
    stock: z.number().int(),
    sku: z.string(),
    purity: z.string(),
    weight: z.string(),
    casNumber: z.string(),
    categoryId: z.string(),
    storage: z.string().optional(),
    badge: z.string().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    benefits: z.string().optional(),
  }, (a) => adminRequest('POST', '/api/products', { body: a }));

  tool(server, 'update_product', 'Update a product by id. Only pass the fields you want to change. translations is per-language content override: {nl:{name,shortDesc,description}, en:{...}, de:{...}}. seoData holds SEO title/description/h1/internalLinks (see seoData fields — nl is the primary set, use *En/*De suffixed fields for gopeptides.eu/.de).', {
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    shortDesc: z.string().optional(),
    price: z.number().optional(),
    stock: z.number().int().optional(),
    sku: z.string().optional(),
    purity: z.string().optional(),
    weight: z.string().optional(),
    casNumber: z.string().optional(),
    categoryId: z.string().optional(),
    storage: z.string().optional(),
    badge: z.string().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    benefits: z.string().optional(),
    seoData: seoDataSchema.optional(),
    translations: translationsSchema.optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/products/${id}`, { body });
  });

  tool(server, 'delete_product', 'Delete a product by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/products/${a.id}`));

  // ── Categories (product) ─────────────────────────────────────────────
  tool(server, 'list_product_categories', 'List product categories.', {}, () =>
    adminRequest('GET', '/api/products/categories'));

  tool(server, 'create_product_category', 'Create a product category.', {
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
  }, (a) => adminRequest('POST', '/api/products/admin/categories', { body: a }));

  tool(server, 'update_product_category', 'Update a product category. translations: {nl:{name,description}, en:{...}, de:{...}}. seoData: SEO title/description/h1.', {
    id: z.string(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    seoData: seoDataSchema.optional(),
    translations: translationsSchema.optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/products/admin/categories/${id}`, { body });
  });

  tool(server, 'delete_product_category', 'Delete a product category by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/products/admin/categories/${a.id}`));

  // ── Blog ──────────────────────────────────────────────────────────────
  tool(server, 'list_blog_posts', 'List blog posts (admin view, includes drafts).', {
    status: z.enum(['PUBLISHED', 'DRAFT', 'PAUSED']).optional(),
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
    search: z.string().optional(),
  }, (a) => adminRequest('GET', '/api/blog/admin/posts', { query: a as Record<string, string> }));

  tool(server, 'get_blog_post', 'Get a blog post by id (admin view).', {
    id: z.string(),
  }, (a) => adminRequest('GET', `/api/blog/admin/posts/${a.id}`));

  tool(server, 'create_blog_post', 'Create a blog post. status defaults to DRAFT; set to PUBLISHED to publish immediately.', {
    title: z.string(),
    slug: z.string(),
    content: z.string(),
    excerpt: z.string(),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['PUBLISHED', 'DRAFT', 'PAUSED']).optional(),
    featuredImage: z.string().optional(),
    featuredImageAlt: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    seoData: seoDataSchema.optional(),
    baseLanguage: z.enum(['en', 'nl', 'de']).optional(),
    translations: translationsSchema.optional(),
  }, (a) => adminRequest('POST', '/api/blog/admin/posts', { body: a }));

  tool(server, 'update_blog_post', 'Update a blog post by id. Only pass fields you want to change.', {
    id: z.string(),
    title: z.string().optional(),
    slug: z.string().optional(),
    content: z.string().optional(),
    excerpt: z.string().optional(),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['PUBLISHED', 'DRAFT', 'PAUSED']).optional(),
    featuredImage: z.string().optional(),
    featuredImageAlt: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    seoData: seoDataSchema.optional(),
    translations: translationsSchema.optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/blog/admin/posts/${id}`, { body });
  });

  tool(server, 'delete_blog_post', 'Delete a blog post by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/blog/admin/posts/${a.id}`));

  tool(server, 'list_blog_categories', 'List blog categories.', {}, () =>
    adminRequest('GET', '/api/blog/categories'));

  tool(server, 'create_blog_category', 'Create a blog category.', {
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
  }, (a) => adminRequest('POST', '/api/blog/admin/categories', { body: a }));

  tool(server, 'update_blog_category', 'Update a blog category by id.', {
    id: z.string(),
    name: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/blog/admin/categories/${id}`, { body });
  });

  tool(server, 'delete_blog_category', 'Delete a blog category by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/blog/admin/categories/${a.id}`));

  // ── Orders ────────────────────────────────────────────────────────────
  tool(server, 'list_orders', 'List all orders (admin).', {
    status: z.string().optional(),
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
  }, (a) => adminRequest('GET', '/api/orders', { query: a as Record<string, string> }));

  tool(server, 'get_order', 'Get a single order by id.', {
    id: z.string(),
  }, (a) => adminRequest('GET', `/api/orders/${a.id}`));

  tool(server, 'update_order_status', 'Update an order\'s status.', {
    id: z.string(),
    status: z.string(),
  }, (a) => adminRequest('PUT', `/api/orders/${a.id}/status`, { body: { status: a.status } }));

  // ── Coupons ───────────────────────────────────────────────────────────
  tool(server, 'list_coupons', 'List all coupons (admin).', {}, () =>
    adminRequest('GET', '/api/coupons'));

  tool(server, 'create_coupon', 'Create a discount coupon.', {
    code: z.string(),
    type: z.string(),
    value: z.number(),
    minOrderValue: z.number().optional(),
    maxUses: z.number().int().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean().optional(),
  }, (a) => adminRequest('POST', '/api/coupons', { body: a }));

  tool(server, 'update_coupon', 'Update a coupon by id.', {
    id: z.string(),
    code: z.string().optional(),
    type: z.string().optional(),
    value: z.number().optional(),
    minOrderValue: z.number().optional(),
    maxUses: z.number().int().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean().optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/coupons/${id}`, { body });
  });

  tool(server, 'delete_coupon', 'Delete a coupon by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/coupons/${a.id}`));

  // ── Reviews ───────────────────────────────────────────────────────────
  tool(server, 'list_reviews', 'List reviews (admin).', {
    approved: z.boolean().optional(),
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
  }, (a) => adminRequest('GET', '/api/reviews/admin', { query: a as Record<string, string> }));

  tool(server, 'approve_review', 'Approve a review so it shows publicly.', {
    id: z.string(),
  }, (a) => adminRequest('PUT', `/api/reviews/${a.id}/approve`));

  tool(server, 'unapprove_review', 'Unapprove a review, hiding it from public view.', {
    id: z.string(),
  }, (a) => adminRequest('PUT', `/api/reviews/${a.id}/unapprove`));

  tool(server, 'delete_review', 'Delete a review by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/reviews/${a.id}`));

  // ── Users / customers ─────────────────────────────────────────────────
  tool(server, 'list_users', 'List user accounts (admin).', {
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
    search: z.string().optional(),
  }, (a) => adminRequest('GET', '/api/admin/users', { query: a as Record<string, string> }));

  tool(server, 'get_user', 'Get a user account by id.', {
    id: z.string(),
  }, (a) => adminRequest('GET', `/api/admin/users/${a.id}`));

  tool(server, 'update_user_role', 'Change a user\'s role (USER or ADMIN). Use with care.', {
    id: z.string(),
    role: z.enum(['USER', 'ADMIN']),
  }, (a) => adminRequest('PATCH', `/api/admin/users/${a.id}/role`, { body: { role: a.role } }));

  tool(server, 'delete_user', 'Delete a user account by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/admin/users/${a.id}`));

  // ── SEO ───────────────────────────────────────────────────────────────
  tool(server, 'get_seo_dashboard', 'Get the SEO dashboard summary (scores, issues, coverage).', {}, () =>
    adminRequest('GET', '/api/admin/seo/dashboard'));

  tool(server, 'get_seo_content_inventory', 'List all SEO-manageable content (products, posts, pages) with their current SEO status.', {}, () =>
    adminRequest('GET', '/api/admin/seo/content'));

  tool(server, 'get_seo_content_detail', 'Get live-rendered SEO detail for one piece of content (title, meta, h1/h2, word count, canonical, internal links).', {
    type: z.enum(['product', 'category', 'post', 'page']),
    id: z.string(),
    lang: z.enum(['en', 'nl', 'de']).optional(),
  }, (a) => adminRequest('GET', `/api/admin/seo/content/${a.type}/${a.id}`, { query: { lang: a.lang as string | undefined } }));

  tool(server, 'update_seo_content_meta', 'Update SEO metadata for a product, category, blog post, or static page (home/shop/blog/faq/contact/about/etc). For type=page, lang is required.', {
    type: z.enum(['product', 'category', 'post', 'page']),
    id: z.string(),
    lang: z.enum(['en', 'nl', 'de']).optional(),
    seo: seoDataSchema,
  }, (a) => adminRequest('PUT', `/api/admin/seo/content/${a.type}/${a.id}`, { body: { lang: a.lang, seo: a.seo } }));

  tool(server, 'list_seo_redirects', 'List all configured SEO redirects.', {}, () =>
    adminRequest('GET', '/api/admin/seo/redirects'));

  tool(server, 'create_seo_redirect', 'Create a URL redirect.', {
    sourcePath: z.string(),
    destination: z.string(),
    statusCode: z.number().int().optional(),
  }, (a) => adminRequest('POST', '/api/admin/seo/redirects', { body: a }));

  tool(server, 'update_seo_redirect', 'Update an SEO redirect by id.', {
    id: z.string(),
    sourcePath: z.string().optional(),
    destination: z.string().optional(),
    statusCode: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/admin/seo/redirects/${id}`, { body });
  });

  tool(server, 'delete_seo_redirect', 'Delete an SEO redirect by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/admin/seo/redirects/${a.id}`));

  tool(server, 'list_seo_keywords', 'List tracked SEO keywords.', {}, () =>
    adminRequest('GET', '/api/admin/seo/keywords'));

  tool(server, 'create_seo_keyword', 'Add a tracked SEO keyword.', {
    keyword: z.string(),
    targetUrl: z.string().optional(),
    searchVolume: z.number().int().optional(),
    difficulty: z.number().optional(),
  }, (a) => adminRequest('POST', '/api/admin/seo/keywords', { body: a }));

  tool(server, 'update_seo_keyword', 'Update a tracked SEO keyword by id.', {
    id: z.string(),
    keyword: z.string().optional(),
    targetUrl: z.string().optional(),
    searchVolume: z.number().int().optional(),
    difficulty: z.number().optional(),
  }, (a) => {
    const { id, ...body } = a;
    return adminRequest('PUT', `/api/admin/seo/keywords/${id}`, { body });
  });

  tool(server, 'delete_seo_keyword', 'Delete a tracked SEO keyword by id.', {
    id: z.string(),
  }, (a) => adminRequest('DELETE', `/api/admin/seo/keywords/${a.id}`));

  tool(server, 'run_seo_link_audit', 'Crawl the live site and check for broken internal/external links.', {
    targetUrl: z.string().optional(),
  }, (a) => adminRequest('POST', '/api/admin/seo/audits/links', { body: a }));

  tool(server, 'ping_sitemaps', 'Ping search engines to re-crawl the sitemap.', {}, () =>
    adminRequest('POST', '/api/admin/seo/ping-sitemaps'));

  tool(server, 'get_robots_txt', 'Get the current robots.txt content.', {}, () =>
    adminRequest('GET', '/api/admin/seo/robots-txt'));

  tool(server, 'update_robots_txt', 'Update the robots.txt content.', {
    content: z.string(),
  }, (a) => adminRequest('PUT', '/api/admin/seo/robots-txt', { body: a }));

  // ── Settings & analytics ──────────────────────────────────────────────
  tool(server, 'get_settings', 'Get store-wide settings.', {}, () =>
    adminRequest('GET', '/api/settings'));

  tool(server, 'update_settings', 'Update store-wide settings. Pass any subset of settings keys/values.', {
    settings: z.record(z.string(), z.unknown()),
  }, (a) => adminRequest('PUT', '/api/settings', { body: a.settings }));

  tool(server, 'get_analytics_stats', 'Get admin dashboard analytics (orders, revenue, traffic summary).', {}, () =>
    adminRequest('GET', '/api/admin/analytics/stats'));

  // ── Generic escape hatch ─────────────────────────────────────────────
  tool(
    server,
    'admin_api_request',
    'Escape hatch: call ANY backend admin/API route directly (e.g. label generation, subscribers, contact messages, merchant feed, IndexNow, translations, image alt text, WebP conversion). Use the dedicated tools above when one exists — reach for this only for actions not covered by a named tool. path must start with /api/.',
    {
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
      path: z.string().describe('Must start with /api/, e.g. /api/admin/seo/media'),
      query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
      body: z.unknown().optional(),
    },
    (a) => {
      const path = String(a.path);
      if (!path.startsWith('/api/')) throw new Error('path must start with /api/');
      return adminRequest(a.method as 'GET', path, {
        body: a.body,
        query: a.query as Record<string, string> | undefined,
      });
    },
  );
}
