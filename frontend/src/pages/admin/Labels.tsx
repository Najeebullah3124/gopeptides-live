import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminService,
  DEFAULT_LABEL_COLORS,
  type LabelAsset,
  type LabelColorOverrides,
  type LabelLangFields,
  type LabelVariant,
  type ResolvedLabelColors,
} from '@/services/adminService';
import { productService } from '@/services/productService';
import { translateService } from '@/services/blogService';
import { extractErrorMessage } from '@/services/api';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';

const LANGUAGE_OPTIONS = [
  { value: 'nl', label: 'Dutch' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
];

const QR_MODES = ['auto', 'manual', 'csv', 'none'] as const;

const formSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  batchNumber: z.string().optional(),
  storageUnopened: z.string().optional(),
  storageReconstituted: z.string().optional(),
  storageNote: z.string().optional(),
  shelfLifeDate: z.string().optional(),
  languageDefault: z.string().optional(),
  labelWidthMm: z.coerce.number().min(1),
  labelHeightMm: z.coerce.number().min(1),
  qrMode: z.enum(QR_MODES),
  manualQrUrl: z.string().optional(),
  csvQrUrl: z.string().optional(),
});

type LabelForm = z.infer<typeof formSchema>;

function mergeColorOverrides(overrides?: LabelColorOverrides): ResolvedLabelColors {
  return { ...DEFAULT_LABEL_COLORS, ...overrides };
}

function pickColorOverrides(colors: ResolvedLabelColors): LabelColorOverrides {
  const out: LabelColorOverrides = {};
  (Object.keys(DEFAULT_LABEL_COLORS) as Array<keyof ResolvedLabelColors>).forEach((key) => {
    if (colors[key] !== DEFAULT_LABEL_COLORS[key]) out[key] = colors[key];
  });
  return out;
}

/*
function mergeFontOverrides(overrides?: LabelFontOverrides): ResolvedLabelFonts {
  return { ...DEFAULT_LABEL_FONTS, ...overrides };
}

function pickFontOverrides(fonts: ResolvedLabelFonts): LabelFontOverrides {
  const out: LabelFontOverrides = {};
  (Object.keys(DEFAULT_LABEL_FONTS) as Array<keyof ResolvedLabelFonts>).forEach((key) => {
    if (fonts[key] !== DEFAULT_LABEL_FONTS[key]) out[key] = fonts[key];
  });
  return out;
}
*/

function normalizeHexInput(value: string): string {
  const raw = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return raw;
}

function latestPngAsset(assets: LabelAsset[] | undefined): LabelAsset | undefined {
  return assets
    ?.filter((a) => a.format.toLowerCase() === 'png')
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
}

function previewBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Preview could not be read'));
    reader.readAsDataURL(blob);
  });
}

export default function AdminLabels() {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabelVariant | null>(null);
  const [formats, setFormats] = useState<Array<'png' | 'pdf'>>(['png', 'pdf']);
  const [printCopies, setPrintCopies] = useState(1);
  const [printerTarget, setPrinterTarget] = useState('');
  const [language, setLanguage] = useState<'nl' | 'en' | 'de'>('nl');
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState<ResolvedLabelColors>(DEFAULT_LABEL_COLORS);
  const [linkQrToProduct, setLinkQrToProduct] = useState(true);
  // Side-panel transparency is no longer a user-facing toggle — always let the
  // rainbow/plain background show through the info and branding panels.
  const fullBackground = true;
  const [useRainbowBackground, setUseRainbowBackground] = useState(true);
  const [quickBatch, setQuickBatch] = useState('');
  const stylesSourceId = useRef('');

  const list = useQuery({
    queryKey: ['admin', 'labels', search],
    queryFn: () => adminService.listLabelVariants(search),
  });

  const products = useQuery({
    queryKey: ['admin', 'products-for-labels'],
    queryFn: async () => {
      const merged = [];
      let page = 1;
      let hasNext = true;
      while (hasNext && page <= 20) {
        const res = await productService.list({ limit: 60, page });
        merged.push(...res.data);
        hasNext = res.meta.hasNext;
        page += 1;
      }
      return merged;
    },
  });

  const items = list.data || [];
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  useEffect(() => {
    if (!selectedId && items.length) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const [tiffPreviewUrl, setTiffPreviewUrl] = useState('');
  const [tiffPreviewLoading, setTiffPreviewLoading] = useState(false);
  const [tiffPreviewError, setTiffPreviewError] = useState<string | null>(null);
  const [generatedPreviewKey, setGeneratedPreviewKey] = useState(0);

  // Load saved styles when switching variants (not on background refetches).
  useEffect(() => {
    if (!selectedId) return;
    if (stylesSourceId.current === selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (!item) return;
    stylesSourceId.current = selectedId;
    setColorDraft(mergeColorOverrides(item.colorOverrides));
    setLinkQrToProduct(item.qrMode !== 'none');
    setTiffPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setTiffPreviewError(null);
  }, [selectedId, items]);

  useEffect(
    () => () => {
      setTiffPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    },
    []
  );

  // Live preview — the label design (rainbow/TIFF-background layout, with a toggle
  // for plain background), debounced so rapid color/toggle edits don't spam requests.
  useEffect(() => {
    if (!selected?.id) {
      setTiffPreviewUrl('');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setTiffPreviewLoading(true);
      setTiffPreviewError(null);
      adminService
        .previewLabelVariant({
          variantId: selected.id,
          language,
          colorOverrides: colorDraft,
          includeProductLink: linkQrToProduct,
          layout: 'tiff',
          fullBackground,
          useRainbowBackground,
        })
        .then(async (blob) => {
          if (cancelled) return;
          const url = await previewBlobToDataUrl(blob);
          setTiffPreviewUrl(url);
          setTiffPreviewError(null);
        })
        .catch((err) => {
          if (!cancelled) setTiffPreviewError(extractErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setTiffPreviewLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // selected?.updatedAt: refetches after a modal save (batch/storage/CoA text
    // etc.) even though selected.id itself doesn't change — otherwise the
    // preview keeps showing stale content until some other field is touched.
  }, [selected?.id, selected?.updatedAt, colorDraft, language, linkQrToProduct, fullBackground, useRainbowBackground]);

  const createMutation = useMutation({
    mutationFn: adminService.createLabelVariant,
    onSuccess: () => {
      toast(t('admin.labels.created'), 'success');
      qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
      setModalOpen(false);
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminService.updateLabelVariant>[1] }) =>
      adminService.updateLabelVariant(id, payload),
    onSuccess: () => {
      toast(t('admin.labels.updated'), 'success');
      qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
      setModalOpen(false);
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteLabelVariant,
    onSuccess: () => {
      toast(t('admin.labels.deleted'), 'info');
      qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
      setSelectedId('');
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const generateMutation = useMutation({
    mutationFn: (variantId: string) =>
      adminService.generateLabelAssets({ variantIds: [variantId], formats, language, includeProductLink: linkQrToProduct, layout: 'tiff', fullBackground, useRainbowBackground }),
    onSuccess: async (result) => {
      toast(t('admin.labels.generated'), 'success');
      setGeneratedPreviewKey(Date.now());
      await qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
      const png = result[0]?.assets?.find((a) => a.format === 'png');
      if (png) setPreviewAssetId(png.id);
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const printMutation = useMutation({
    mutationFn: (variantId: string) =>
      adminService.printLabel({
        variantId,
        copies: printCopies,
        printerTarget: printerTarget || undefined,
        language,
        includeProductLink: linkQrToProduct,
      }),
    onSuccess: (result) => toast(result.message || t('admin.labels.printed'), 'success'),
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: adminService.deleteLabelAsset,
    onSuccess: () => {
      toast(t('admin.labels.assetRemoved'), 'info');
      qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const clearAssetsMutation = useMutation({
    mutationFn: adminService.clearLabelVariantAssets,
    onSuccess: () => {
      toast(t('admin.labels.assetsCleared'), 'info');
      qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
      setPreviewAssetId(null);
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  const saveStylesMutation = useMutation({
    mutationFn: ({
      id,
      colorOverrides,
    }: {
      id: string;
      colorOverrides: ResolvedLabelColors;
    }) => adminService.updateLabelVariant(id, { colorOverrides }),
    onSuccess: (updated) => {
      toast(t('admin.labels.stylesSaved'), 'success');
      stylesSourceId.current = updated.id;
      qc.setQueryData<LabelVariant[]>(['admin', 'labels', search], (old) =>
        old?.map((item) => (item.id === updated.id ? updated : item))
      );
      qc.invalidateQueries({ queryKey: ['admin', 'labels'] });
      setColorDraft(mergeColorOverrides(updated.colorOverrides));
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  });

  function onAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function onEdit(item: LabelVariant) {
    setEditing(item);
    setModalOpen(true);
  }

  function onDelete(item: LabelVariant) {
    if (!confirm(t('admin.labels.confirmDelete', { name: `${item.product.name} ${item.dosage}` }))) return;
    deleteMutation.mutate(item.id);
  }

  async function handleDownload(asset: LabelAsset) {
    const blob = await adminService.downloadLabelAsset(asset.id);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = asset.fileName;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  function toggleFormat(next: 'png' | 'pdf') {
    setFormats((prev) => {
      if (prev.includes(next)) {
        const filtered = prev.filter((item) => item !== next);
        return filtered.length ? filtered : [next];
      }
      return [...prev, next];
    });
  }

  const productOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const p of products.data || []) {
      byId.set(p.id, `${p.name} (${p.slug})`);
    }
    for (const item of items) {
      byId.set(item.product.id, `${item.product.name} (${item.product.slug})`);
    }
    return Array.from(byId.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products.data, items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.labels.title')}</h2>
          <p className="text-sm text-ink-muted">{t('admin.labels.subtitle')}</p>
        </div>
        <Button onClick={onAdd} className="w-full sm:w-auto shrink-0">{t('admin.labels.add')}</Button>
      </div>

      <div className="card p-4">
        <Input
          label={t('admin.labels.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.labels.searchPlaceholder')}
        />
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !items.length ? (
        <div className="card p-8 text-center text-ink-muted">{t('admin.labels.empty')}</div>
      ) : (
        <div className="space-y-6">
          {/* Mobile / tablet: card list */}
          <section className="lg:hidden space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`card p-4 space-y-3 cursor-pointer ${selectedId === item.id ? 'ring-2 ring-primary/40 bg-primary/5' : ''}`}
                onClick={() => {
                  setSelectedId(item.id);
                  setPreviewAssetId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(item.id);
                    setPreviewAssetId(null);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink break-words">{item.product.name}</div>
                    <div className="text-sm text-ink-muted mt-0.5">{item.dosage}</div>
                    <div className="text-xs text-ink-muted font-mono break-all mt-1">{item.product.slug}</div>
                  </div>
                  <Badge tone={item.assets?.length ? 'success' : 'muted'}>
                    {item.assets?.length || 0}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-2 border-t border-line" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="font-semibold text-primary hover:underline" onClick={() => onEdit(item)}>
                    {t('admin.labels.edit')}
                  </button>
                  <Link to={`/${item.product.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
                    {t('admin.labels.viewShort')}
                  </Link>
                  <button type="button" className="font-semibold text-danger hover:underline" onClick={() => onDelete(item)}>
                    {t('admin.labels.delete')}
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="hidden lg:block space-y-4">
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[36rem]">
                  <thead className="bg-surfaceAlt text-ink-muted text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold">{t('admin.labels.colProduct')}</th>
                      <th className="px-4 py-3 font-semibold">{t('admin.labels.colDosage')}</th>
                      <th className="px-4 py-3 font-semibold">{t('admin.labels.colBatch')}</th>
                      <th className="hidden xl:table-cell px-4 py-3 font-semibold">{t('admin.labels.colSize')}</th>
                      <th className="px-4 py-3 font-semibold">{t('admin.labels.colAssets')}</th>
                      <th className="px-4 py-3 font-semibold text-right w-28">{t('admin.labels.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-t border-line cursor-pointer hover:bg-surfaceAlt/60 ${selectedId === item.id ? 'bg-primary/5' : ''}`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setPreviewAssetId(null);
                        }}
                      >
                        <td className="px-4 py-3 max-w-[12rem]">
                          <div className="font-semibold text-ink break-words">{item.product.name}</div>
                          <div className="text-xs text-ink-muted font-mono break-all">{item.product.slug}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.dosage}</td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{item.batchNumber || '—'}</td>
                        <td className="hidden xl:table-cell px-4 py-3 whitespace-nowrap">{item.labelWidthMm}×{item.labelHeightMm}</td>
                        <td className="px-4 py-3">
                          <Badge tone={item.assets?.length ? 'success' : 'muted'}>
                            {item.assets?.length || 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right align-top" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex flex-col items-end gap-1 text-xs leading-snug xl:flex-row xl:items-center xl:gap-x-3 xl:gap-y-0">
                            <button type="button" className="font-semibold text-primary hover:underline whitespace-nowrap" onClick={() => onEdit(item)}>
                              {t('admin.labels.edit')}
                            </button>
                            <Link to={`/${item.product.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline whitespace-nowrap">
                              {t('admin.labels.viewShort')}
                            </Link>
                            <button type="button" className="font-semibold text-danger hover:underline whitespace-nowrap" onClick={() => onDelete(item)}>
                              {t('admin.labels.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Preview, colors, generate — full width below list */}
          <section className="space-y-4 min-w-0">
            {selected ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  <div className="card p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-semibold text-ink">{t('admin.labels.preview')}</h3>
                      <Link to={`/admin/products`} className="text-xs text-primary hover:underline shrink-0">
                        {t('admin.labels.manageProduct')}
                      </Link>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                        {t(useRainbowBackground ? 'admin.labels.rainbowWith' : 'admin.labels.rainbowWithout')}
                        {tiffPreviewLoading ? ' …' : ''}
                      </p>
                      {tiffPreviewUrl ? (
                        <div className="w-full overflow-hidden rounded-md border border-line bg-white" style={{ aspectRatio: `${selected.labelWidthMm} / ${selected.labelHeightMm}` }}>
                          <img key={tiffPreviewUrl} src={tiffPreviewUrl} alt="Label preview" className="w-full h-full object-contain select-none" draggable={false} />
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed border-line text-ink-muted text-xs grid place-items-center p-2 text-center" style={{ aspectRatio: `${selected.labelWidthMm} / ${selected.labelHeightMm}` }}>
                          {tiffPreviewLoading
                            ? t('admin.labels.previewLoading')
                            : tiffPreviewError || t('admin.labels.noPreview')}
                        </div>
                      )}
                      <label className="inline-flex items-center gap-2 text-xs text-ink-muted pt-1">
                        <input
                          type="checkbox"
                          checked={useRainbowBackground}
                          onChange={(e) => setUseRainbowBackground(e.target.checked)}
                        />
                        {t('admin.labels.rainbowBackground')}
                      </label>
                    </div>
                  </div>

                  <div className="card p-4 space-y-3 lg:sticky lg:top-4 lg:max-h-[min(36rem,75vh)] lg:overflow-y-auto">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-semibold text-ink">{t('admin.labels.stylesTitle')}</h3>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto justify-center shrink-0"
                        onClick={() => {
                          setColorDraft(DEFAULT_LABEL_COLORS);
                        }}
                      >
                        {t('admin.labels.stylesReset')}
                      </Button>
                    </div>
                    <p className="text-xs text-ink-muted">{t('admin.labels.stylesHint')}</p>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold mb-2">{t('admin.labels.colorsFront')}</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <LabelColorField label={t('admin.labels.colorFrontProductName')} value={colorDraft.frontProductName} onChange={(v) => setColorDraft((p) => ({ ...p, frontProductName: v }))} />
                          <LabelColorField label={t('admin.labels.colorFrontDivider')} value={colorDraft.frontDivider} onChange={(v) => setColorDraft((p) => ({ ...p, frontDivider: v }))} />
                          <LabelColorField label={t('admin.labels.colorFrontBadgeFill')} value={colorDraft.frontBadgeFill} onChange={(v) => setColorDraft((p) => ({ ...p, frontBadgeFill: v }))} />
                          <LabelColorField label={t('admin.labels.colorFrontDosage')} value={colorDraft.frontDosage} onChange={(v) => setColorDraft((p) => ({ ...p, frontDosage: v }))} />
                          <LabelColorField label={t('admin.labels.colorFrontBadgeStroke')} value={colorDraft.frontBadgeStroke} onChange={(v) => setColorDraft((p) => ({ ...p, frontBadgeStroke: v }))} />
                          <LabelColorField label={t('admin.labels.colorFrontDisclaimer')} value={colorDraft.frontDisclaimer} onChange={(v) => setColorDraft((p) => ({ ...p, frontDisclaimer: v }))} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold mb-2">{t('admin.labels.colorsBack')}</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <LabelColorField label={t('admin.labels.colorBackHeaderPrefix')} value={colorDraft.backHeaderPrefix} onChange={(v) => setColorDraft((p) => ({ ...p, backHeaderPrefix: v }))} />
                          <LabelColorField label={t('admin.labels.colorBackHeaderNameDosage')} value={colorDraft.backHeaderNameDosage} onChange={(v) => setColorDraft((p) => ({ ...p, backHeaderNameDosage: v }))} />
                          <LabelColorField label={t('admin.labels.colorBackHeaderAccent')} value={colorDraft.backHeaderAccent} onChange={(v) => setColorDraft((p) => ({ ...p, backHeaderAccent: v }))} />
                          <LabelColorField label={t('admin.labels.colorBackFieldLabels')} value={colorDraft.backFieldLabels} onChange={(v) => setColorDraft((p) => ({ ...p, backFieldLabels: v }))} />
                          <LabelColorField label={t('admin.labels.colorBackFieldValues')} value={colorDraft.backFieldValues} onChange={(v) => setColorDraft((p) => ({ ...p, backFieldValues: v }))} />
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full justify-center"
                      onClick={() =>
                        saveStylesMutation.mutate({
                          id: selected.id,
                          colorOverrides: colorDraft,
                        })
                      }
                      loading={saveStylesMutation.isPending}
                    >
                      {t('admin.labels.stylesSave')}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="card p-4 space-y-3">
                    <h3 className="font-semibold text-ink">{t('admin.labels.generatePrint')}</h3>
                    <div className="flex items-end gap-2 mb-2">
                      <div className="flex-1">
                        <Input label={t('admin.labels.batch')} value={quickBatch} onChange={(e) => setQuickBatch(e.target.value)} />
                      </div>
                      <Button variant="secondary" onClick={() => updateMutation.mutate({ id: selected.id, payload: { batchNumber: quickBatch } })} loading={updateMutation.isPending}>Save</Button>
                    </div>
                    <Select label={t('admin.labels.outputLanguage')} value={language} options={LANGUAGE_OPTIONS} onChange={(e) => setLanguage(e.target.value as 'nl' | 'en' | 'de')} />
                    <div className="flex flex-col gap-2 text-sm pt-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={formats.includes('png')} onChange={() => toggleFormat('png')} /> PNG
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={formats.includes('pdf')} onChange={() => toggleFormat('pdf')} /> PDF
                        </label>
                      </div>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={linkQrToProduct}
                          onChange={(e) => setLinkQrToProduct(e.target.checked)}
                        />
                        {t('admin.labels.includeProductLink')}
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useRainbowBackground}
                          onChange={(e) => setUseRainbowBackground(e.target.checked)}
                        />
                        {t('admin.labels.rainbowBackground')}
                      </label>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button className="w-full justify-center" onClick={() => generateMutation.mutate(selected.id)} loading={generateMutation.isPending}>
                        {t('admin.labels.generate')}
                      </Button>
                    </div>
                    <div className="border-t border-line pt-3 space-y-2">
                      <Input label={t('admin.labels.printerTarget')} value={printerTarget} onChange={(e) => setPrinterTarget(e.target.value)} />
                      <Input label={t('admin.labels.copies')} type="number" min={1} value={printCopies} onChange={(e) => setPrintCopies(Math.max(1, Number(e.target.value) || 1))} />
                      <Button variant="secondary" className="w-full justify-center" onClick={() => printMutation.mutate(selected.id)} loading={printMutation.isPending}>
                        {t('admin.labels.print')}
                      </Button>
                    </div>
                  </div>

                  <div className="card p-4 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold text-ink">{t('admin.labels.assets')}</h3>
                    <Button size="sm" variant="danger" className="w-full sm:w-auto justify-center shrink-0 whitespace-normal leading-snug" onClick={() => clearAssetsMutation.mutate(selected.id)} disabled={!selected.assets?.length} loading={clearAssetsMutation.isPending}>
                      {t('admin.labels.removeAll')}
                    </Button>
                  </div>
                  {selected.assets?.length ? (
                    selected.assets.map((asset) => (
                      <div key={asset.id} className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2 ${previewAssetId === asset.id || (!previewAssetId && asset.id === latestPngAsset(selected.assets)?.id) ? 'border-primary bg-primary/5' : 'border-line'}`}>
                        <button type="button" className="min-w-0 text-left w-full" onClick={() => setPreviewAssetId(asset.id)}>
                          <div className="font-semibold text-ink truncate">{asset.fileName}</div>
                          <div className="text-ink-muted text-xs break-words">{asset.format.toUpperCase()} • {new Date(asset.generatedAt).toLocaleString()}</div>
                        </button>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:shrink-0">
                          <button
                            type="button"
                            className="text-xs font-semibold text-primary hover:underline text-left sm:text-center py-1"
                            onClick={() => handleDownload(asset)}
                          >
                            {t('admin.labels.download')}
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-danger hover:underline text-left sm:text-center py-1"
                            onClick={() => deleteAssetMutation.mutate(asset.id)}
                          >
                            {t('admin.labels.remove')}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-ink-muted">{t('admin.labels.noAssets')}</div>
                  )}
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-8 text-center text-ink-muted">{t('admin.labels.selectRow')}</div>
            )}
          </section>
        </div>
      )}

      <LabelFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        productOptions={productOptions}
        productsLoading={products.isLoading}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values, translations) => {
          if (editing) {
            const { productId: _omit, ...rest } = values;
            updateMutation.mutate({ id: editing.id, payload: { ...rest, translations } });
          } else {
            createMutation.mutate({ ...values, translations });
          }
        }}
      />
    </div>
  );
}

interface LabelFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: LabelVariant | null;
  productOptions: Array<{ value: string; label: string }>;
  productsLoading: boolean;
  submitting: boolean;
  onSubmit: (values: LabelForm, translations: Record<string, LabelLangFields>) => void;
}

function LabelFormModal({ open, onClose, editing, productOptions, productsLoading, submitting, onSubmit }: LabelFormModalProps) {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const [activeTab, setActiveTab] = useState<'general' | 'en' | 'nl' | 'de'>('general');
  const [translating, setTranslating] = useState<'nl' | 'de' | null>(null);

  const [enFields, setEnFields] = useState<LabelLangFields>({});
  const [nlFields, setNlFields] = useState<LabelLangFields>({});
  const [deFields, setDeFields] = useState<LabelLangFields>({});

  const qrOptions = useMemo(
    () => [
      { value: 'auto', label: t('admin.labels.qrModeAuto') },
      { value: 'manual', label: t('admin.labels.qrModeManual') },
      { value: 'csv', label: t('admin.labels.qrModeCsv') },
      { value: 'none', label: t('admin.labels.qrModeNone') },
    ],
    [t]
  );

  const selectProductOptions = useMemo(() => {
    if (productsLoading) return [{ value: '', label: t('admin.labels.productsLoading') }];
    if (!productOptions.length) return [{ value: '', label: t('admin.labels.noProducts') }];
    return [{ value: '', label: t('admin.labels.selectProduct') }, ...productOptions];
  }, [productOptions, productsLoading, t]);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<LabelForm>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      languageDefault: 'nl',
      labelWidthMm: 40,
      labelHeightMm: 20,
      qrMode: 'auto',
    },
  });

  // The UI exposes a single free-text "Storage" field per language; legacy rows
  // may still have text split across unopened/reconstituted/note, so join them
  // for editing and persist the result back into storageUnopened only.
  const joinStorage = (o: { storageUnopened?: string | null; storageReconstituted?: string | null; storageNote?: string | null }) =>
    [o.storageUnopened, o.storageReconstituted, o.storageNote]
      .map((v) => (v || '').trim())
      .filter(Boolean)
      .join(' / ');

  useEffect(() => {
    if (!open) return;
    setActiveTab('general');
    if (editing) {
      reset({
        productId: editing.productId,
        dosage: editing.dosage,
        batchNumber: editing.batchNumber || '',
        storageUnopened: joinStorage(editing),
        storageReconstituted: '',
        storageNote: '',
        shelfLifeDate: editing.shelfLifeDate || '',
        languageDefault: editing.languageDefault || 'nl',
        labelWidthMm: editing.labelWidthMm,
        labelHeightMm: editing.labelHeightMm,
        qrMode: (editing.qrMode || 'auto') as LabelForm['qrMode'],
        manualQrUrl: editing.manualQrUrl || '',
        csvQrUrl: editing.csvQrUrl || '',
      });
      const toLangFields = (o?: LabelLangFields): LabelLangFields => ({
        storageUnopened: joinStorage(o || {}),
        storageReconstituted: '',
        storageNote: '',
        coaReference: o?.coaReference || '',
      });
      setEnFields(toLangFields(editing.translations?.en));
      setNlFields(toLangFields(editing.translations?.nl));
      setDeFields(toLangFields(editing.translations?.de));
    } else {
      reset({
        productId: productOptions[0]?.value || '',
        dosage: '',
        batchNumber: '',
        storageUnopened: '',
        storageReconstituted: '',
        storageNote: '',
        shelfLifeDate: '',
        languageDefault: 'nl',
        labelWidthMm: 40,
        labelHeightMm: 20,
        qrMode: 'auto',
        manualQrUrl: '',
        csvQrUrl: '',
      });
      setEnFields({});
      setNlFields({});
      setDeFields({});
    }
  }, [open, editing, productOptions, reset]);

  useEffect(() => {
    if (!open || editing || productsLoading || !productOptions.length) return;
    const current = watch('productId');
    if (!current || !productOptions.some((option) => option.value === current)) {
      setValue('productId', productOptions[0].value, { shouldValidate: true });
    }
  }, [open, editing, productsLoading, productOptions, setValue, watch]);

  const qrMode = watch('qrMode');

  async function handleAutoTranslate(lang: 'nl' | 'de') {
    const values = watch();
    const sourceStorage = (values.storageUnopened || '').trim();
    if (!sourceStorage) {
      toast(t('admin.labels.translateFirst'), 'info');
      return;
    }
    setTranslating(lang);
    try {
      const translated = await translateService.autoTranslate(sourceStorage, '', '', lang);
      // Only the storage text is translated — keep the CoA reference as-is
      // (certificate numbers are language-independent).
      const apply = (p: LabelLangFields): LabelLangFields => ({
        ...p,
        storageUnopened: translated.title,
        storageReconstituted: '',
        storageNote: '',
      });
      if (lang === 'nl') setNlFields(apply);
      else setDeFields(apply);
      toast(t('admin.labels.translated'), 'success');
    } catch (e) {
      toast(extractErrorMessage(e), 'error');
    } finally {
      setTranslating(null);
    }
  }

  function submitForm(values: LabelForm) {
    // Drop empty-string keys so an untouched language falls back to the base
    // fields instead of overriding them with blanks.
    const prune = (fields: LabelLangFields): LabelLangFields => {
      const out: LabelLangFields = {};
      (Object.keys(fields) as Array<keyof LabelLangFields>).forEach((key) => {
        const value = (fields[key] || '').trim();
        if (value) out[key] = value;
      });
      return out;
    };
    const translations: Record<string, LabelLangFields> = {};
    const en = prune(enFields);
    const nl = prune(nlFields);
    const de = prune(deFields);
    if (Object.keys(en).length) translations.en = en;
    if (Object.keys(nl).length) translations.nl = nl;
    if (Object.keys(de).length) translations.de = de;
    onSubmit(values, translations);
  }

  const tabs = [
    { id: 'general' as const, label: t('admin.labels.tabGeneral') },
    { id: 'en' as const, label: t('admin.labels.tabEnglish') },
    { id: 'nl' as const, label: t('admin.labels.tabDutch') },
    { id: 'de' as const, label: t('admin.labels.tabGerman') },
  ];

  function onInvalidSubmit(formErrors: typeof errors) {
    const first = Object.values(formErrors).find((e) => e?.message);
    toast(first?.message || t('admin.labels.formInvalid'), 'error');
    if (formErrors.dosage || formErrors.productId) setActiveTab('general');
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('admin.labels.editTitle') : t('admin.labels.addTitle')} size="xl">
      <form onSubmit={handleSubmit(submitForm, onInvalidSubmit)} className="space-y-4">
        <div className="flex gap-2 flex-wrap border-b border-line pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === tab.id ? 'bg-primary text-primary-ink' : 'text-ink-muted hover:bg-surfaceAlt'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {editing && <input type="hidden" {...register('productId')} />}

        <div className={activeTab === 'general' ? 'space-y-3' : 'hidden'} aria-hidden={activeTab !== 'general'}>
            {editing ? (
              <div className="w-full">
                <p className="label">{t('admin.labels.product')}</p>
                <div className="field bg-surfaceAlt text-ink font-semibold">
                  {editing.product.name}
                  <span className="text-ink-muted text-xs font-normal ml-2">({editing.product.slug})</span>
                </div>
              </div>
            ) : (
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <Select
                    label={t('admin.labels.product')}
                    options={selectProductOptions}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={productsLoading || !productOptions.length}
                    error={errors.productId?.message}
                  />
                )}
              />
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label={t('admin.labels.dosage')} {...register('dosage')} error={errors.dosage?.message} />
              <Input label={t('admin.labels.batch')} {...register('batchNumber')} />
            </div>
            <Input label={t('admin.labels.shelfLife')} {...register('shelfLifeDate')} placeholder="DD-MM-YYYY" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label={t('admin.labels.widthMm')} type="number" {...register('labelWidthMm')} />
              <Input label={t('admin.labels.heightMm')} type="number" {...register('labelHeightMm')} />
            </div>
            <Select label={t('admin.labels.qrMode')} {...register('qrMode')} options={qrOptions} />
            {qrMode === 'manual' && (
              <Input label={t('admin.labels.manualQr')} {...register('manualQrUrl')} />
            )}
            {qrMode === 'csv' && editing?.csvQrUrl && (
              <Input label={t('admin.labels.csvQr')} value={editing.csvQrUrl} readOnly />
            )}
            <Select label={t('admin.labels.defaultLang')} {...register('languageDefault')} options={LANGUAGE_OPTIONS} />
        </div>

        {/* Keep the English storage field registered even when another tab is active */}
        <div className={activeTab === 'en' ? 'space-y-3' : 'hidden'} aria-hidden={activeTab !== 'en'}>
            <p className="text-xs text-ink-muted">{t('admin.labels.englishHint')}</p>
            <Textarea label={t('admin.labels.storageText')} rows={3} {...register('storageUnopened')} />
            <Input
              label="CoA reference"
              value={enFields.coaReference || ''}
              onChange={(e) => setEnFields((p) => ({ ...p, coaReference: e.target.value }))}
              placeholder="e.g. COA-2607-001"
            />
        </div>

        <div className={activeTab === 'nl' ? 'space-y-3' : 'hidden'} aria-hidden={activeTab !== 'nl'}>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleAutoTranslate('nl')} loading={translating === 'nl'}>
              ✨ {t('admin.labels.autoTranslate')}
            </Button>
            <Textarea
              label={t('admin.labels.storageText')}
              rows={3}
              value={nlFields.storageUnopened || ''}
              onChange={(e) => setNlFields((p) => ({ ...p, storageUnopened: e.target.value, storageReconstituted: '', storageNote: '' }))}
            />
            <Input
              label="CoA reference"
              value={nlFields.coaReference || ''}
              onChange={(e) => setNlFields((p) => ({ ...p, coaReference: e.target.value }))}
              placeholder="bijv. COA-2607-001"
            />
        </div>

        <div className={activeTab === 'de' ? 'space-y-3' : 'hidden'} aria-hidden={activeTab !== 'de'}>
            <Button type="button" variant="secondary" size="sm" onClick={() => handleAutoTranslate('de')} loading={translating === 'de'}>
              ✨ {t('admin.labels.autoTranslate')}
            </Button>
            <Textarea
              label={t('admin.labels.storageText')}
              rows={3}
              value={deFields.storageUnopened || ''}
              onChange={(e) => setDeFields((p) => ({ ...p, storageUnopened: e.target.value, storageReconstituted: '', storageNote: '' }))}
            />
            <Input
              label="CoA reference"
              value={deFields.coaReference || ''}
              onChange={(e) => setDeFields((p) => ({ ...p, coaReference: e.target.value }))}
              placeholder="z.B. COA-2607-001"
            />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" className="w-full sm:w-auto justify-center" onClick={onClose}>{t('admin.labels.cancel')}</Button>
          <Button type="submit" className="w-full sm:w-auto justify-center" loading={submitting}>{editing ? t('admin.labels.save') : t('admin.labels.create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

/*
function LabelPartStyleField({
  label,
  color,
  font,
  onColorChange,
  onFontChange,
}: {
  label: string;
  color: string;
  font: string;
  onColorChange: (value: string) => void;
  onFontChange: (value: string) => void;
}) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(color) ? color : '#008080';
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 items-end">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-9 w-10 rounded border border-line cursor-pointer p-0.5 bg-white shrink-0"
          aria-label={label}
        />
        <Input
          label={label}
          value={color}
          onChange={(e) => onColorChange(normalizeHexInput(e.target.value))}
          className="font-mono text-xs"
        />
      </div>
      <GoogleFontPicker value={font} onChange={onFontChange} />
    </div>
  );
}

function GoogleFontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!value || value.toLowerCase() === 'dejavu sans') return;
    const id = `gf-admin-label-preview-${value.toLowerCase().replace(/\s+/g, '-')}`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(value).replace(/%20/g, '+')}:wght@400;700&display=swap`;
  }, [value]);

  const fonts = useQuery({
    queryKey: ['admin', 'google-fonts', query],
    queryFn: () => adminService.listGoogleFonts(query),
    staleTime: 60_000,
    enabled: open,
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function selectFont(family: string) {
    onChange(family);
    setQuery(family);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        label={t('admin.labels.googleFontLabel')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const trimmed = query.trim();
            if (trimmed) selectFont(trimmed);
          }
        }}
        placeholder={t('admin.labels.googleFontPlaceholder')}
        style={{ fontFamily: value ? `'${value}', sans-serif` : undefined }}
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-md border border-line bg-white shadow-lg text-sm">
          {(fonts.data || []).map((family) => (
            <li key={family}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-surface text-ink ${family === value ? 'bg-primary/10 font-semibold' : ''}`}
                style={{ fontFamily: `'${family}', sans-serif` }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectFont(family)}
              >
                {family}
              </button>
            </li>
          ))}
          {fonts.isLoading && (
            <li className="px-3 py-2 text-ink-muted text-xs">{t('admin.labels.googleFontLoading')}</li>
          )}
          {!fonts.isLoading && !(fonts.data || []).length && (
            <li className="px-3 py-2 text-ink-muted text-xs">{t('admin.labels.googleFontEmpty')}</li>
          )}
        </ul>
      )}
    </div>
  );
}
*/

function LabelColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#008080';
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 items-end">
      <input
        type="color"
        value={pickerValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 rounded border border-line cursor-pointer p-0.5 bg-white shrink-0"
        aria-label={label}
      />
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(normalizeHexInput(e.target.value))}
        className="font-mono text-xs"
      />
    </div>
  );
}
