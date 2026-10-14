/**
 * Wipe label assets and regenerate:
 * - one stable PNG per LabelVariant (front+back on one physical label)
 * - one master PDF (all-labels.pdf) with every label as a page
 *
 * Run: npm run generate:labels
 */
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import {
  combineLabelPngsToPdf,
  ensureLabelOutputDir,
  makeStableLabelFileStem,
  renderCombinedLabelPng,
} from '../src/services/labelRenderService';
import { resolveQrUrl } from '../src/services/qrResolverService';
import {
  resolveLabelColors,
  resolveLabelFields,
  resolveLabelFonts,
} from '../src/services/labelVariantHelpers';

const ALL_LABELS_PDF = 'all-labels.pdf';

function makeBarcodeText(variant: { batchNumber: string | null; id: string }): string {
  const cleaned = (variant.batchNumber || '').replace(/[^A-Za-z0-9]/g, '');
  if (cleaned.length >= 6) return cleaned;
  return `GP${variant.id.slice(-10).toUpperCase()}`;
}

async function purgeLabelAssets(outputDir: string): Promise<number> {
  const deleted = await prisma.labelAsset.deleteMany();
  if (fs.existsSync(outputDir)) {
    const files = await fs.promises.readdir(outputDir);
    await Promise.all(
      files.map((file) => fs.promises.unlink(path.join(outputDir, file)).catch(() => undefined))
    );
  }
  return deleted.count;
}

async function main(): Promise<void> {
  const variants = await prisma.labelVariant.findMany({
    include: { product: { select: { name: true, slug: true, purity: true } } },
    orderBy: [{ product: { name: 'asc' } }, { dosage: 'asc' }],
  });

  if (!variants.length) {
    console.log('No label variants found.');
    return;
  }

  const outputDir = ensureLabelOutputDir(env.upload.dir);
  const removed = await purgeLabelAssets(outputDir);
  console.log(`Removed ${removed} label asset row(s) and cleared ${outputDir}`);

  const pdfPages: Array<{ buffer: Buffer; widthPx: number; heightPx: number }> = [];
  let generated = 0;

  for (const variant of variants) {
    const qrUrl = resolveQrUrl({
      qrMode: variant.qrMode,
      manualQrUrl: variant.manualQrUrl,
      csvQrUrl: variant.csvQrUrl,
      productSlug: variant.product.slug,
      clientUrl: env.clientUrl,
    });

    const lang = variant.languageDefault || 'nl';
    const fields = resolveLabelFields(variant, lang);
    const colors = resolveLabelColors(variant.colorOverrides);
    const fonts = resolveLabelFonts(variant.fontOverrides);

    const render = await renderCombinedLabelPng({
      productName: variant.product.name,
      productSlug: variant.product.slug,
      dosage: variant.dosage,
      purity: variant.product.purity,
      batchNumber: variant.batchNumber,
      storageUnopened: fields.storageUnopened,
      storageReconstituted: fields.storageReconstituted,
      storageNote: fields.storageNote,
      shelfLifeDate: fields.shelfLifeDate,
      qrUrl,
      barcodeText: makeBarcodeText(variant),
      imageFileName: variant.imageFileName,
      labelWidthMm: variant.labelWidthMm,
      labelHeightMm: variant.labelHeightMm,
      language: lang,
      colors,
      fonts,
    });

    const fileName = `${makeStableLabelFileStem(variant.product.slug, variant.dosage)}.png`;
    const filePath = path.join(outputDir, fileName);
    await fs.promises.writeFile(filePath, render.buffer);

    await prisma.labelAsset.create({
      data: {
        labelVariantId: variant.id,
        format: 'png',
        fileName,
        filePath,
        fileUrl: `/uploads/labels/${fileName}`,
        widthPx: render.widthPx,
        heightPx: render.heightPx,
      },
    });

    pdfPages.push(render);
    console.log(`[ok] ${variant.product.name} ${variant.dosage} → ${fileName}`);
    generated += 1;
  }

  const pdfBuffer = await combineLabelPngsToPdf(pdfPages);
  const pdfPath = path.join(outputDir, ALL_LABELS_PDF);
  await fs.promises.writeFile(pdfPath, pdfBuffer);

  console.log(`\nDone: ${generated} PNG(s) + ${ALL_LABELS_PDF} (${pdfPages.length} pages) in ${outputDir}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
