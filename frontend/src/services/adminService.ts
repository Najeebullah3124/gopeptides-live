import { api, unwrap } from './api';
import type { Product } from '@/types/product';
import type { Order, OrderStatus } from '@/types/order';
import type { PaginationMeta } from '@/types/api';

export interface AdminProductInput {
  name: string;
  slug: string;
  description: string;
  shortDesc: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  sku: string;
  purity: string;
  weight: string;
  casNumber: string;
  categoryId: string;
  badge?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sequence?: string | null;
  storage?: string | null;
  benefits?: string[];
  translations?: string;
  seoData?: Record<string, unknown>;
}

export const adminService = {
  // Orders
  listOrders(page = 1, status?: OrderStatus, search?: string): Promise<{ data: Order[]; meta: PaginationMeta }> {
    return api
      .get<{ data: Order[]; meta: PaginationMeta }>('/orders', {
        params: { page, limit: 20, status, search },
      })
      .then((r) => r.data);
  },
  updateOrderStatus(
    orderId: string,
    payload: { status: OrderStatus; trackingNumber?: string; courier?: string; paymentStatus?: string },
  ): Promise<Order> {
    return unwrap(api.put(`/orders/${orderId}/status`, payload));
  },
  printOrderLabel(orderId: string): Promise<{ success: boolean; message: string }> {
    return unwrap(api.post(`/orders/${orderId}/print-label`));
  },

  // Products
  createProduct(payload: AdminProductInput): Promise<Product> {
    return unwrap(api.post('/products', payload));
  },
  updateProduct(id: string, payload: Partial<AdminProductInput>): Promise<Product> {
    return unwrap(api.put(`/products/${id}`, payload));
  },
  uploadProductImages(id: string, files: File[]): Promise<unknown> {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    return api.post(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteProductImage(productId: string, imageId: string): Promise<unknown> {
    return api.delete(`/products/${productId}/images/${imageId}`);
  },
  reorderProductImages(productId: string, imageIds: string[]): Promise<unknown> {
    return api.put(`/products/${productId}/images/reorder`, { imageIds });
  },
  deleteProduct(id: string): Promise<unknown> {
    return api.delete(`/products/${id}`);
  },

  // Categories
  listCategories(lang?: string): Promise<AdminCategory[]> {
    return unwrap(api.get('/products/categories', { params: lang ? { lang } : {} }));
  },
  createCategory(payload: CategoryInput): Promise<AdminCategory> {
    return unwrap(api.post('/products/admin/categories', payload));
  },
  updateCategory(id: string, payload: CategoryInput): Promise<AdminCategory> {
    return unwrap(api.put(`/products/admin/categories/${id}`, payload));
  },
  deleteCategory(id: string): Promise<unknown> {
    return api.delete(`/products/admin/categories/${id}`);
  },

  // Label generator
  listLabelVariants(search = ''): Promise<LabelVariant[]> {
    return unwrap(api.get('/admin/labels/variants', { params: search ? { search } : {} }));
  },
  createLabelVariant(payload: LabelVariantCreateInput): Promise<LabelVariant> {
    return unwrap(api.post('/admin/labels/variants', payload));
  },
  updateLabelVariant(id: string, payload: Partial<LabelVariantUpdateInput>): Promise<LabelVariant> {
    return unwrap(api.patch(`/admin/labels/variants/${id}`, payload));
  },
  deleteLabelVariant(id: string): Promise<{ id: string }> {
    return unwrap(api.delete(`/admin/labels/variants/${id}`));
  },
  importLabelQrCsv(csvText: string): Promise<{ updated: number; skipped: string[] }> {
    return unwrap(api.post('/admin/labels/qr-import', { csvText }));
  },
  generateLabelAssets(payload: LabelGenerateInput): Promise<LabelGenerateResult[]> {
    return unwrap(api.post('/admin/labels/generate', payload));
  },
  downloadLabelAsset(assetId: string): Promise<Blob> {
    return api
      .get(`/admin/labels/assets/${assetId}/download`, { responseType: 'blob' })
      .then((res) => res.data);
  },
  deleteLabelAsset(assetId: string): Promise<{ id: string }> {
    return unwrap(api.delete(`/admin/labels/assets/${assetId}`));
  },
  clearLabelVariantAssets(variantId: string): Promise<{ cleared: number }> {
    return unwrap(api.delete(`/admin/labels/variants/${variantId}/assets`));
  },
  printLabel(payload: LabelPrintInput): Promise<{ message: string; copies: number }> {
    return unwrap(api.post('/admin/labels/print', payload));
  },
  listGoogleFonts(search = '', limit = 40): Promise<string[]> {
    return unwrap(api.get('/admin/labels/google-fonts', { params: { search, limit } }));
  },
  previewLabelVariant(payload: {
    variantId: string;
    language?: 'nl' | 'en' | 'de';
    colorOverrides?: LabelColorOverrides;
    fontOverrides?: LabelFontOverrides;
    includeProductLink?: boolean;
    layout?: 'standard' | 'centered' | 'tiff';
    fullBackground?: boolean;
    useRainbowBackground?: boolean;
  }): Promise<Blob> {
    return api
      .post('/admin/labels/preview', payload, { responseType: 'blob', validateStatus: () => true })
      .then(async (res) => {
        const blob = res.data as Blob;
        if (res.status >= 400 || !blob.type.startsWith('image/')) {
          const text = await blob.text();
          let message = `Preview failed (${res.status})`;
          try {
            const json = JSON.parse(text) as { message?: string };
            if (json.message) message = json.message;
          } catch {
            if (text.trim()) message = text.trim();
          }
          throw new Error(message);
        }
        return blob;
      });
  },
};

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  translations?: string | object;
  seoData?: Record<string, unknown>;
}

export interface AdminCategory extends Omit<CategoryInput, 'seoData'> {
  id: string;
  translations?: string;
  seoData?: string;
  _count?: {
    products: number;
  };
}

export interface LabelAsset {
  id: string;
  labelVariantId: string;
  format: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  widthPx: number;
  heightPx: number;
  generatedAt: string;
}

export interface LabelLangFields {
  storageUnopened?: string;
  storageReconstituted?: string;
  storageNote?: string;
  shelfLifeDate?: string;
  coaReference?: string;
}

export interface LabelColorOverrides {
  frontProductName?: string;
  frontDosage?: string;
  frontDivider?: string;
  frontBadgeFill?: string;
  frontBadgeStroke?: string;
  frontDisclaimer?: string;
  backHeaderPrefix?: string;
  backHeaderNameDosage?: string;
  backHeaderAccent?: string;
  backFieldLabels?: string;
  backFieldValues?: string;
}

export const DEFAULT_LABEL_COLORS: Required<LabelColorOverrides> = {
  frontProductName: '#008080',
  frontDosage: '#ffffff',
  frontDivider: '#008080',
  frontBadgeFill: '#008080',
  frontBadgeStroke: '#008080',
  frontDisclaimer: '#0b5566',
  backHeaderPrefix: '#334155',
  backHeaderNameDosage: '#008080',
  backHeaderAccent: '#008080',
  backFieldLabels: '#008080',
  backFieldValues: '#1e293b',
};

export type ResolvedLabelColors = Required<LabelColorOverrides>;

export interface LabelFontOverrides {
  frontProductName?: string;
  frontDosage?: string;
  frontDisclaimer?: string;
  backHeaderPrefix?: string;
  backHeaderNameDosage?: string;
  backFieldLabels?: string;
  backFieldValues?: string;
}

export const DEFAULT_LABEL_FONT = 'Montserrat';

export const DEFAULT_LABEL_FONTS: Required<LabelFontOverrides> = {
  frontProductName: DEFAULT_LABEL_FONT,
  frontDosage: DEFAULT_LABEL_FONT,
  frontDisclaimer: DEFAULT_LABEL_FONT,
  backHeaderPrefix: DEFAULT_LABEL_FONT,
  backHeaderNameDosage: DEFAULT_LABEL_FONT,
  backFieldLabels: DEFAULT_LABEL_FONT,
  backFieldValues: DEFAULT_LABEL_FONT,
};

export type ResolvedLabelFonts = Required<LabelFontOverrides>;

export interface LabelVariant {
  id: string;
  productId: string;
  dosage: string;
  batchNumber: string | null;
  storageUnopened: string | null;
  storageReconstituted: string | null;
  storageNote: string | null;
  shelfLifeDate: string | null;
  languageDefault: string;
  labelWidthMm: number;
  labelHeightMm: number;
  qrMode: 'auto' | 'manual' | 'csv' | 'none';
  manualQrUrl: string | null;
  csvQrUrl: string | null;
  imageFileName: string | null;
  translations?: Record<string, LabelLangFields>;
  colorOverrides?: LabelColorOverrides;
  fontOverrides?: LabelFontOverrides;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    purity: string;
    weight: string;
    images: Array<{ url: string }>;
  };
  assets: LabelAsset[];
}

export interface LabelVariantCreateInput {
  productId: string;
  dosage?: string;
  batchNumber?: string;
  storageUnopened?: string;
  storageReconstituted?: string;
  storageNote?: string;
  shelfLifeDate?: string;
  languageDefault?: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
  qrMode?: 'auto' | 'manual' | 'csv' | 'none';
  manualQrUrl?: string;
  csvQrUrl?: string;
  imageFileName?: string;
  translations?: Record<string, LabelLangFields>;
  colorOverrides?: LabelColorOverrides;
  fontOverrides?: LabelFontOverrides;
}

export interface LabelVariantUpdateInput {
  dosage?: string;
  batchNumber?: string;
  storageUnopened?: string;
  storageReconstituted?: string;
  storageNote?: string;
  shelfLifeDate?: string;
  languageDefault?: string;
  labelWidthMm?: number;
  labelHeightMm?: number;
  qrMode?: 'auto' | 'manual' | 'csv' | 'none';
  manualQrUrl?: string;
  csvQrUrl?: string;
  imageFileName?: string;
  translations?: Record<string, LabelLangFields>;
  colorOverrides?: LabelColorOverrides;
  fontOverrides?: LabelFontOverrides;
}

export interface LabelGenerateInput {
  variantIds: string[];
  formats?: Array<'png' | 'pdf'>;
  language?: 'nl' | 'en' | 'de';
  includeProductLink?: boolean;
  layout?: 'standard' | 'centered' | 'tiff';
  fullBackground?: boolean;
  useRainbowBackground?: boolean;
}

export interface LabelGenerateResult {
  variantId: string;
  product: string;
  dosage: string;
  qrUrl: string;
  assets: LabelAsset[];
}

export interface LabelPrintInput {
  variantId: string;
  copies: number;
  printerTarget?: string;
  printerProfile?: string;
  language?: 'nl' | 'en' | 'de';
  includeProductLink?: boolean;
}
