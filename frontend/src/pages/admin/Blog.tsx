import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { blogService, translateService, type BlogLangOverride, type BlogPost, type BlogPostInput, type BlogStatus, type BlogCategory } from '@/services/blogService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUiStore } from '@/stores/uiStore';
import { extractErrorMessage } from '@/services/api';
import { buildSeoPayloadFromForm, parseSeoData } from '@/utils/seoMeta';
import { formatDate, resolveImageUrl } from '@/utils/helpers';
import { useT } from '@/hooks/useT';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

function stripBlogSeoSuffix(title: string): string {
  return title.replace(/\s*[|—–-]\s*GoPeptides(\s+Blog)?\s*$/i, '').trim();
}

function contentWordCount(html: string) {
  return html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens only'),
  excerpt: z.string().min(10, 'Excerpt required').max(500),
  content: z.string().min(20, 'Content must be at least 20 characters'),
  status: z.enum(['PUBLISHED', 'DRAFT', 'PAUSED']),
  baseLanguage: z.enum(['en', 'nl', 'de']).default('en'),
  categoryId: z.string().optional(),
  tags: z.string().optional(),
  seoTitle: z.string().max(70, { message: 'SEO title (English): max 70 characters' }).optional(),
  seoDescription: z.string().max(160, { message: 'Meta description (English): max 160 characters' }).optional(),
  seoH1: z.string().max(120, { message: 'H1 heading: max 120 characters' }).optional(),
  readTime: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).optional(),
  ),
}).superRefine((values, ctx) => {
  if (values.status !== 'PUBLISHED') return;
  if (contentWordCount(values.content) < 500) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Published posts need at least 500 words' });
  if (!/<h2\b/i.test(values.content)) ctx.addIssue({ code: 'custom', path: ['content'], message: 'Published posts need at least one H2 heading' });
  if (!values.seoTitle || values.seoTitle.length < 30) ctx.addIssue({ code: 'custom', path: ['seoTitle'], message: 'SEO title (English): 30–70 characters required to publish' });
  if (!values.seoDescription || values.seoDescription.length < 120) ctx.addIssue({ code: 'custom', path: ['seoDescription'], message: 'Meta description (English): 120–160 characters required to publish' });
});

type FormValues = z.infer<typeof schema>;

const STATUS_BADGE: Record<BlogStatus, 'primary' | 'muted' | 'gold'> = {
  PUBLISHED: 'primary',
  DRAFT: 'muted',
  PAUSED: 'gold',
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function AdminBlog() {
  const { t, lang } = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BlogPost | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);

  const [catActiveTab, setCatActiveTab] = useState<'en' | 'nl' | 'de'>('en');
  const [catNlName, setCatNlName] = useState('');
  const [catNlDesc, setCatNlDesc] = useState('');
  const [catDeName, setCatDeName] = useState('');
  const [catDeDesc, setCatDeDesc] = useState('');
  const [catTranslating, setCatTranslating] = useState<'nl' | 'de' | null>(null);

  const resetCatForm = () => {
    setEditingCategory(null);
    setCategoryName(''); setCategorySlug(''); setCategoryDescription('');
    setCatNlName(''); setCatNlDesc('');
    setCatDeName(''); setCatDeDesc('');
    setCatActiveTab('en');
  };

  const handleCatAutoTranslate = async (langTo: 'nl' | 'de') => {
    if (!categoryName) {
      toast(t('admin.blog.writeFirst') || 'Write in English first', 'info');
      return;
    }
    setCatTranslating(langTo);
    try {
      const result = await translateService.autoTranslate(categoryName, categoryDescription || '', '', langTo, '', '');
      if (langTo === 'nl') {
        setCatNlName(result.title);
        setCatNlDesc(result.excerpt);
      } else {
        setCatDeName(result.title);
        setCatDeDesc(result.excerpt);
      }
      toast(t(`admin.blog.translated${langTo === 'nl' ? 'Nl' : 'De'}`) || 'Translated successfully', 'success');
    } catch (err) {
      toast(extractErrorMessage(err), 'error');
    } finally {
      setCatTranslating(null);
    }
  };

  const posts = useQuery({
    queryKey: ['admin', 'blog', statusFilter],
    queryFn: () => blogService.adminListPosts(1, 50, statusFilter || undefined),
  });

  const categories = useQuery({
    queryKey: ['blog', 'categories'],
    queryFn: () => blogService.listCategories(),
  });

  const create = useMutation({
    mutationFn: (p: BlogPostInput) => blogService.adminCreatePost(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
      qc.invalidateQueries({ queryKey: ['blog'] });
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      toast(t('admin.blog.created'), 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const update = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<BlogPostInput> }) =>
      blogService.adminUpdatePost(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
      qc.invalidateQueries({ queryKey: ['blog'] });
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      toast(t('admin.blog.updated'), 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => blogService.adminDeletePost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
      toast(t('admin.blog.deleted'), 'info');
      setDeleteConfirm(null);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const quickStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BlogStatus }) =>
      blogService.adminUpdatePost(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
      toast(t('admin.blog.statusUpdated'), 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const buildCatTranslationsPayload = () => {
    const translations: Record<string, any> = {};
    if (catNlName || catNlDesc) translations.nl = { name: catNlName, description: catNlDesc };
    if (catDeName || catDeDesc) translations.de = { name: catDeName, description: catDeDesc };
    return translations;
  };

  const createCategory = useMutation({
    mutationFn: () => blogService.adminCreateCategory({ name: categoryName, slug: categorySlug, description: categoryDescription || undefined, translations: buildCatTranslationsPayload() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog', 'categories'] });
      if (!editingCategory) {
        resetCatForm();
      }
      toast('Blog category created', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const updateCategory = useMutation({
    mutationFn: (payload: { id: string, name: string, slug: string, description?: string }) => 
      blogService.adminUpdateCategory(payload.id, { name: payload.name, slug: payload.slug, description: payload.description, translations: buildCatTranslationsPayload() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog', 'categories'] });
      resetCatForm();
      toast('Blog category updated', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => blogService.adminDeleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blog', 'categories'] });
      toast('Blog category deleted', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const onAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onEdit = (post: BlogPost) => {
    setEditing(post);
    setModalOpen(true);
  };

  const onSubmit = (values: FormValues, translations: Record<string, BlogLangOverride>, featuredImage?: string, featuredImageAlt?: string) => {
    const existingSeo = editing ? parseSeoData(editing.seoData) : {};
    const seoTitle = stripBlogSeoSuffix(values.seoTitle || '');
    const seoData = buildSeoPayloadFromForm({ ...values, seoTitle }, existingSeo);
    const payload: BlogPostInput = {
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt,
      content: values.content,
      featuredImage: featuredImage || null,
      featuredImageAlt: featuredImageAlt || null,
      status: values.status,
      baseLanguage: values.baseLanguage,
      categoryId: values.categoryId || null,
      tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      seoTitle: seoTitle || null,
      seoDescription: values.seoDescription?.trim() || seoData.description || null,
      seoData,
      readTime: values.readTime || null,
      translations,
    };
    if (editing) update.mutate({ id: editing.id, p: payload });
    else create.mutate(payload);
  };

  const data = posts.data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.blog.title')}</h2>
          <p className="text-sm text-ink-muted">
            {posts.data ? t('admin.blog.totalPosts', { n: posts.data.meta.total }) : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: t('admin.blog.statusAll') },
              { value: 'PUBLISHED', label: t('admin.blog.statusPublished') },
              { value: 'DRAFT', label: t('admin.blog.statusDraft') },
              { value: 'PAUSED', label: t('admin.blog.statusPaused') },
            ]}
          />
          <Button onClick={onAdd}>
            <Icon name="plus" size={14} />
            {t('admin.blog.newPost')}
          </Button>
          <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>
            <Icon name="plus" size={14} />
            {t('admin.blog.newCategoryBtn')}
          </Button>
        </div>
      </div>

      {posts.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">{t('admin.blog.empty')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                <th className="text-left px-4 py-3">{t('admin.blog.col.title')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.blog.col.category')}</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">{t('admin.blog.col.views')}</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">{t('admin.blog.col.date')}</th>
                <th className="text-left px-4 py-3">{t('admin.blog.col.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((post) => (
                <tr key={post.id} className="border-b border-lineSoft last:border-0 hover:bg-surfaceAlt/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink leading-snug line-clamp-1">{post.title}</div>
                    <div className="text-xs text-ink-muted font-mono">{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-ink-muted">
                    {post.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-ink-muted">{post.viewsCount}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-ink-muted text-xs">
                    {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_BADGE[post.status as BlogStatus]}>
                      {post.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {post.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => quickStatus.mutate({ id: post.id, status: 'PUBLISHED' })}
                        className="text-xs font-semibold text-green-600 hover:text-green-700 mr-3"
                      >
                        {t('admin.blog.publish')}
                      </button>
                    )}
                    {post.status === 'PUBLISHED' && (
                      <button
                        onClick={() => quickStatus.mutate({ id: post.id, status: 'PAUSED' })}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 mr-3"
                      >
                        {t('admin.blog.pause')}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(post)}
                      className="text-xs font-semibold text-primary hover:text-primary-light mr-3"
                    >
                      {t('admin.common.edit')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(post)}
                      className="text-xs font-semibold text-ink-muted hover:text-danger"
                    >
                      {t('admin.common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BlogFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        categories={categories.data ?? []}
        submitting={create.isPending || update.isPending}
        onSubmit={(v, translations, featuredImage, featuredImageAlt) => onSubmit(v, translations, featuredImage, featuredImageAlt)}
      />

      <Modal open={categoryModalOpen} onClose={() => { setCategoryModalOpen(false); resetCatForm(); }} title={t('admin.blog.categories.manage') || 'Manage Categories'} size="lg">
        <div className="space-y-6">
          <div className="space-y-3 bg-surface/50 p-4 rounded-xl border border-line">
            <h3 className="font-semibold">{editingCategory ? (t('admin.blog.categories.editTitle') || 'Edit Category') : (t('admin.blog.categories.newTitle') || 'Add New Category')}</h3>
            
            <div className="flex border-b border-line mb-4">
              <button onClick={() => setCatActiveTab('en')} className={`px-4 py-2 font-medium text-sm transition-colors ${catActiveTab === 'en' ? 'border-b-2 border-primary text-primary' : 'text-ink-muted hover:text-ink'}`}>English</button>
              <button onClick={() => setCatActiveTab('nl')} className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${catActiveTab === 'nl' ? 'border-b-2 border-primary text-primary' : 'text-ink-muted hover:text-ink'}`}>Dutch (NL) {catNlName && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}</button>
              <button onClick={() => setCatActiveTab('de')} className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${catActiveTab === 'de' ? 'border-b-2 border-primary text-primary' : 'text-ink-muted hover:text-ink'}`}>German (DE) {catDeName && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}</button>
            </div>

            {catActiveTab === 'en' && (
              <div className="space-y-3">
                <Input label={t('admin.blog.categories.name') || 'Name'} value={categoryName} onChange={(e) => { setCategoryName(e.target.value); setCategorySlug(slugify(e.target.value)); }} placeholder="Research Guides" />
                <Input label={t('admin.blog.categories.slug') || 'Slug'} value={categorySlug} onChange={(e) => setCategorySlug(slugify(e.target.value))} placeholder="research-guides" />
                <div>
                  <label className="label">{t('admin.blog.categories.desc') || 'Description (optional)'}</label>
                  <textarea value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} rows={2} className="field resize-none" placeholder={t('admin.blog.categories.descPlaceholder') || 'Short category description'} />
                </div>
              </div>
            )}

            {catActiveTab === 'nl' && (
              <div className="space-y-3">
                <div className="flex justify-end mb-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCatAutoTranslate('nl')} loading={catTranslating === 'nl'}>
                    <Icon name="languages" size={14} /> Auto-Translate from EN
                  </Button>
                </div>
                <Input label={t('admin.blog.f.titleNl') || 'Name (NL)'} value={catNlName} onChange={(e) => setCatNlName(e.target.value)} placeholder="Onderzoeksgidsen" />
                <div>
                  <label className="label">Description (NL)</label>
                  <textarea value={catNlDesc} onChange={(e) => setCatNlDesc(e.target.value)} rows={2} className="field resize-none" />
                </div>
              </div>
            )}

            {catActiveTab === 'de' && (
              <div className="space-y-3">
                <div className="flex justify-end mb-2">
                  <Button variant="secondary" size="sm" onClick={() => handleCatAutoTranslate('de')} loading={catTranslating === 'de'}>
                    <Icon name="languages" size={14} /> Auto-Translate from EN
                  </Button>
                </div>
                <Input label={t('admin.blog.f.titleDe') || 'Name (DE)'} value={catDeName} onChange={(e) => setCatDeName(e.target.value)} placeholder="Forschungsleitfäden" />
                <div>
                  <label className="label">Description (DE)</label>
                  <textarea value={catDeDesc} onChange={(e) => setCatDeDesc(e.target.value)} rows={2} className="field resize-none" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {editingCategory && (
                <Button variant="secondary" onClick={() => { resetCatForm(); }}>{t('admin.common.cancel')}</Button>
              )}
              <Button 
                loading={createCategory.isPending || updateCategory.isPending} 
                disabled={!categoryName || !categorySlug} 
                onClick={() => {
                  if (editingCategory) {
                    updateCategory.mutate({ id: editingCategory.id, name: categoryName, slug: categorySlug, description: categoryDescription || undefined });
                  } else {
                    createCategory.mutate();
                  }
                }}
              >
                {editingCategory ? (t('admin.common.save') || 'Update') : t('admin.blog.categories.create')}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">{t('admin.blog.categories.existing') || 'Existing Categories'}</h3>
            {categories.isLoading ? (
               <div className="text-sm text-ink-muted">Loading...</div>
            ) : categories.data?.length === 0 ? (
               <div className="text-sm text-ink-muted">No categories found.</div>
            ) : (
               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                 {categories.data?.map(cat => (
                   <div key={cat.id} className="flex items-center justify-between p-3 border border-line rounded-lg hover:border-primary/20 transition-colors">
                     <div>
                       <div className="font-medium text-sm">{cat.translations?.[lang]?.name || cat.name}</div>
                       <div className="text-xs text-ink-muted">/{cat.slug}</div>
                     </div>
                     <div className="flex gap-1">
                       <button 
                         onClick={() => {
                           setEditingCategory(cat);
                           setCategoryName(cat.name);
                           setCategorySlug(cat.slug);
                           setCategoryDescription(cat.description || '');
                           setCatNlName(cat.translations?.nl?.name || '');
                           setCatNlDesc(cat.translations?.nl?.description || '');
                           setCatDeName(cat.translations?.de?.name || '');
                           setCatDeDesc(cat.translations?.de?.description || '');
                           setCatActiveTab('en');
                         }} 
                         className="p-1.5 text-ink-muted hover:text-primary transition-colors"
                         title="Edit"
                       >
                         <Icon name="edit" size={16} />
                       </button>
                       <button 
                         onClick={() => {
                           if (confirm(t('admin.blog.categories.confirmDelete') || 'Are you sure you want to delete this category?')) {
                             deleteCategory.mutate(cat.id);
                           }
                         }} 
                         className="p-1.5 text-ink-muted hover:text-danger transition-colors"
                         title="Delete"
                       >
                         <Icon name="trash" size={16} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t('admin.blog.deleteTitle')}
        size="sm"
      >
        <p className="text-sm text-ink-muted mb-4">
          {t('admin.blog.deleteDesc', { title: deleteConfirm?.title ?? '' })}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">
            {t('admin.common.cancel')}
          </Button>
          <Button
            variant="primary"
            loading={remove.isPending}
            onClick={() => deleteConfirm && remove.mutate(deleteConfirm.id)}
            className="flex-1 bg-danger hover:bg-danger/90"
          >
            {t('admin.common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

type TabId = 'content' | 'nl' | 'de' | 'seo' | 'preview';
type PreviewLang = 'en' | 'nl' | 'de';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));
}

function previewDocument({
  title,
  excerpt,
  content,
  imageUrl,
  imageAlt,
}: {
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  imageAlt?: string;
}): string {
  const safeTitle = title.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] || char));
  const safeExcerpt = excerpt ? `<p class="excerpt">${escapeHtml(excerpt)}</p>` : '';
  const hero = imageUrl
    ? `<img class="hero" src="${escapeHtml(resolveImageUrl(imageUrl))}" alt="${escapeHtml(imageAlt || title || 'Featured image')}" />`
    : '';
  return `<!doctype html><html><head><style>body{font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.65;margin:0;padding:24px}article{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,.06)}.wrap{padding:28px}h1{font-size:32px;line-height:1.15;margin:0 0 16px}.excerpt{font-size:17px;color:#475569;margin:0 0 24px}.meta{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 10px}.hero{display:block;width:100%;max-height:320px;object-fit:cover;background:#f1f5f9}h2{font-size:24px;margin-top:32px}h3{font-size:20px;margin-top:24px}h4{font-size:17px;margin-top:20px}a{color:#008080}img{display:block;max-width:100%;height:auto;border-radius:8px;margin:20px 0}blockquote{border-left:4px solid #008080;margin:20px 0;padding-left:16px;color:#475569}pre{background:#f1f5f9;padding:14px;overflow:auto;border-radius:10px}code{background:#f1f5f9;padding:2px 4px;border-radius:4px}ul,ol{padding-left:22px}</style></head><body><article>${hero}<div class="wrap"><p class="meta">Inline preview</p><h1>${safeTitle || 'Article title'}</h1>${safeExcerpt}${content || '<p>Start writing to preview the article layout.</p>'}</div></article></body></html>`;
}

interface BlogFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: BlogPost | null;
  categories: import('@/services/blogService').BlogCategory[];
  submitting: boolean;
  onSubmit: (v: FormValues, translations: Record<string, BlogLangOverride>, featuredImage: string, featuredImageAlt: string) => void;
}

function BlogFormModal({ open, onClose, editing, categories, submitting, onSubmit }: BlogFormModalProps) {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('content');
  const [previewLang, setPreviewLang] = useState<PreviewLang>('en');
  const [translating, setTranslating] = useState<'nl' | 'de' | null>(null);

  // Per-language translation state (separate from RHF since they're optional)
  const [nlTitle, setNlTitle] = useState('');
  const [nlExcerpt, setNlExcerpt] = useState('');
  const [nlContent, setNlContent] = useState('');
  const [nlSeoTitle, setNlSeoTitle] = useState('');
  const [nlSeoDescription, setNlSeoDescription] = useState('');
  const [deTitle, setDeTitle] = useState('');
  const [deExcerpt, setDeExcerpt] = useState('');
  const [deContent, setDeContent] = useState('');
  const [deSeoTitle, setDeSeoTitle] = useState('');
  const [deSeoDescription, setDeSeoDescription] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'DRAFT' },
  });

  const titleValue = watch('title');

  useEffect(() => {
    if (!open) return;
    setActiveTab('content');
    setPreviewLang('en');
    if (editing) {
      const savedSeo = parseSeoData(editing.seoData);
      reset({
        title: editing.title,
        slug: editing.slug,
        excerpt: editing.excerpt,
        content: editing.content,
        status: editing.status as FormValues['status'],
        baseLanguage: (editing.baseLanguage as FormValues['baseLanguage']) ?? 'en',
        categoryId: editing.categoryId ?? '',
        tags: editing.tags?.join(', ') ?? '',
        seoTitle: stripBlogSeoSuffix(savedSeo.title || editing.seoTitle || ''),
        seoDescription: savedSeo.description || editing.seoDescription || '',
        seoH1: savedSeo.h1 ?? '',
        readTime: editing.readTime ?? undefined,
      });
      setImageUrl(editing.featuredImage ?? '');
      setImageAlt(editing.featuredImageAlt ?? '');
      const t = editing.translations ?? {};
      setNlTitle(t.nl?.title ?? '');
      setNlExcerpt(t.nl?.excerpt ?? '');
      setNlContent(t.nl?.content ?? '');
      setNlSeoTitle(stripBlogSeoSuffix(t.nl?.seoTitle ?? ''));
      setNlSeoDescription(t.nl?.seoDescription ?? '');
      setDeTitle(t.de?.title ?? '');
      setDeExcerpt(t.de?.excerpt ?? '');
      setDeContent(t.de?.content ?? '');
      setDeSeoTitle(stripBlogSeoSuffix(t.de?.seoTitle ?? ''));
      setDeSeoDescription(t.de?.seoDescription ?? '');
    } else {
      reset({ status: 'DRAFT', categoryId: '', tags: '' });
      setImageUrl('');
      setImageAlt('');
      setNlTitle(''); setNlExcerpt(''); setNlContent('');
      setNlSeoTitle(''); setNlSeoDescription('');
      setDeTitle(''); setDeExcerpt(''); setDeContent('');
      setDeSeoTitle(''); setDeSeoDescription('');
    }
  }, [open, editing, reset]);

  useEffect(() => {
    if (!editing && titleValue) {
      setValue('slug', slugify(titleValue));
    }
  }, [titleValue, editing, setValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await blogService.adminUploadImage(file);
      setImageUrl(res.url);
      toast(t('admin.blog.imageUploaded'), 'success');
    } catch {
      toast(t('admin.blog.imageFailed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadInlineImage = async (file: File, _alt: string): Promise<string> => {
    const res = await blogService.adminUploadImage(file);
    toast(t('admin.blog.imageUploaded'), 'success');
    return res.url;
  };

  const handleAutoTranslate = async (lang: 'nl' | 'de') => {
    const values = watch();
    if (!values.title || !values.content) {
      toast(t('admin.blog.writeFirst'), 'info');
      return;
    }
    setTranslating(lang);
    try {
      const result = await translateService.autoTranslate(
        values.title,
        values.excerpt || '',
        values.content,
        lang,
        values.seoTitle || '',
        values.seoDescription || '',
      );
      if (lang === 'nl') {
        setNlTitle(result.title);
        setNlExcerpt(result.excerpt);
        setNlContent(result.content);
        if (result.seoTitle) setNlSeoTitle(stripBlogSeoSuffix(result.seoTitle));
        if (result.seoDescription) setNlSeoDescription(result.seoDescription);
        toast(t('admin.blog.translatedNl'), 'success');
      } else {
        setDeTitle(result.title);
        setDeExcerpt(result.excerpt);
        setDeContent(result.content);
        if (result.seoTitle) setDeSeoTitle(stripBlogSeoSuffix(result.seoTitle));
        if (result.seoDescription) setDeSeoDescription(result.seoDescription);
        toast(t('admin.blog.translatedDe'), 'success');
      }
    } catch {
      toast(t('admin.blog.translateFailed'), 'error');
    } finally {
      setTranslating(null);
    }
  };

  const handleFormSubmit = (values: FormValues) => {
    const translations: Record<string, BlogLangOverride> = {};
    if (nlTitle || nlExcerpt || nlContent || nlSeoTitle || nlSeoDescription) {
      translations.nl = {
        title: nlTitle || undefined,
        excerpt: nlExcerpt || undefined,
        content: nlContent || undefined,
        seoTitle: stripBlogSeoSuffix(nlSeoTitle) || undefined,
        seoDescription: nlSeoDescription.trim() || undefined,
      };
    }
    if (deTitle || deExcerpt || deContent || deSeoTitle || deSeoDescription) {
      translations.de = {
        title: deTitle || undefined,
        excerpt: deExcerpt || undefined,
        content: deContent || undefined,
        seoTitle: stripBlogSeoSuffix(deSeoTitle) || undefined,
        seoDescription: deSeoDescription.trim() || undefined,
      };
    }
    if (values.status === 'PUBLISHED') {
      const nlSeoErr = validateTranslationSeo('Dutch', nlSeoTitle, nlSeoDescription, !!(nlTitle || nlContent));
      const deSeoErr = validateTranslationSeo('German', deSeoTitle, deSeoDescription, !!(deTitle || deContent));
      const transSeoErr = nlSeoErr || deSeoErr;
      if (transSeoErr) {
        toast(transSeoErr, 'error');
        setActiveTab('seo');
        return;
      }
    }
    if (values.status === 'PUBLISHED' && (!imageUrl || !imageAlt.trim())) {
      toast('Published posts need a featured image and descriptive alt text.', 'error');
      return;
    }
    onSubmit(values, translations, imageUrl, imageAlt);
  };

  const previewTitle = previewLang === 'nl' ? (nlTitle || watch('title') || '') : previewLang === 'de' ? (deTitle || watch('title') || '') : (watch('title') || '');
  const previewExcerpt = previewLang === 'nl' ? (nlExcerpt || watch('excerpt') || '') : previewLang === 'de' ? (deExcerpt || watch('excerpt') || '') : (watch('excerpt') || '');
  const previewContent = previewLang === 'nl' ? (nlContent || watch('content') || '') : previewLang === 'de' ? (deContent || watch('content') || '') : (watch('content') || '');

  const seoTitleValue = watch('seoTitle') || '';
  const seoDescValue = watch('seoDescription') || '';

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'preview', label: 'Preview' },
    { id: 'content', label: '🇬🇧 English' },
    { id: 'nl', label: '🇳🇱 Nederlands' },
    { id: 'de', label: '🇩🇪 Deutsch' },
    { id: 'seo', label: 'SEO Meta' },
  ];

  const nlFilled = !!(nlTitle || nlContent || nlSeoTitle);
  const deFilled = !!(deTitle || deContent || deSeoTitle);

  const validateTranslationSeo = (langLabel: string, title: string, desc: string, hasContent: boolean): string | null => {
    if (!hasContent) return null;
    if (!title.trim() || title.length < 30 || title.length > 70) {
      return `${langLabel} SEO title: 30–70 characters (${title.length} now)`;
    }
    if (!desc.trim() || desc.length < 120 || desc.length > 160) {
      return `${langLabel} meta description: 120–160 characters (${desc.length} now)`;
    }
    return null;
  };

  const handleFormError = (formErrors: typeof errors) => {
    const tabByField: Partial<Record<keyof FormValues, TabId>> = {
      title: 'content', slug: 'content', excerpt: 'content', content: 'content',
      seoTitle: 'seo', seoDescription: 'seo', seoH1: 'seo',
      status: 'seo', baseLanguage: 'seo', categoryId: 'seo', tags: 'seo', readTime: 'seo',
    };
    const firstKey = Object.keys(formErrors)[0] as keyof FormValues | undefined;
    if (firstKey && tabByField[firstKey]) setActiveTab(tabByField[firstKey]!);
    const msgs = Object.entries(formErrors).map(([field, err]) => {
      const msg = (err as { message?: string })?.message;
      return msg ? `${field}: ${msg}` : null;
    }).filter(Boolean);
    toast(msgs.join(' · ') || 'Please fix the highlighted fields.', 'error');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('admin.blog.editTitle') : t('admin.blog.newTitle')}
      size="lg"
    >
      {/* Tab bar — horizontal scroll on mobile so all tabs stay on one line */}
      <div className="flex gap-1 mb-4 border-b border-line pb-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
              activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.id === 'nl' && nlFilled && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            {tab.id === 'de' && deFilled && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            {tab.id === 'seo' && (nlSeoTitle || deSeoTitle) && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit, handleFormError)} className="space-y-3">
        {/* English content tab */}
        {activeTab === 'content' && (
          <>
            <Input label={`${t('admin.blog.f.titleEn')} (H1)`} hint="This is the article's single H1 heading." placeholder={t('admin.blog.f.titleEnPh')} {...register('title')} error={errors.title?.message} />
            <Input label={t('admin.blog.f.slug')} placeholder="how-peptides-support-research" {...register('slug')} error={errors.slug?.message} hint={t('admin.blog.f.slugHint')} />
            <Input label={t('admin.blog.f.excerptEn')} placeholder={t('admin.blog.f.excerptEnPh')} {...register('excerpt')} error={errors.excerpt?.message} />
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.contentEn')}</label>
              <RichTextEditor
                value={watch('content') || ''}
                onChange={(html) => setValue('content', html, { shouldValidate: true })}
                placeholder={t('admin.blog.f.contentPh')}
                onUploadImage={uploadInlineImage}
              />
              {errors.content && <p className="mt-1 text-xs text-danger">{errors.content.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.featuredImage')}</label>
              <div className="flex gap-2 items-center flex-wrap">
                {imageUrl && <img src={resolveImageUrl(imageUrl)} alt="Featured" className="w-20 h-14 object-cover rounded border border-line shrink-0" />}
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                    {imageUrl ? t('admin.blog.f.change') : t('admin.blog.f.uploadImage')}
                  </Button>
                </div>
                <Input label="Featured image alt text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Describe the image for readers and search engines" className="min-w-72 flex-1" />
              </div>
            </div>
          </>
        )}

        {/* Dutch translation tab */}
        {activeTab === 'nl' && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2 bg-surfaceAlt rounded-md px-3 py-2">
              <p className="text-xs text-ink-muted flex-1">{t('admin.blog.nlFallback')}</p>
              <Button type="button" variant="secondary" size="sm" loading={translating === 'nl'} onClick={() => handleAutoTranslate('nl')}>
                {t('admin.blog.autoTranslate')}
              </Button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.titleNl')}</label>
              <input value={nlTitle} onChange={(e) => setNlTitle(e.target.value)} placeholder={t('admin.blog.f.titleNlPh')} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.excerptNl')}</label>
              <input value={nlExcerpt} onChange={(e) => setNlExcerpt(e.target.value)} placeholder={t('admin.blog.f.excerptNlPh')} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.contentNl')}</label>
              <RichTextEditor value={nlContent} onChange={setNlContent} placeholder={t('admin.blog.f.contentNlPh')} onUploadImage={uploadInlineImage} />
            </div>
            <p className="text-xs text-ink-muted">Dutch SEO title and description: open the <button type="button" className="text-primary underline" onClick={() => setActiveTab('seo')}>SEO Meta</button> tab.</p>
          </>
        )}

        {/* German translation tab */}
        {activeTab === 'de' && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2 bg-surfaceAlt rounded-md px-3 py-2">
              <p className="text-xs text-ink-muted flex-1">{t('admin.blog.deFallback')}</p>
              <Button type="button" variant="secondary" size="sm" loading={translating === 'de'} onClick={() => handleAutoTranslate('de')}>
                {t('admin.blog.autoTranslate')}
              </Button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.titleDe')}</label>
              <input value={deTitle} onChange={(e) => setDeTitle(e.target.value)} placeholder={t('admin.blog.f.titleDePh')} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.excerptDe')}</label>
              <input value={deExcerpt} onChange={(e) => setDeExcerpt(e.target.value)} placeholder={t('admin.blog.f.excerptDePh')} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">{t('admin.blog.f.contentDe')}</label>
              <RichTextEditor value={deContent} onChange={setDeContent} placeholder={t('admin.blog.f.contentDePh')} onUploadImage={uploadInlineImage} />
            </div>
            <p className="text-xs text-ink-muted">German SEO title and description: open the <button type="button" className="text-primary underline" onClick={() => setActiveTab('seo')}>SEO Meta</button> tab.</p>
          </>
        )}

        {/* SEO & Settings tab */}
        {activeTab === 'seo' && (
          <>
            <Select label={t('admin.blog.f.baseLanguage')} {...register('baseLanguage')} options={[
              { value: 'en', label: '🇬🇧 English' },
              { value: 'nl', label: '🇳🇱 Nederlands' },
              { value: 'de', label: '🇩🇪 Deutsch' },
            ]} />
            <Select label={t('admin.blog.f.statusLabel')} {...register('status')} options={[
              { value: 'DRAFT', label: t('admin.blog.f.statusDraft') },
              { value: 'PUBLISHED', label: t('admin.blog.f.statusPublished') },
              { value: 'PAUSED', label: t('admin.blog.f.statusPaused') },
            ]} />
            <Select label={t('admin.blog.f.category')} {...register('categoryId')} options={[
              { value: '', label: t('admin.blog.f.noCategory') },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('admin.blog.f.tags')} placeholder={t('admin.blog.f.tagsPh')} {...register('tags')} />
              <Input type="number" label={t('admin.blog.f.readTime')} {...register('readTime')} error={errors.readTime?.message} />
            </div>

            <div className="rounded-md border border-line p-3 space-y-3">
              <p className="text-xs font-semibold text-ink uppercase tracking-wide">🇬🇧 English SEO</p>
              <Input
                label={t('admin.blog.f.seoTitle')}
                placeholder={t('admin.blog.f.seoTitlePh')}
                {...register('seoTitle')}
                hint={t('admin.blog.f.seoTitleHint')}
                error={errors.seoTitle?.message}
                rightSlot={<span className={`text-[10px] tabular-nums ${seoTitleValue.length > 70 ? 'text-danger' : 'text-ink-muted'}`}>{seoTitleValue.length}/70</span>}
              />
              <Input label="H1 heading" hint="Article heading. Leave blank to use the post title." {...register('seoH1')} error={errors.seoH1?.message} />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t('admin.blog.f.seoDesc')}</label>
                  <span className={`text-[10px] tabular-nums ${seoDescValue.length > 160 ? 'text-danger' : 'text-ink-muted'}`}>{seoDescValue.length}/160</span>
                </div>
                <textarea {...register('seoDescription')} rows={2} placeholder={t('admin.blog.f.seoDescPh')} className={`w-full rounded-md border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none ${errors.seoDescription ? 'border-danger/60' : 'border-line'}`} />
                {errors.seoDescription && <p className="mt-1 text-xs text-danger">{errors.seoDescription.message}</p>}
              </div>
            </div>

            <div className="rounded-md border border-line p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink uppercase tracking-wide">🇳🇱 Dutch SEO</p>
                <Button type="button" variant="secondary" size="sm" loading={translating === 'nl'} onClick={() => handleAutoTranslate('nl')}>
                  Auto-translate
                </Button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">SEO title (NL)</label>
                  <span className={`text-[10px] tabular-nums ${nlSeoTitle.length > 70 ? 'text-danger' : 'text-ink-muted'}`}>{nlSeoTitle.length}/70</span>
                </div>
                <input value={nlSeoTitle} onChange={(e) => setNlSeoTitle(e.target.value)} placeholder="30–70 characters" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Meta description (NL)</label>
                  <span className={`text-[10px] tabular-nums ${nlSeoDescription.length > 160 ? 'text-danger' : 'text-ink-muted'}`}>{nlSeoDescription.length}/160</span>
                </div>
                <textarea value={nlSeoDescription} onChange={(e) => setNlSeoDescription(e.target.value)} rows={2} placeholder="120–160 characters" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>

            <div className="rounded-md border border-line p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink uppercase tracking-wide">🇩🇪 German SEO</p>
                <Button type="button" variant="secondary" size="sm" loading={translating === 'de'} onClick={() => handleAutoTranslate('de')}>
                  Auto-translate
                </Button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">SEO title (DE)</label>
                  <span className={`text-[10px] tabular-nums ${deSeoTitle.length > 70 ? 'text-danger' : 'text-ink-muted'}`}>{deSeoTitle.length}/70</span>
                </div>
                <input value={deSeoTitle} onChange={(e) => setDeSeoTitle(e.target.value)} placeholder="30–70 characters" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Meta description (DE)</label>
                  <span className={`text-[10px] tabular-nums ${deSeoDescription.length > 160 ? 'text-danger' : 'text-ink-muted'}`}>{deSeoDescription.length}/160</span>
                </div>
                <textarea value={deSeoDescription} onChange={(e) => setDeSeoDescription(e.target.value)} rows={2} placeholder="120–160 characters" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>

            <p className="text-xs text-ink-muted">Required for publish: English SEO 30–70 / 120–160 chars. If Dutch or German content exists, matching SEO per language is required too. Also editable in SEO Center.</p>
          </>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'en', label: 'English' },
                { id: 'nl', label: 'Dutch' },
                { id: 'de', label: 'German' },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPreviewLang(option.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full ${previewLang === option.id ? 'bg-primary text-white' : 'bg-surfaceAlt text-ink-muted'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <iframe
              title="Blog post preview"
              sandbox=""
              srcDoc={previewDocument({
                title: previewTitle,
                excerpt: previewExcerpt,
                content: previewContent,
                imageUrl,
                imageAlt,
              })}
              className="w-full h-[560px] border border-line rounded-md bg-white"
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t('admin.common.cancel')}</Button>
          <Button type="submit" loading={submitting} className="flex-1">
            {editing ? t('admin.common.save') : t('admin.blog.f.createPost')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
