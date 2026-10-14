import { api, unwrap } from './api';

export interface BlogPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  translations?: Record<string, { name?: string; description?: string }>;
  _count?: { posts: number };
  createdAt: string;
}

export interface BlogAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export type BlogStatus = 'PUBLISHED' | 'DRAFT' | 'PAUSED';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  status: BlogStatus;
  category?: BlogCategory | null;
  categoryId?: string | null;
  author: BlogAuthor;
  authorId: string;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoData?: string;
  readTime?: number | null;
  viewsCount: number;
  baseLanguage: string;
  translations: Record<string, BlogLangOverride>;
  lang: string;
  hasTranslation: boolean;
  autoTranslated?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogLangOverride {
  title?: string;
  content?: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  status?: BlogStatus;
  categoryId?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoData?: Record<string, unknown>;
  readTime?: number | null;
  baseLanguage?: string;
  translations?: Record<string, BlogLangOverride>;
}

export const blogService = {
  // Public
  listPosts(page = 1, limit = 9, category?: string, lang = 'en'): Promise<{ data: BlogPost[]; meta: BlogPaginationMeta }> {
    return unwrap(api.get('/blog', { params: { page, limit, category, lang } }));
  },

  getPostBySlug(slug: string, lang = 'en'): Promise<BlogPost> {
    return unwrap(api.get(`/blog/${slug}`, { params: { lang } }));
  },

  listCategories(): Promise<BlogCategory[]> {
    return unwrap(api.get('/blog/categories'));
  },

  // Admin
  adminListPosts(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: BlogPost[]; meta: BlogPaginationMeta }> {
    return unwrap(api.get('/blog/admin/posts', { params: { page, limit, status } }));
  },

  adminGetPost(id: string): Promise<BlogPost> {
    return unwrap(api.get(`/blog/admin/posts/${id}`));
  },

  adminCreatePost(payload: BlogPostInput): Promise<BlogPost> {
    return unwrap(api.post('/blog/admin/posts', payload));
  },

  adminUpdatePost(id: string, payload: Partial<BlogPostInput>): Promise<BlogPost> {
    return unwrap(api.put(`/blog/admin/posts/${id}`, payload));
  },

  adminDeletePost(id: string): Promise<void> {
    return api.delete(`/blog/admin/posts/${id}`).then(() => undefined);
  },

  adminUploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return unwrap(api.post('/blog/admin/posts/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },

  adminCreateCategory(payload: { name: string; slug: string; description?: string; translations?: Record<string, any> }): Promise<BlogCategory> {
    return unwrap(api.post('/blog/admin/categories', payload));
  },

  adminUpdateCategory(id: string, payload: { name?: string; slug?: string; description?: string; translations?: Record<string, any> }): Promise<BlogCategory> {
    return unwrap(api.put(`/blog/admin/categories/${id}`, payload));
  },

  adminDeleteCategory(id: string): Promise<void> {
    return api.delete(`/blog/admin/categories/${id}`).then(() => undefined);
  },
};

// Analytics / admin user service additions (exported separately)
export interface AutoTranslateResult {
  title: string;
  excerpt: string;
  content: string;
  targetLang: string;
}

export const translateService = {
  autoTranslate: async (title: string, excerpt: string, content: string, targetLang: string, seoTitle?: string, seoDescription?: string) =>
    unwrap<{ title: string; excerpt: string; content: string; targetLang: string; seoTitle?: string; seoDescription?: string }>(
      api.post('/translate', { title, excerpt, content, seoTitle, seoDescription, targetLang }),
    ),
};

export const adminApiService = {
  getUsers(page = 1, search?: string, role?: string): Promise<{ data: AdminUser[]; meta: BlogPaginationMeta }> {
    return unwrap(api.get('/admin/users', { params: { page, search, role } }));
  },

  getUserById(id: string): Promise<AdminUserDetail> {
    return unwrap(api.get(`/admin/users/${id}`));
  },

  updateUserRole(id: string, role: string): Promise<AdminUser> {
    return unwrap(api.patch(`/admin/users/${id}/role`, { role }));
  },

  deleteUser(id: string): Promise<void> {
    return api.delete(`/admin/users/${id}`).then(() => undefined);
  },

  getStats(): Promise<AdminStats> {
    return unwrap(api.get('/admin/analytics/stats'));
  },

  getAuditLogs(
    page = 1,
    filters: { entity?: string; action?: string; userId?: string; search?: string } = {},
  ): Promise<{ data: AuditLog[]; meta: BlogPaginationMeta }> {
    return unwrap(api.get('/admin/analytics/audit-logs', { params: { page, ...filters } }));
  },
};

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  _count: { orders: number; reviews: number };
}

export interface AdminUserDetail extends AdminUser {
  orders: Array<{ id: string; orderNumber: string; status: string; total: number; createdAt: string }>;
  addresses: unknown[];
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  user?: { firstName: string; lastName: string; email: string } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AdminStats {
  users: { total: number; newLast30: number };
  orders: { total: number; newLast30: number; byStatus: Array<{ status: string; count: number }> };
  revenue: { total: number; last30: number };
  products: { total: number; active: number };
  blog: { total: number; published: number };
  productViews: {
    last30: number;
    topProducts: Array<{ productId: string; views: number; product: { id: string; name: string; slug: string } | null }>;
  };
  pageViews?: {
    last30: number;
    topPages: Array<{ path: string | null; views: number }>;
  };
  dailyActivity: Array<{ date: string; orders: number; revenue: number }>;
  recentAuditLogs: AuditLog[];
}
