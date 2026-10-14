import path from 'path';
import fs from 'fs';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ApiError, created, ok } from '../utils/apiResponse';
import {
  convertPngToPdf,
  ensureLabelOutputDir,
  makeStableLabelFileStem,
  renderCombinedLabelPng,
  renderCenteredLabelPng,
  renderTiffLabelPng,
} from '../services/labelRenderService';
import { listGoogleFontFamilies } from '../services/googleFontService';
import { resolveQrUrl } from '../services/qrResolverService';
import { printPdfDocument } from '../services/printService';
import {
  deleteLabelVariantAssets,
  deriveDosageFromProduct,
  getLabelDimensions,
  makePlaceholderBatch,
  parseLabelTranslations,
  resolveLabelFields,
  parseLabelColorOverrides,
  resolveLabelColors,
  stringifyLabelColorOverrides,
  parseLabelFontOverrides,
  resolveLabelFonts,
  stringifyLabelFontOverrides,
  stringifyLabelTranslations,
} from '../services/labelVariantHelpers';

type LabelFormat = 'png' | 'pdf';
type LabelLayout = 'standard' | 'centered' | 'tiff';

const LABEL_VARIANT_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      purity: true,
      weight: true,
      images: {
        orderBy: { position: 'asc' as const },
        select: { url: true },
      },
    },
  },
  assets: {
    orderBy: { generatedAt: 'desc' as const },
    take: 8,
  },
} as const;

function parseFormats(input: unknown): LabelFormat[] {
  if (!Array.isArray(input)) return ['png', 'pdf'];
  const formats = input
    .map((x) => String(x).toLowerCase())
    .filter((x): x is LabelFormat => x === 'png' || x === 'pdf');
  return formats.length ? formats : ['png', 'pdf'];
}

function parseLayout(input: unknown): LabelLayout {
  if (input === 'centered') return 'centered';
  if (input === 'tiff') return 'tiff';
  return 'standard';
}

async function renderLabel(
  payload: Parameters<typeof renderCombinedLabelPng>[0],
  layout: LabelLayout
) {
  if (layout === 'centered') return renderCenteredLabelPng(payload);
  if (layout === 'tiff') return renderTiffLabelPng(payload);
  return renderCombinedLabelPng(payload);
}

function normalizeProductName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .replace(/blend/g, '')
    .replace(/wolverine/g, '')
    .replace(/\+/g, '+');
}

function normalizeDosage(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/mg/g, 'mg');
}

function makeBarcodeText(variant: { batchNumber: string | null; id: string }): string {
  const cleaned = (variant.batchNumber || '').replace(/[^A-Za-z0-9]/g, '');
  if (cleaned.length >= 6) return cleaned;
  return `GP${variant.id.slice(-10).toUpperCase()}`;
}

function parseCsvRows(csvText: string): Array<{ product?: string; dosage?: string; slug?: string; url: string }> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const rows: Array<{ product?: string; dosage?: string; slug?: string; url: string }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const cols = line.split(',').map((col) => col.trim());
    if (cols.length < 2) continue;

    // Header row
    if (i === 0 && /product|slug|dosage|url/i.test(line)) continue;

    if (cols.length >= 4) {
      rows.push({ product: cols[0], dosage: cols[1], slug: cols[2], url: cols[3] });
      continue;
    }
    if (cols.length === 3) {
      rows.push({ product: cols[0], dosage: cols[1], url: cols[2] });
      continue;
    }
    rows.push({ slug: cols[0], url: cols[1] });
  }
  return rows;
}

function toPublicUrl(fileName: string): string {
  return `/uploads/labels/${fileName}`;
}

function toAbsoluteUploadPath(fileName: string): string {
  return path.resolve(env.upload.dir, 'labels', fileName);
}

export async function listLabelVariants(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = String(req.query.search || '').trim();
    const where = search
      ? {
          OR: [
            { dosage: { contains: search } },
            { batchNumber: { contains: search } },
            { product: { name: { contains: search } } },
            { product: { slug: { contains: search } } },
          ],
        }
      : undefined;

    const items = await prisma.labelVariant.findMany({
      where,
      include: LABEL_VARIANT_INCLUDE,
      orderBy: [{ product: { name: 'asc' } }, { dosage: 'asc' }],
    });

    ok(res, items.map(serializeLabelVariant));
  } catch (err) {
    next(err);
  }
}

export async function listGoogleFonts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = String(req.query.search || '').trim();
    const limit = Math.min(80, Math.max(1, Number(req.query.limit) || 40));
    const families = await listGoogleFontFamilies(search, limit);
    ok(res, families);
  } catch (err) {
    next(err);
  }
}

export async function previewLabelVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      variantId,
      language,
      colorOverrides,
      fontOverrides,
      includeProductLink,
      layout,
      fullBackground,
      useRainbowBackground,
    } = req.body as {
      variantId?: string;
      fullBackground?: boolean;
      useRainbowBackground?: boolean;
      language?: string;
      colorOverrides?: Record<string, string>;
      fontOverrides?: Record<string, string>;
      includeProductLink?: boolean;
      layout?: string;
    };

    if (!variantId) throw ApiError.badRequest('variantId is required');

    const variant = await prisma.labelVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, name: true, slug: true, purity: true } } },
    });
    if (!variant) throw ApiError.notFound('Label variant not found');

    const lang = (language || variant.languageDefault || 'nl').toLowerCase();
    const fields = resolveLabelFields(variant, lang);
    const qrUrl = resolveVariantQrUrl(variant, variant.product.slug, includeProductLink !== false);

    // Admin live preview only needs screen resolution, not print quality —
    // rendering at full 1200 DPI on every color/text tweak is what made the
    // preview take 10-15s to refresh. 300 DPI is still crisp on screen and
    // renders in a fraction of the time; actual generate/print calls don't
    // set previewDpi, so they stay at full resolution.
    const render = await renderLabel(
      buildRenderPayload(variant, variant.product, fields, qrUrl, lang, {
        colorOverrides,
        fontOverrides,
        fullBackground,
        useRainbowBackground,
        previewDpi: 300,
      }),
      parseLayout(layout)
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(render.buffer);
  } catch (err) {
    next(err);
  }
}

export async function updateLabelVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.labelVariant.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Label variant not found');

    const {
      dosage,
      batchNumber,
      storageUnopened,
      storageReconstituted,
      storageNote,
      shelfLifeDate,
      languageDefault,
      labelWidthMm,
      labelHeightMm,
      qrMode,
      manualQrUrl,
      csvQrUrl,
      imageFileName,
      translations,
      colorOverrides,
      fontOverrides,
    } = req.body as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (dosage !== undefined) data.dosage = String(dosage);
    if (batchNumber !== undefined) data.batchNumber = batchNumber ? String(batchNumber) : null;
    if (storageUnopened !== undefined) data.storageUnopened = storageUnopened ? String(storageUnopened) : null;
    if (storageReconstituted !== undefined) data.storageReconstituted = storageReconstituted ? String(storageReconstituted) : null;
    if (storageNote !== undefined) data.storageNote = storageNote ? String(storageNote) : null;
    if (shelfLifeDate !== undefined) data.shelfLifeDate = shelfLifeDate ? String(shelfLifeDate) : null;
    if (languageDefault !== undefined) data.languageDefault = String(languageDefault || 'nl');
    if (labelWidthMm !== undefined) data.labelWidthMm = Number(labelWidthMm);
    if (labelHeightMm !== undefined) data.labelHeightMm = Number(labelHeightMm);
    if (qrMode !== undefined) data.qrMode = String(qrMode || 'auto');
    if (manualQrUrl !== undefined) data.manualQrUrl = manualQrUrl ? String(manualQrUrl) : null;
    if (csvQrUrl !== undefined) data.csvQrUrl = csvQrUrl ? String(csvQrUrl) : null;
    if (imageFileName !== undefined) data.imageFileName = imageFileName ? String(imageFileName) : null;
    if (translations !== undefined) data.translations = stringifyLabelTranslations(translations);
    if (colorOverrides !== undefined) {
      data.colorOverrides = stringifyLabelColorOverrides(colorOverrides);
    }
    if (fontOverrides !== undefined) {
      data.fontOverrides = stringifyLabelFontOverrides(fontOverrides);
    }

    const item = await prisma.labelVariant.update({
      where: { id },
      data,
      include: LABEL_VARIANT_INCLUDE,
    });
    ok(res, serializeLabelVariant(item), 'Label variant updated');
  } catch (err) {
    next(err);
  }
}

export async function createLabelVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      productId,
      dosage,
      batchNumber,
      storageUnopened,
      storageReconstituted,
      storageNote,
      shelfLifeDate,
      languageDefault,
      labelWidthMm,
      labelHeightMm,
      qrMode,
      manualQrUrl,
      csvQrUrl,
      imageFileName,
      translations,
      colorOverrides,
      fontOverrides,
    } = req.body as Record<string, unknown>;

    if (!productId) throw ApiError.badRequest('productId is required');

    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product) throw ApiError.notFound('Product not found');

    const resolvedDosage = dosage ? String(dosage) : deriveDosageFromProduct(product.weight, product.name);
    const dims = getLabelDimensions(product.name);

    const item = await prisma.labelVariant.create({
      data: {
        productId: product.id,
        dosage: resolvedDosage,
        batchNumber: batchNumber ? String(batchNumber) : makePlaceholderBatch(),
        storageUnopened: storageUnopened ? String(storageUnopened) : null,
        storageReconstituted: storageReconstituted ? String(storageReconstituted) : null,
        storageNote: storageNote ? String(storageNote) : null,
        shelfLifeDate: shelfLifeDate ? String(shelfLifeDate) : null,
        languageDefault: String(languageDefault || 'nl'),
        labelWidthMm: labelWidthMm !== undefined ? Number(labelWidthMm) : dims.width,
        labelHeightMm: labelHeightMm !== undefined ? Number(labelHeightMm) : dims.height,
        qrMode: String(qrMode || 'auto'),
        manualQrUrl: manualQrUrl ? String(manualQrUrl) : null,
        csvQrUrl: csvQrUrl ? String(csvQrUrl) : null,
        imageFileName: imageFileName ? String(imageFileName) : null,
        translations: stringifyLabelTranslations(translations),
        colorOverrides: stringifyLabelColorOverrides(colorOverrides),
        fontOverrides: stringifyLabelFontOverrides(fontOverrides),
      },
      include: LABEL_VARIANT_INCLUDE,
    });

    created(res, serializeLabelVariant(item), 'Label variant created');
  } catch (err) {
    next(err);
  }
}

export async function deleteLabelVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const variant = await prisma.labelVariant.findUnique({ where: { id } });
    if (!variant) throw ApiError.notFound('Label variant not found');

    await deleteLabelVariantAssets(id);
    await prisma.labelPrintLog.deleteMany({ where: { labelVariantId: id } });
    await prisma.labelVariant.delete({ where: { id } });

    ok(res, { id }, 'Label variant deleted');
  } catch (err) {
    next(err);
  }
}

function serializeLabelVariant<T extends { translations?: string | null; colorOverrides?: string | null; fontOverrides?: string | null }>(item: T) {
  return {
    ...item,
    translations: parseLabelTranslations(item.translations),
    colorOverrides: parseLabelColorOverrides(item.colorOverrides),
    fontOverrides: parseLabelFontOverrides(item.fontOverrides),
  };
}

function resolveVariantQrUrl(
  variant: {
    qrMode: string;
    manualQrUrl: string | null;
    csvQrUrl: string | null;
  },
  productSlug: string,
  includeProductLink = true
): string {
  if (!includeProductLink) return '';
  return resolveQrUrl({
    qrMode: variant.qrMode,
    manualQrUrl: variant.manualQrUrl,
    csvQrUrl: variant.csvQrUrl,
    productSlug,
    clientUrl: env.clientUrl,
  });
}
function buildRenderPayload(
  variant: {
    dosage: string;
    batchNumber: string | null;
    imageFileName: string | null;
    labelWidthMm: number;
    labelHeightMm: number;
    colorOverrides?: string | null;
    fontOverrides?: string | null;
    id: string;
  },
  product: { name: string; slug: string; purity: string | null },
  fields: ReturnType<typeof resolveLabelFields>,
  qrUrl: string,
  language: string,
  draft?: {
    colorOverrides?: Record<string, string>;
    fontOverrides?: Record<string, string>;
    fullBackground?: boolean;
    useRainbowBackground?: boolean;
    previewDpi?: number;
  }
) {
  const colorRaw = draft?.colorOverrides
    ? JSON.stringify(draft.colorOverrides)
    : variant.colorOverrides;
  const fontRaw = draft?.fontOverrides
    ? JSON.stringify(draft.fontOverrides)
    : variant.fontOverrides;

  return {
    productName: product.name,
    productSlug: product.slug,
    dosage: variant.dosage,
    purity: product.purity,
    batchNumber: variant.batchNumber,
    storageUnopened: fields.storageUnopened,
    storageReconstituted: fields.storageReconstituted,
    storageNote: fields.storageNote,
    shelfLifeDate: fields.shelfLifeDate,
    coaReference: fields.coaReference,
    qrUrl,
    barcodeText: makeBarcodeText(variant),
    imageFileName: variant.imageFileName,
    labelWidthMm: variant.labelWidthMm,
    labelHeightMm: variant.labelHeightMm,
    language,
    colors: resolveLabelColors(colorRaw),
    fonts: resolveLabelFonts(fontRaw),
    fullBackground: draft?.fullBackground,
    useRainbowBackground: draft?.useRainbowBackground,
    previewDpi: draft?.previewDpi,
  };
}

export async function importLabelQrCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csvText = String(req.body.csvText || '');
    if (!csvText.trim()) throw ApiError.badRequest('csvText is required');

    const rows = parseCsvRows(csvText);
    let updated = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const url = row.url?.trim();
      if (!url) continue;

      let match =
        row.slug &&
        (await prisma.labelVariant.findFirst({
          where: { product: { slug: row.slug.trim() } },
          include: { product: { select: { slug: true } } },
        }));

      if (!match && row.product && row.dosage) {
        const candidates = await prisma.labelVariant.findMany({
          where: {
            product: { name: { contains: row.product.trim() } },
          },
          include: { product: { select: { name: true, slug: true } } },
        });
        match = candidates.find(
          (candidate) =>
            normalizeProductName(candidate.product.name) === normalizeProductName(row.product || '') &&
            normalizeDosage(candidate.dosage) === normalizeDosage(row.dosage || '')
        ) as typeof match;
      }

      if (!match) {
        skipped.push(`${row.product || row.slug || 'unknown'} (${row.dosage || 'n/a'})`);
        continue;
      }

      await prisma.labelVariant.update({
        where: { id: match.id },
        data: { csvQrUrl: url, qrMode: 'csv' },
      });
      updated += 1;
    }

    ok(
      res,
      { updated, skipped },
      `CSV QR mapping imported. Updated ${updated} row(s).`
    );
  } catch (err) {
    next(err);
  }
}

export async function generateLabelAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { variantIds, formats: formatInput, language, includeProductLink, layout: layoutInput, fullBackground, useRainbowBackground } = req.body as {
      variantIds?: string[];
      formats?: string[];
      language?: string;
      includeProductLink?: boolean;
      layout?: string;
      fullBackground?: boolean;
      useRainbowBackground?: boolean;
    };
    const formats = parseFormats(formatInput);
    const lang = (language || '').trim().toLowerCase();
    const withProductLink = includeProductLink !== false;
    const layout = parseLayout(layoutInput);

    const variants = await prisma.labelVariant.findMany({
      where: variantIds?.length ? { id: { in: variantIds } } : undefined,
      include: { product: { select: { id: true, name: true, slug: true, purity: true } } },
      orderBy: [{ product: { name: 'asc' } }, { dosage: 'asc' }],
    });

    if (!variants.length) throw ApiError.badRequest('No label variants found to generate');

    const outputDir = ensureLabelOutputDir(env.upload.dir);
    const generated: Array<Record<string, unknown>> = [];

    for (const variant of variants) {
      const qrUrl = resolveVariantQrUrl(variant, variant.product.slug, withProductLink);

      const outputLang = lang || variant.languageDefault || 'nl';
      const fields = resolveLabelFields(variant, outputLang);

      const render = await renderLabel(
        { ...buildRenderPayload(variant, variant.product, fields, qrUrl, outputLang), fullBackground, useRainbowBackground },
        layout
      );

      const stem = makeStableLabelFileStem(variant.product.slug, variant.dosage);
      const fileStem =
        layout === 'centered' ? `${stem}-centered`
        : layout === 'tiff' ? `${stem}-tiff`
        : stem;
      const previous = await prisma.labelAsset.findMany({
        where: { labelVariantId: variant.id, fileName: { startsWith: `${fileStem}.` } },
      });
      await Promise.all(previous.map(async (asset) => {
        const filePath = toAbsoluteUploadPath(asset.fileName);
        if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
      }));
      if (previous.length) await prisma.labelAsset.deleteMany({ where: { id: { in: previous.map((asset) => asset.id) } } });
      const createdAssets: Array<Record<string, unknown>> = [];

      if (formats.includes('png')) {
        const fileName = `${fileStem}.png`;
        const filePath = path.join(outputDir, fileName);
        await fs.promises.writeFile(filePath, render.buffer);
        const record = await prisma.labelAsset.create({
          data: {
            labelVariantId: variant.id,
            format: 'png',
            fileName,
            filePath,
            fileUrl: toPublicUrl(fileName),
            widthPx: render.widthPx,
            heightPx: render.heightPx,
          },
        });
        createdAssets.push(record);
      }

      if (formats.includes('pdf')) {
        const fileName = `${fileStem}.pdf`;
        const filePath = path.join(outputDir, fileName);
        const pdfBuffer = await convertPngToPdf(render.buffer, render.widthPx, render.heightPx, (render as { dpi?: number }).dpi);
        await fs.promises.writeFile(filePath, pdfBuffer);
        const record = await prisma.labelAsset.create({
          data: {
            labelVariantId: variant.id,
            format: 'pdf',
            fileName,
            filePath,
            fileUrl: toPublicUrl(fileName),
            widthPx: render.widthPx,
            heightPx: render.heightPx,
          },
        });
        createdAssets.push(record);
      }

      generated.push({
        variantId: variant.id,
        product: variant.product.name,
        dosage: variant.dosage,
        qrUrl,
        assets: createdAssets,
      });
    }

    ok(res, generated, `Generated labels for ${generated.length} variant(s)`);
  } catch (err) {
    next(err);
  }
}

export async function downloadLabelAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const asset = await prisma.labelAsset.findUnique({ where: { id } });
    if (!asset) throw ApiError.notFound('Label asset not found');

    const absolutePath = toAbsoluteUploadPath(asset.fileName);
    if (!fs.existsSync(absolutePath)) throw ApiError.notFound('Generated file not found on disk');

    res.download(absolutePath, asset.fileName);
  } catch (err) {
    next(err);
  }
}

export async function deleteLabelAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const asset = await prisma.labelAsset.findUnique({ where: { id } });
    if (!asset) throw ApiError.notFound('Label asset not found');

    const absolutePath = toAbsoluteUploadPath(asset.fileName);
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }

    await prisma.labelAsset.delete({ where: { id } });
    ok(res, { id }, 'Label asset deleted');
  } catch (err) {
    next(err);
  }
}

export async function clearLabelVariantAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const variant = await prisma.labelVariant.findUnique({ where: { id } });
    if (!variant) throw ApiError.notFound('Label variant not found');

    const assets = await prisma.labelAsset.findMany({ where: { labelVariantId: id } });
    for (const asset of assets) {
      const absolutePath = toAbsoluteUploadPath(asset.fileName);
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
      }
    }

    await prisma.labelAsset.deleteMany({ where: { labelVariantId: id } });
    ok(res, { cleared: assets.length }, 'All assets removed for variant');
  } catch (err) {
    next(err);
  }
}

export async function printLabelVariant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { variantId, copies, printerTarget, printerProfile, language, includeProductLink } = req.body as {
      variantId?: string;
      copies?: number;
      printerTarget?: string;
      printerProfile?: string;
      language?: string;
      includeProductLink?: boolean;
    };
    if (!variantId) throw ApiError.badRequest('variantId is required');

    const variant = await prisma.labelVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { name: true, slug: true, purity: true } } },
    });
    if (!variant) throw ApiError.notFound('Label variant not found');

    const qrUrl = resolveVariantQrUrl(variant, variant.product.slug, includeProductLink !== false);

    const outputLang = (language || variant.languageDefault || 'nl').toLowerCase();
    const fields = resolveLabelFields(variant, outputLang);

    const render = await renderCombinedLabelPng(
      buildRenderPayload(variant, variant.product, fields, qrUrl, outputLang)
    );

    const pdfBuffer = await convertPngToPdf(render.buffer, render.widthPx, render.heightPx);
    const jobs = Math.max(1, Number(copies) || 1);
    let lastMessage = '';

    for (let i = 0; i < jobs; i += 1) {
      const printRes = await printPdfDocument(
        pdfBuffer,
        `${variant.product.name} ${variant.dosage} Label`,
        'GoPeptides Label Generator',
        printerTarget
      );
      if (!printRes.success) throw ApiError.badRequest(printRes.message);
      lastMessage = printRes.message;
    }

    await prisma.labelPrintLog.create({
      data: {
        labelVariantId: variant.id,
        printedByUserId: (req as Request & { user?: { id?: string } }).user?.id || null,
        printerTarget: printerTarget || null,
        printerProfile: printerProfile || `${variant.labelWidthMm}x${variant.labelHeightMm}`,
        copies: jobs,
        status: 'success',
        message: lastMessage || 'Printed',
      },
    });

    ok(res, { message: lastMessage, copies: jobs }, 'Sticker label sent to printer');
  } catch (err) {
    next(err);
  }
}

