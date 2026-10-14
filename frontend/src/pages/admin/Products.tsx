import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productService } from '@/services/productService';
import { adminService, AdminProductInput } from '@/services/adminService';
import { translateService } from '@/services/blogService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUiStore } from '@/stores/uiStore';
import { useCategories } from '@/hooks/useProducts';
import { useT } from '@/hooks/useT';
import { extractErrorMessage } from '@/services/api';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { cn, resolveImageUrl } from '@/utils/helpers';
import { buildSeoPayloadFromForm, parseSeoData } from '@/utils/seoMeta';
import type { Product } from '@/types/product';

const schema = z.object({
  name: z.string().min(1, 'Required').max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, dashes only'),
  description: z.string().min(1, 'Required'),
  shortDesc: z.string().min(1, 'Required').max(300),
  price: z.coerce.number().min(0),
  comparePrice: z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), z.number().min(0).optional()),
  stock: z.coerce.number().int().min(0),
  sku: z.string().min(1).max(60),
  purity: z.string().min(1).max(30),
  weight: z.string().min(1).max(30),
  casNumber: z.string().min(1).max(30),
  categoryId: z.string().min(1),
  badge: z.string().max(30).optional().or(z.literal('')),
  sequence: z.string().max(500).optional().or(z.literal('')),
  storage: z.string().max(300).optional().or(z.literal('')),
  benefitsCsv: z.string().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  seoH1: z.string().max(120).optional(),
  labBatch: z.string().max(80).optional().or(z.literal('')),
  labReportUrl: z.string().max(500).optional().or(z.literal('')),
  labTestDate: z.string().max(40).optional().or(z.literal('')),
  labTestsJson: z.string().max(4000).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

type ProductForm = z.infer<typeof schema>;

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const { t } = useT();

  const list = useQuery({
    queryKey: ['admin', 'products', page, search],
    queryFn: () => productService.list({ page, limit: 20, search: search || undefined }),
    placeholderData: (prev) => prev,
  });
  const { data: categories } = useCategories();

  const create = useMutation({
    mutationFn: (p: AdminProductInput) => adminService.createProduct(p),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      if (data?.slug) qc.invalidateQueries({ queryKey: ['product', data.slug] });
      toast('Product created', 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const update = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<AdminProductInput> }) => adminService.updateProduct(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      qc.invalidateQueries({ queryKey: ['product'] });
      toast('Product updated', 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('Product archived', 'info');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const uploadImages = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => adminService.uploadProductImages(id, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product'] });
      toast('Images uploaded — delete or reorder old ones if the first photo should change', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const deleteImage = useMutation({
    mutationFn: ({ productId, imageId }: { productId: string; imageId: string }) =>
      adminService.deleteProductImage(productId, imageId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('Image deleted', 'info');
      setEditing((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          images: prev.images.filter((img) => img.id !== variables.imageId),
        };
      });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const reorderImages = useMutation({
    mutationFn: ({ productId, imageIds }: { productId: string; imageIds: string[] }) =>
      adminService.reorderProductImages(productId, imageIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('Image order updated', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const onAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (p: Product) => {
    setEditing(p);
    setModalOpen(true);
  };
  const onDelete = (p: Product) => {
    if (confirm(t('admin.products.confirmArchive', { name: p.name }))) remove.mutate(p.id);
  };

  const items = list.data?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.products.title')}</h2>
          <p className="text-sm text-ink-muted">
            {list.data
              ? list.data.meta.totalCount === 1
                ? t('shop.results', { n: list.data.meta.totalCount })
                : t('shop.resultsPlural', { n: list.data.meta.totalCount })
              : ''}
          </p>
        </div>
        <Button onClick={onAdd}>
          <Icon name="plus" size={14} />
          {t('admin.products.new')}
        </Button>
      </div>

      <div className="mb-5">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('admin.products.search')}
          className="field max-w-md"
        />
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">{t('admin.products.empty')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                <th className="text-left px-4 py-3">{t('label.name')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.products.col.sku')}</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">{t('admin.products.col.stock')}</th>
                <th className="text-right px-4 py-3">{t('label.price')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.products.col.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-lineSoft last:border-0 hover:bg-surfaceAlt">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-muted">{p.purity} · {p.weight}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-ink-muted">{p.sku}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-ink-muted">{p.stock}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{formatCompactCurrency(p.price)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge tone={p.isActive ? 'primary' : 'muted'}>
                      {p.isActive ? t('admin.products.status.active') : t('admin.products.status.hidden')}
                    </Badge>
                    {p.isFeatured && (
                      <Badge tone="gold" className="ml-1">
                        {t('admin.products.featuredFlag')}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(p)} className="text-xs font-semibold text-primary hover:text-primary-light mr-3">
                      {t('btn.edit')}
                    </button>
                    {p.isActive && (
                      <button onClick={() => onDelete(p)} className="text-xs font-semibold text-ink-muted hover:text-danger">
                        {t('admin.products.archive')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.data && list.data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-5">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <Icon name="arrowLeft" size={12} />
          </Button>
          <span className="text-xs text-ink-muted px-3">{t('admin.common.pageOf', { page, total: list.data.meta.totalPages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= list.data.meta.totalPages} onClick={() => setPage(page + 1)}>
            <Icon name="arrowRight" size={12} />
          </Button>
        </div>
      )}

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        categories={(categories || []).map((c) => ({ value: c.id, label: c.name }))}
        onSubmit={async (values, translations, files) => {
          const existingSeo = editing ? parseSeoData(editing.seoData) : {};
          let labTests: unknown = (existingSeo as Record<string, unknown>).labTests;
          if (values.labTestsJson?.trim()) {
            try {
              labTests = JSON.parse(values.labTestsJson);
            } catch {
              throw new Error('Lab tests JSON is invalid');
            }
          } else if (values.labTestsJson === '') {
            labTests = undefined;
          }
          const seoExtra: Record<string, unknown> = {
            ...buildSeoPayloadFromForm(values, existingSeo),
          };
          if (values.labBatch?.trim()) seoExtra.labBatch = values.labBatch.trim();
          else delete seoExtra.labBatch;
          if (values.labReportUrl?.trim()) seoExtra.labReportUrl = values.labReportUrl.trim();
          else delete seoExtra.labReportUrl;
          if (values.labTestDate?.trim()) seoExtra.labTestDate = values.labTestDate.trim();
          else delete seoExtra.labTestDate;
          if (labTests !== undefined) seoExtra.labTests = labTests;
          else delete seoExtra.labTests;

          const payload: AdminProductInput = {
            name: values.name,
            slug: values.slug,
            description: values.description,
            shortDesc: values.shortDesc,
            price: values.price,
            comparePrice: values.comparePrice ?? null,
            stock: values.stock,
            sku: values.sku,
            purity: values.purity,
            weight: values.weight,
            casNumber: values.casNumber,
            categoryId: values.categoryId,
            badge: values.badge || null,
            sequence: values.sequence || null,
            storage: values.storage || null,
            isActive: values.isActive,
            isFeatured: values.isFeatured,
            benefits: values.benefitsCsv ? values.benefitsCsv.split(/\s*[,\n]\s*/).filter(Boolean) : [],
            translations: JSON.stringify(translations),
            seoData: seoExtra as any,
          };
          let createdOrUpdatedId = editing?.id;
          if (editing) {
            await update.mutateAsync({ id: editing.id, p: payload });
          } else {
            const res = await create.mutateAsync(payload);
            createdOrUpdatedId = res.id;
          }
          if (files && files.length > 0 && createdOrUpdatedId) {
            await uploadImages.mutateAsync({ id: createdOrUpdatedId, files });
          }
        }}
        submitting={create.isPending || update.isPending || uploadImages.isPending}
        onDeleteImage={async (imageId) => {
          if (editing) {
            await deleteImage.mutateAsync({ productId: editing.id, imageId });
          }
        }}
        deletingImage={deleteImage.isPending}
        onReorderImages={async (imageIds) => {
          if (editing) {
            await reorderImages.mutateAsync({ productId: editing.id, imageIds });
            setEditing((prev) => {
              if (!prev) return null;
              const reordered = [...prev.images].sort((a, b) => {
                return imageIds.indexOf(a.id) - imageIds.indexOf(b.id);
              });
              return { ...prev, images: reordered };
            });
          }
        }}
      />
    </div>
  );
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Product | null;
  categories: Array<{ value: string; label: string }>;
  onSubmit: (values: ProductForm, translations: any, files: File[]) => void;
  submitting: boolean;
  onDeleteImage?: (imageId: string) => Promise<void>;
  deletingImage?: boolean;
  onReorderImages?: (imageIds: string[]) => Promise<void>;
}

function ProductFormModal({
  open,
  onClose,
  editing,
  categories,
  onSubmit,
  submitting,
  onDeleteImage,
  deletingImage,
  onReorderImages,
}: ProductFormModalProps) {
  const { t } = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'en' | 'nl' | 'de' | 'seo'>('general');
  const [translating, setTranslating] = useState<'nl' | 'de' | null>(null);
  const toast = useUiStore((s) => s.toast);

  // Dutch States
  const [nlName, setNlName] = useState('');
  const [nlShortDesc, setNlShortDesc] = useState('');
  const [nlDescription, setNlDescription] = useState('');
  const [nlBenefitsCsv, setNlBenefitsCsv] = useState('');

  // German States
  const [deName, setDeName] = useState('');
  const [deShortDesc, setDeShortDesc] = useState('');
  const [deDescription, setDeDescription] = useState('');
  const [deBenefitsCsv, setDeBenefitsCsv] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, isFeatured: false },
  });

  useEffect(() => {
    if (!open) return;
    setActiveTab('general');
    if (editing) {
      let seo: Record<string, unknown> = {};
      try { seo = JSON.parse(editing.seoData || '{}'); } catch { seo = {}; }
      reset({
        name: editing.name,
        slug: editing.slug,
        description: editing.description,
        shortDesc: editing.shortDesc,
        price: editing.price,
        comparePrice: editing.comparePrice ?? undefined,
        stock: editing.stock,
        sku: editing.sku,
        purity: editing.purity,
        weight: editing.weight,
        casNumber: editing.casNumber,
        categoryId: editing.categoryId,
        badge: editing.badge || '',
        sequence: editing.sequence || '',
        storage: editing.storage || '',
        benefitsCsv: editing.benefits.join(', '),
        seoTitle: typeof seo.title === 'string' ? seo.title : '',
        seoDescription: typeof seo.description === 'string' ? seo.description : '',
        seoH1: typeof seo.h1 === 'string' ? seo.h1 : '',
        labBatch: typeof seo.labBatch === 'string' ? seo.labBatch : '',
        labReportUrl: typeof seo.labReportUrl === 'string' ? seo.labReportUrl : '',
        labTestDate: typeof seo.labTestDate === 'string' ? seo.labTestDate : '',
        labTestsJson: Array.isArray(seo.labTests) ? JSON.stringify(seo.labTests, null, 2) : '',
        isActive: editing.isActive,
        isFeatured: editing.isFeatured,
      });

      // Parse translations
      let parsedTrans: any = {};
      try {
        parsedTrans = JSON.parse(editing.translations || '{}');
      } catch (e) {
        console.error(e);
      }
      const nlTrans = parsedTrans.nl || {};
      const deTrans = parsedTrans.de || {};

      setNlName(nlTrans.name || '');
      setNlShortDesc(nlTrans.shortDesc || '');
      setNlDescription(nlTrans.description || '');
      
      let nlBenefitsArr: string[] = [];
      if (nlTrans.benefits) {
        try {
          nlBenefitsArr = typeof nlTrans.benefits === 'string' ? JSON.parse(nlTrans.benefits) : nlTrans.benefits;
        } catch {
          nlBenefitsArr = [];
        }
      }
      setNlBenefitsCsv(Array.isArray(nlBenefitsArr) ? nlBenefitsArr.join(', ') : '');

      setDeName(deTrans.name || '');
      setDeShortDesc(deTrans.shortDesc || '');
      setDeDescription(deTrans.description || '');
      
      let deBenefitsArr: string[] = [];
      if (deTrans.benefits) {
        try {
          deBenefitsArr = typeof deTrans.benefits === 'string' ? JSON.parse(deTrans.benefits) : deTrans.benefits;
        } catch {
          deBenefitsArr = [];
        }
      }
      setDeBenefitsCsv(Array.isArray(deBenefitsArr) ? deBenefitsArr.join(', ') : '');
    } else {
      reset({
        name: '',
        slug: '',
        description: '',
        shortDesc: '',
        price: 0,
        stock: 0,
        sku: '',
        purity: '>99%',
        weight: '',
        casNumber: '',
        categoryId: '',
        badge: '',
        sequence: '',
        storage: '',
        benefitsCsv: '',
        seoTitle: '',
        seoDescription: '',
        seoH1: '',
        isActive: true,
        isFeatured: false,
      });
      setNlName('');
      setNlShortDesc('');
      setNlDescription('');
      setNlBenefitsCsv('');
      setDeName('');
      setDeShortDesc('');
      setDeDescription('');
      setDeBenefitsCsv('');
    }
    setFiles([]);
  }, [open, editing, reset]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => {
        const next = [...prev, ...selected];
        if (next.length > 8) {
          toast(t('admin.products.f.maxImagesExceeded', { max: 8 }) || 'Maximum of 8 images allowed', 'info');
          return next.slice(0, 8);
        }
        return next;
      });
      e.target.value = '';
    }
  };

  const handleAutoTranslate = async (lang: 'nl' | 'de') => {
    const values = watch();
    if (!values.name || !values.description) {
      toast('Please enter English Name and Description first.', 'info');
      return;
    }
    setTranslating(lang);
    try {
      const res = await translateService.autoTranslate(
        values.name,
        values.shortDesc || '',
        values.description,
        lang
      );

      let translatedBenefitsCsv = '';
      if (values.benefitsCsv) {
        const transBenefits = await translateService.autoTranslate(
          '',
          '',
          values.benefitsCsv,
          lang
        );
        translatedBenefitsCsv = transBenefits.content;
      }

      if (lang === 'nl') {
        setNlName(res.title);
        setNlShortDesc(res.excerpt);
        setNlDescription(res.content);
        if (translatedBenefitsCsv) setNlBenefitsCsv(translatedBenefitsCsv);
        toast('Auto-translated to Dutch', 'success');
      } else {
        setDeName(res.title);
        setDeShortDesc(res.excerpt);
        setDeDescription(res.content);
        if (translatedBenefitsCsv) setDeBenefitsCsv(translatedBenefitsCsv);
        toast('Auto-translated to German', 'success');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to translate', 'error');
    } finally {
      setTranslating(null);
    }
  };

  const handleFormSubmit = (values: ProductForm) => {
    const translations = {
      nl: {
        name: nlName || undefined,
        shortDesc: nlShortDesc || undefined,
        description: nlDescription || undefined,
        benefits: nlBenefitsCsv ? nlBenefitsCsv.split(/\s*[,\n]\s*/).filter(Boolean) : undefined,
      },
      de: {
        name: deName || undefined,
        shortDesc: deShortDesc || undefined,
        description: deDescription || undefined,
        benefits: deBenefitsCsv ? deBenefitsCsv.split(/\s*[,\n]\s*/).filter(Boolean) : undefined,
      }
    };
    onSubmit(values, translations, files);
  };

  const TABS = [
    { id: 'seo', label: 'SEO' },
    { id: 'general', label: '⚙️ General' },
    { id: 'en', label: '🇬🇧 English' },
    { id: 'nl', label: '🇳🇱 Nederlands' },
    { id: 'de', label: '🇩🇪 Deutsch' },
  ];

  const nlFilled = !!(nlName || nlDescription);
  const deFilled = !!(deName || deDescription);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('admin.products.modal.edit') : t('admin.products.modal.new')}
      size="xl"
    >
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
        {activeTab === 'general' && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label={t('admin.products.f.slug')}
                {...register('slug')}
                error={errors.slug?.message}
                hint={t('admin.products.f.slugHint')}
              />
              <Select
                label={t('admin.products.f.category')}
                {...register('categoryId')}
                options={[{ value: '', label: t('admin.products.f.categoryEmpty') }, ...categories]}
                error={errors.categoryId?.message}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input type="number" step="0.01" label={t('admin.products.f.price')} {...register('price')} error={errors.price?.message} />
              <Input type="number" step="0.01" label={t('admin.products.f.comparePrice')} {...register('comparePrice')} />
              <Input type="number" label={t('admin.products.f.stock')} {...register('stock')} error={errors.stock?.message} />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input label={t('admin.products.f.sku')} {...register('sku')} error={errors.sku?.message} />
              <Input label={t('admin.products.f.purity')} placeholder=">99%" {...register('purity')} />
              <Input label={t('admin.products.f.weight')} placeholder="5mg" {...register('weight')} />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input label={t('admin.products.f.cas')} {...register('casNumber')} />
              <Input label={t('admin.products.f.sequence')} {...register('sequence')} />
              <Input label={t('admin.products.f.storage')} {...register('storage')} />
            </div>

            <Input
              label={t('admin.products.f.badge')}
              placeholder={t('admin.products.f.badgePlaceholder')}
              {...register('badge')}
            />

            <div className="rounded-lg border border-line p-3 space-y-3 bg-surfaceHi/40">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">Lab results (public /labresults)</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Lab batch" placeholder="GP-260526-002" {...register('labBatch')} />
                <Input label="Test date" placeholder="2026-05-26" {...register('labTestDate')} />
              </div>
              <Input label="Lab report URL (Janoshik)" placeholder="https://janoshik.com/tests/..." {...register('labReportUrl')} />
              <Textarea
                label="Extra tests JSON (optional)"
                rows={3}
                {...register('labTestsJson')}
              />
              <p className="text-xs text-ink-dim">
                e.g. [{`{"label":"Purity (HPLC)","value":"99.4%","url":"https://..."}`},{`{"label":"Endotoxin","value":"<0.5 EU/mg"}`}]
              </p>
            </div>

            {editing && editing.images && editing.images.length > 0 && (
              <div className="mb-2">
                <label className="block text-xs font-bold text-ink-muted mb-1.5 uppercase tracking-wide">
                  Existing Images (Hover to Reorder / Delete)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {editing.images.map((img, idx) => (
                    <div key={img.id || idx} className="relative w-16 h-16 border border-line rounded bg-white overflow-hidden group">
                      <img
                        src={resolveImageUrl(img.url)}
                        alt="Product"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        disabled={deletingImage}
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this image permanently?')) {
                            onDeleteImage?.(img.id);
                          }
                        }}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold z-10"
                      >
                        Delete
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 flex justify-between px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (!editing.images) return;
                            const newImages = [...editing.images];
                            const temp = newImages[idx];
                            newImages[idx] = newImages[idx - 1];
                            newImages[idx - 1] = temp;
                            onReorderImages?.(newImages.map((i) => i.id));
                          }}
                          className="text-white text-xs hover:text-primary disabled:opacity-30 disabled:hover:text-white"
                        >
                          ◀
                        </button>
                        <span className="text-[9px] text-white/70">Move</span>
                        <button
                          type="button"
                          disabled={idx === editing.images.length - 1}
                          onClick={() => {
                            if (!editing.images) return;
                            const newImages = [...editing.images];
                            const temp = newImages[idx];
                            newImages[idx] = newImages[idx + 1];
                            newImages[idx + 1] = temp;
                            onReorderImages?.(newImages.map((i) => i.id));
                          }}
                          className="text-white text-xs hover:text-primary disabled:opacity-30 disabled:hover:text-white"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5 uppercase tracking-wide">
                Upload Images (Max 8)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={onFileChange}
                className="block w-full text-sm text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-btn file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {files.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-ink-muted mb-2">{files.length} file(s) selected.</p>
                  <div className="flex flex-wrap gap-2">
                    {files.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative w-16 h-16 border border-line rounded bg-white overflow-hidden group">
                          <img src={url} alt="preview" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => {
                              setFiles((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-5 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" {...register('isActive')} className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30" />
                {t('admin.products.f.active')}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" {...register('isFeatured')} className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30" />
                {t('admin.products.f.featured')}
              </label>
            </div>
          </>
        )}

        {activeTab === 'en' && (
          <>
            <Input label={t('admin.products.f.name')} {...register('name')} error={errors.name?.message} />
            <Input label={t('admin.products.f.shortDesc')} {...register('shortDesc')} error={errors.shortDesc?.message} />
            <Textarea rows={5} label={t('admin.products.f.desc')} {...register('description')} error={errors.description?.message} />
            <Textarea label={t('admin.products.f.benefits')} rows={3} {...register('benefitsCsv')} />
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
              <input value={nlName} onChange={(e) => setNlName(e.target.value)} placeholder="Tirzepatide (NL)" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Dutch Short Description</label>
              <input value={nlShortDesc} onChange={(e) => setNlShortDesc(e.target.value)} placeholder="Dual GLP-1/GIP receptor agonist..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Dutch Description</label>
              <textarea value={nlDescription} onChange={(e) => setNlDescription(e.target.value)} rows={5} placeholder="Volledige omschrijving..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono min-h-[120px]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Dutch Benefits (comma-separated)</label>
              <textarea value={nlBenefitsCsv} onChange={(e) => setNlBenefitsCsv(e.target.value)} rows={3} placeholder="Voordeel 1, Voordeel 2..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
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
              <input value={deName} onChange={(e) => setDeName(e.target.value)} placeholder="Tirzepatid (DE)" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">German Short Description</label>
              <input value={deShortDesc} onChange={(e) => setDeShortDesc(e.target.value)} placeholder="Dualer GLP-1/GIP-Rezeptor-Agonist..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">German Description</label>
              <textarea value={deDescription} onChange={(e) => setDeDescription(e.target.value)} rows={5} placeholder="Ausführliche Beschreibung..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y font-mono min-h-[120px]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">German Benefits (comma-separated)</label>
              <textarea value={deBenefitsCsv} onChange={(e) => setDeBenefitsCsv(e.target.value)} rows={3} placeholder="Vorteil 1, Vorteil 2..." className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
            </div>
          </>
        )}

        {activeTab === 'seo' && (
          <>
            <Input label="SEO title" hint="Up to 70 characters. Leave blank to use the product name." {...register('seoTitle')} error={errors.seoTitle?.message} />
            <Input label="H1 heading" hint="Page heading. Leave blank to use the product name and weight." {...register('seoH1')} error={errors.seoH1?.message} />
            <div>
              <Textarea label="Meta description" rows={3} {...register('seoDescription')} error={errors.seoDescription?.message} />
              <p className="mt-1 text-xs text-ink-muted">Up to 160 characters. Leave blank to use the short description.</p>
            </div>
            <p className="text-xs text-ink-muted">Also editable in SEO Center. Changes sync both ways.</p>
          </>
        )}

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-surface pt-3 -mx-6 px-6 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('btn.cancel')}
          </Button>
          <Button type="submit" loading={submitting} className="flex-1">
            {editing ? t('admin.products.f.save') : t('admin.products.f.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Unused import keeper (cn is used in pagination)
void cn;
