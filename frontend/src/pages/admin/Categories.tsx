import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminService, type AdminCategory, type CategoryInput } from '@/services/adminService';
import { translateService } from '@/services/blogService';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { useLangStore } from '@/stores/langStore';
import { extractErrorMessage } from '@/services/api';
import { buildSeoPayloadFromForm, parseSeoData } from '@/utils/seoMeta';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and dashes only'),
  description: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  seoH1: z.string().max(120).optional(),
});
type CategoryForm = z.infer<typeof schema>;

export default function AdminCategories() {
  const { t } = useT();
  const lang = useLangStore((s) => s.lang);
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'categories', lang], queryFn: () => adminService.listCategories(lang) });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  const create = useMutation({
    mutationFn: (p: CategoryInput) => adminService.createCategory(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      toast('Category created successfully', 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const update = useMutation({
    mutationFn: ({ id, p }: { id: string; p: CategoryInput }) => adminService.updateCategory(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('Category updated successfully', 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast('Category deleted successfully', 'info');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const onAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onEdit = (c: AdminCategory) => {
    setEditing(c);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.categories.title') || 'Product Categories'}</h2>
          <p className="text-sm text-ink-muted">
            {list.data ? `Total Categories: ${list.data.length}` : ''}
          </p>
        </div>
        <Button onClick={onAdd}>
          <Icon name="plus" size={14} />
          {t('admin.categories.new') || 'New Category'}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !list.data || list.data.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">{t('admin.categories.empty') || 'No categories found'}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                <th className="text-left px-4 py-3">{t('admin.categories.col.name') || 'Name'}</th>
                <th className="text-left px-4 py-3">{t('admin.categories.col.slug') || 'Slug'}</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">{t('admin.categories.col.description') || 'Description'}</th>
                <th className="text-left px-4 py-3">{t('admin.categories.col.products') || 'Products Count'}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.data.map((c) => (
                <tr key={c.id} className="border-b border-lineSoft last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-ink-muted">{c.slug}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-ink-muted max-w-xs truncate">
                    {c.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {c._count?.products ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(c)} className="text-xs font-semibold text-primary hover:text-primary-light mr-3">
                      {t('btn.edit') || 'Edit'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete category "${c.name}"?`)) {
                          remove.mutate(c.id);
                        }
                      }}
                      className="text-xs font-semibold text-ink-muted hover:text-danger"
                    >
                      {t('btn.delete') || 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        submitting={create.isPending || update.isPending}
        onSubmit={(v, translations) => {
          const existingSeo = editing ? parseSeoData(editing.seoData) : {};
          const payload: CategoryInput = {
            name: v.name,
            slug: v.slug.toLowerCase(),
            description: v.description || undefined,
            translations,
            seoData: buildSeoPayloadFromForm(v, existingSeo),
          };
          if (editing) update.mutate({ id: editing.id, p: payload });
          else create.mutate(payload);
        }}
      />
    </div>
  );
}

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: AdminCategory | null;
  submitting: boolean;
  onSubmit: (v: CategoryForm, translations: any) => void;
}

type TabId = 'en' | 'nl' | 'de' | 'seo';

function CategoryFormModal({ open, onClose, editing, submitting, onSubmit }: CategoryFormModalProps) {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', description: '' },
  });

  const [activeTab, setActiveTab] = useState<TabId>('en');
  const [nlName, setNlName] = useState('');
  const [nlDescription, setNlDescription] = useState('');
  const [deName, setDeName] = useState('');
  const [deDescription, setDeDescription] = useState('');
  const [translating, setTranslating] = useState<TabId | null>(null);

  const nameVal = watch('name');

  // Auto-generate slug from name if not editing
  useEffect(() => {
    if (!editing && nameVal) {
      const generated = nameVal
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setValue('slug', generated, { shouldValidate: true });
    }
  }, [nameVal, editing, setValue]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('en');
    if (editing) {
      let seo: Record<string, unknown> = {};
      try { seo = JSON.parse(editing.seoData || '{}'); } catch { seo = {}; }
      reset({
        name: editing.name,
        slug: editing.slug,
        description: editing.description || '',
        seoTitle: typeof seo.title === 'string' ? seo.title : '',
        seoDescription: typeof seo.description === 'string' ? seo.description : '',
        seoH1: typeof seo.h1 === 'string' ? seo.h1 : '',
      });
      let parsedTrans: any = {};
      try {
        parsedTrans = JSON.parse(editing.translations || '{}');
      } catch (e) {
        console.error(e);
      }
      setNlName(parsedTrans.nl?.name || '');
      setNlDescription(parsedTrans.nl?.description || '');
      setDeName(parsedTrans.de?.name || '');
      setDeDescription(parsedTrans.de?.description || '');
    } else {
      reset({ name: '', slug: '', description: '', seoTitle: '', seoDescription: '', seoH1: '' });
      setNlName('');
      setNlDescription('');
      setDeName('');
      setDeDescription('');
    }
  }, [open, editing, reset]);

  const handleAutoTranslate = async (lang: 'nl' | 'de') => {
    const values = watch();
    if (!values.name) {
      toast('Please enter English Name first.', 'info');
      return;
    }
    setTranslating(lang);
    try {
      const res = await translateService.autoTranslate(
        values.name,
        '',
        values.description || '',
        lang
      );
      if (lang === 'nl') {
        setNlName(res.title);
        setNlDescription(res.content);
        toast('Auto-translated to Dutch', 'success');
      } else {
        setDeName(res.title);
        setDeDescription(res.content);
        toast('Auto-translated to German', 'success');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to translate', 'error');
    } finally {
      setTranslating(null);
    }
  };

  const handleFormSubmit = (values: CategoryForm) => {
    const translations = {
      nl: {
        name: nlName || undefined,
        description: nlDescription || undefined,
      },
      de: {
        name: deName || undefined,
        description: deDescription || undefined,
      }
    };
    onSubmit(values, translations);
  };

  const TABS = [
    { id: 'seo', label: 'SEO' },
    { id: 'en', label: '🇬🇧 English' },
    { id: 'nl', label: '🇳🇱 Nederlands' },
    { id: 'de', label: '🇩🇪 Deutsch' },
  ];

  const nlFilled = !!(nlName || nlDescription);
  const deFilled = !!(deName || deDescription);

  return (
    <Modal open={open} onClose={onClose} title={editing ? (t('admin.categories.editTitle') || 'Edit Category') : (t('admin.categories.new') || 'New Category')} size="lg">
      <div className="flex gap-1 mb-4 border-b border-line pb-2 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`text-xs sm:text-sm font-medium px-2.5 sm:px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
              activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
            {tab.id === 'nl' && nlFilled && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            {tab.id === 'de' && deFilled && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {activeTab === 'en' && (
          <>
            <Input label={t('admin.categories.nameLabel') || 'Category Name'} placeholder="Peptides" {...register('name')} error={errors.name?.message} />
            <Input label={t('admin.categories.slugLabel') || 'Slug'} placeholder="peptides" {...register('slug')} error={errors.slug?.message} />
            <Textarea label={t('admin.categories.descriptionLabel') || 'Description'} placeholder="Category description..." {...register('description')} error={errors.description?.message} />
          </>
        )}

        {activeTab === 'nl' && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2 bg-surfaceAlt rounded-md px-3 py-2">
              <p className="text-xs text-ink-muted flex-1">Auto-translation fallback will be used if Dutch fields are left blank.</p>
              <Button type="button" variant="secondary" size="sm" loading={translating === 'nl'} onClick={() => handleAutoTranslate('nl')}>
                ✨ Auto-translate
              </Button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Dutch Name</label>
              <input value={nlName} onChange={(e) => setNlName(e.target.value)} placeholder="Categorie Naam (NL)" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Dutch Description</label>
              <textarea value={nlDescription} onChange={(e) => setNlDescription(e.target.value)} rows={5} placeholder="Categorie omschrijving..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono min-h-[120px]" />
            </div>
          </>
        )}

        {activeTab === 'de' && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2 bg-surfaceAlt rounded-md px-3 py-2">
              <p className="text-xs text-ink-muted flex-1">Auto-translation fallback will be used if German fields are left blank.</p>
              <Button type="button" variant="secondary" size="sm" loading={translating === 'de'} onClick={() => handleAutoTranslate('de')}>
                ✨ Auto-translate
              </Button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">German Name</label>
              <input value={deName} onChange={(e) => setDeName(e.target.value)} placeholder="Kategorie Name (DE)" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">German Description</label>
              <textarea value={deDescription} onChange={(e) => setDeDescription(e.target.value)} rows={5} placeholder="Kategorie Beschreibung..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono min-h-[120px]" />
            </div>
          </>
        )}

        {activeTab === 'seo' && (
          <>
            <Input label="SEO title" hint="Up to 70 characters. Leave blank to use the category name." {...register('seoTitle')} error={errors.seoTitle?.message} />
            <Input label="H1 heading" hint="Page heading. Leave blank to use the category name." {...register('seoH1')} error={errors.seoH1?.message} />
            <div>
              <Textarea label="Meta description" rows={3} {...register('seoDescription')} error={errors.seoDescription?.message} />
              <p className="mt-1 text-xs text-ink-muted">Up to 160 characters. Leave blank to use the category description.</p>
            </div>
            <p className="text-xs text-ink-muted">Also editable in SEO Center. Changes sync both ways.</p>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('admin.common.cancel') || 'Cancel'}
          </Button>
          <Button type="submit" loading={submitting} className="flex-1">
            {editing ? (t('admin.common.save') || 'Save') : (t('admin.categories.create') || 'Create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
