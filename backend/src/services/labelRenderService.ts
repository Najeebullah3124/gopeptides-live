import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { PDFDocument } from 'pdf-lib';
import type { ResolvedLabelColors, ResolvedLabelFonts } from './labelVariantHelpers';
import { DEFAULT_LABEL_COLORS, DEFAULT_LABEL_FONTS } from './labelVariantHelpers';
import { prepareLabelFontContext, type LabelFontContext } from './labelFontEmbed';

export const LABEL_DPI = 1200;
/**
 * TIFF/rainbow labels render at 1200 DPI for print. The source TIFF background
 * (1774x887px) is slightly upscaled (~6%) to cover a 40mm label at this DPI;
 * the text/QR/barcode elements are all vector-rendered so they stay crisp
 * regardless.
 */
export const TIFF_LABEL_DPI = 1200;

export interface LabelRenderPayload {
  fullBackground?: boolean;
  /** TIFF/rainbow layout only: when false, falls back to the plain generated background. Defaults to true. */
  useRainbowBackground?: boolean;
  /**
   * Render the TIFF layout at this DPI instead of TIFF_LABEL_DPI. Used for the
   * admin live preview so color/text tweaks render in ~1s instead of the full
   * 1200 DPI print pass; final generate/print calls omit this and stay at
   * full resolution.
   */
  previewDpi?: number;
  productName: string;
  productSlug: string;
  dosage: string;
  purity?: string | null;
  batchNumber?: string | null;
  storageUnopened?: string | null;
  storageReconstituted?: string | null;
  storageNote?: string | null;
  shelfLifeDate?: string | null;
  coaReference?: string | null;
  qrUrl: string;
  barcodeText: string;
  imageFileName?: string | null;
  labelWidthMm: number;
  labelHeightMm: number;
  language: string;
  colors?: ResolvedLabelColors;
  fonts?: ResolvedLabelFonts;
}

function resolveColors(payload: LabelRenderPayload): ResolvedLabelColors {
  return payload.colors || DEFAULT_LABEL_COLORS;
}

function resolveFonts(payload: LabelRenderPayload): ResolvedLabelFonts {
  return payload.fonts || DEFAULT_LABEL_FONTS;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Back-side typography: ensure a space after ":" "," and "." (not before). */
function formatBackSideText(text: string): string {
  return text
    .replace(/,(?!\s)/g, ', ')
    .replace(/\.(?!\s)/g, '. ')
    .replace(/:(?!\s)/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatBackSideLabel(label: string): string {
  return label;
}

function formatBackSideValue(value: string): string {
  return formatBackSideText(value || '-');
}

/** Visual width for badge sizing when number and "mg" use a tight gap. */
function estimateBadgeTextUnits(dosage: string): number {
  const normalized = dosage.trim().replace(/\s+/g, ' ');
  const mgMatch = normalized.match(/^(.+?)\s+mg$/i);
  if (mgMatch) return mgMatch[1].length + 2.3;
  return normalized.length;
}

/** Render dose with minimal space before the mg unit. */
function buildBadgeDoseMarkup(dosage: string, unitGap: number): string {
  const normalized = dosage.trim().replace(/\s+/g, ' ');
  const mgMatch = normalized.match(/^(.+?)\s+mg$/i);
  if (mgMatch) {
    return `<tspan>${escapeXml(mgMatch[1])}</tspan><tspan dx="${unitGap}">mg</tspan>`;
  }
  return escapeXml(normalized);
}

function toInt(value: number): number {
  return Math.max(1, Math.round(value));
}

export function mmToPx(mm: number, dpi = LABEL_DPI): number {
  return toInt((mm / 25.4) * dpi);
}

export function sidePixelSize(widthMm: number, heightMm: number): { widthPx: number; heightPx: number } {
  return { widthPx: mmToPx(widthMm), heightPx: mmToPx(heightMm) };
}

function getLanguageLabels(language: string): { batch: string; unopened: string; reconst: string; note: string; shelf: string; storage: string; purity: string } {
  const lang = language.toLowerCase();
  if (lang === 'en') {
    return {
      batch: 'Batch',
      unopened: 'Lyophilized (unopened)',
      reconst: 'After reconstitution',
      note: 'Note',
      shelf: 'Shelf life',
      storage: 'Storage',
      purity: 'Purity',
    };
  }
  if (lang === 'de') {
    return {
      batch: 'Charge',
      unopened: 'Lyophilisat (ungeoeffnet)',
      reconst: 'Nach Rekonstitution',
      note: 'Hinweis',
      shelf: 'Haltbar bis',
      storage: 'Lagerung',
      purity: 'Reinheit',
    };
  }
  return {
    batch: 'Batchnummer',
    unopened: 'Lyofilisaat (ongeopend)',
    reconst: 'Na reconstitutie',
    note: 'Bijzonderheid',
    shelf: 'Houdbaarheidsdatum',
    storage: 'Opslag',
    purity: 'Zuiverheid',
  };
}

function resolveBackendRoot(): string {
  // dist/services/*.js -> backend root (works in dev via tsx and in prod via node dist/)
  return path.resolve(__dirname, '..', '..');
}

function resolveLogoPath(): string | null {
  const backendRoot = resolveBackendRoot();
  const htmlRoot = path.resolve(backendRoot, '..');
  const candidates = [
    path.join(backendRoot, 'assets', 'logo.jpeg'),
    path.join(htmlRoot, 'frontend-build', 'public', 'logo.jpeg'),
    path.join(htmlRoot, 'frontend', 'logo.jpeg'),
    '/var/www/html/frontend/logo.jpeg',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

interface LoadedLogo {
  dataUri: string;
  width: number;
  height: number;
}

/** Remove the logo JPEG's white box so it blends with the label gradient. */
async function knockOutLogoBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data;
  const channels = info.channels;

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const saturation = max - min;

    let alpha = 255;
    if (min >= 250 && saturation <= 10) {
      alpha = 0;
    } else if (min >= 225 && saturation <= 32) {
      const t = (min - 225) / (250 - 225);
      alpha = Math.round((1 - t) * 255);
    }

    pixels[i + 3] = Math.max(0, Math.min(255, alpha));
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 2 })
    .png()
    .toBuffer();
}

// Background knockout + resize is the same for every render — every preview
// keystroke was redoing this pixel-by-pixel pass from scratch, so cache it.
let cachedLogo: LoadedLogo | null | undefined;

async function loadLogoBase64(): Promise<LoadedLogo | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  const logoPath = resolveLogoPath();
  if (!logoPath) return (cachedLogo = null);
  try {
    const source = await fs.promises.readFile(logoPath);
    const transparent = await knockOutLogoBackground(source);
    const trimmed = await sharp(transparent)
      .resize({ width: 800, withoutEnlargement: false })
      .png()
      .toBuffer();
    const meta = await sharp(trimmed).metadata();
    return (cachedLogo = {
      dataUri: `data:image/png;base64,${trimmed.toString('base64')}`,
      width: meta.width || 800,
      height: meta.height || 240,
    });
  } catch {
    return (cachedLogo = null);
  }
}

function resolveFrontBackgroundPath(): string {
  return path.join(resolveBackendRoot(), 'assets', 'label-front-background.png');
}

function resolveBottomPatternPath(): string {
  return path.join(resolveBackendRoot(), 'assets', 'label-bottom-pattern.png');
}

function resolveTiffBackgroundPath(): string {
  return path.join(resolveBackendRoot(), 'assets', 'label-tiff-background.tiff');
}

let cachedTiffBackgroundBuffer: Buffer | null | undefined;

/** Load the client's 600 DPI TIFF, scaled to the requested label canvas size. */
async function loadTiffBackgroundBuffer(width: number, height: number): Promise<Buffer | null> {
  if (cachedTiffBackgroundBuffer !== undefined) {
    if (!cachedTiffBackgroundBuffer) return null;
    return sharp(cachedTiffBackgroundBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  }

  const tiffPath = resolveTiffBackgroundPath();
  if (!fs.existsSync(tiffPath)) {
    console.warn(`[labels] tiff background missing: ${tiffPath}`);
    cachedTiffBackgroundBuffer = null;
    return null;
  }
  try {
    const raw = await fs.promises.readFile(tiffPath);
    // Cache as PNG so subsequent resizes are fast
    cachedTiffBackgroundBuffer = await sharp(raw).png().toBuffer();
    return sharp(cachedTiffBackgroundBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  } catch (err) {
    console.warn('[labels] failed to load tiff background:', err);
    cachedTiffBackgroundBuffer = null;
    return null;
  }
}

let cachedFrontBackgroundBuffer: Buffer | null | undefined;

/** Strip black letterbox margins from the client artwork before use. */
async function prepareFrontBackgroundSource(raw: Buffer): Promise<Buffer> {
  return sharp(raw)
    .trim({ background: '#000000', threshold: 35 })
    .png()
    .toBuffer();
}

async function loadFrontBackgroundBuffer(width: number, height: number): Promise<Buffer | null> {
  if (cachedFrontBackgroundBuffer !== undefined) {
    if (!cachedFrontBackgroundBuffer) return null;
    return sharp(cachedFrontBackgroundBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  }

  const bgPath = resolveFrontBackgroundPath();
  if (!fs.existsSync(bgPath)) {
    cachedFrontBackgroundBuffer = null;
    return null;
  }
  try {
    const raw = await fs.promises.readFile(bgPath);
    cachedFrontBackgroundBuffer = await prepareFrontBackgroundSource(raw);
    return sharp(cachedFrontBackgroundBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
  } catch (err) {
    console.warn('[labels] failed to load front background:', err);
    cachedFrontBackgroundBuffer = null;
    return null;
  }
}

let cachedBottomPatternBuffer: Buffer | null | undefined;

async function loadBottomPatternBuffer(width: number, height: number): Promise<Buffer | null> {
  const bottomH = Math.round(height * 0.38);
  if (cachedBottomPatternBuffer !== undefined) {
    if (!cachedBottomPatternBuffer) return null;
    return sharp(cachedBottomPatternBuffer)
      .resize(width, bottomH, { fit: 'fill' })
      .png()
      .toBuffer();
  }

  const patternPath = resolveBottomPatternPath();
  if (!fs.existsSync(patternPath)) {
    console.warn(`[labels] bottom pattern missing: ${patternPath}`);
    cachedBottomPatternBuffer = null;
    return null;
  }
  try {
    cachedBottomPatternBuffer = await fs.promises.readFile(patternPath);
    return sharp(cachedBottomPatternBuffer)
      .resize(width, bottomH, { fit: 'fill' })
      .png()
      .toBuffer();
  } catch (err) {
    console.warn('[labels] failed to load bottom pattern:', err);
    cachedBottomPatternBuffer = null;
    return null;
  }
}

async function renderFrontBackground(width: number, height: number, workDir: string): Promise<Buffer> {
  const r = Math.max(4, Math.round(Math.min(width, height) * 0.03));
  const clipSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="white"/>
    </svg>`
  );

  const clientBg = await loadFrontBackgroundBuffer(width, height);
  if (clientBg) {
    const borderSvg = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${r}" fill="none" stroke="#eef7fa" stroke-width="1"/>
      </svg>`
    );
    return sharp(clientBg)
      .composite([
        { input: clipSvg, blend: 'dest-in' },
        { input: borderSvg, blend: 'over' },
      ])
      .png()
      .toBuffer();
  }

  // Fallback: gradient + generated bottom wisps
  const bgSvgPath = path.join(workDir, 'front-bg.svg');
  await fs.promises.writeFile(
    bgSvgPath,
    Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="labelBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#E8F4F7"/>
            <stop offset="100%" stop-color="#FFFFFF"/>
          </linearGradient>
          <clipPath id="labelClip">
            <rect x="0" y="0" width="${width}" height="${height}" rx="${r}"/>
          </clipPath>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" rx="${r}" fill="url(#labelBg)"/>
        <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${r}" fill="none" stroke="#eef7fa" stroke-width="1"/>
      </svg>`
    )
  );

  let bg = await sharp(bgSvgPath).png().toBuffer();
  const pattern = await loadBottomPatternBuffer(width, height);
  if (pattern) {
    const bottomH = Math.round(height * 0.38);
    bg = await sharp(bg)
      .composite([{ input: pattern, left: 0, top: height - bottomH, blend: 'over' }])
      .png()
      .toBuffer();
  }
  return bg;
}

function buildFrontSvg(
  width: number,
  height: number,
  payload: LabelRenderPayload,
  logo: LoadedLogo | null,
  fontContext: LabelFontContext,
  logoScale = 1.0
): Buffer {
  const colors = resolveColors(payload);
  const fonts = resolveFonts(payload);
  const name = escapeXml(payload.productName);
  const cx = Math.round(width * 0.5);

  // ---- Logo box (centered, top) ----
  // Box matches the trimmed logo's aspect ratio so it fills nicely.
  // logoScale < 1.0 shrinks the logo (used by the TIFF variation).
  const logoAspect = logo ? logo.width / logo.height : 3.4;
  const logoBoxH = Math.round(height * 0.32 * logoScale);
  let logoBoxW = Math.round(logoBoxH * logoAspect);
  const maxLogoW = Math.round(width * 0.85);
  if (logoBoxW > maxLogoW) {
    logoBoxW = maxLogoW;
  }
  const logoX = Math.round(cx - logoBoxW / 2);
  const logoY = Math.round(height * 0.04);

  // Horizontal budget for centered content. All text is sized so it always
  // fits this width — critical for the narrow portrait NAD+ (30x60mm) label.
  const innerW = width * 0.82;
  const fitFont = (text: string, desired: number, charRatio: number): number => {
    const estW = Math.max(1, text.length) * desired * charRatio;
    return estW > innerW ? Math.floor(innerW / (Math.max(1, text.length) * charRatio)) : desired;
  };

  // ---- Product name (fit to width) ----
  // Sized to read clearly smaller than the GoPeptides wordmark, matching the
  // bottle artwork, with clear breathing room below the logo.
  const nameDesired = Math.round(Math.min(height * 0.125, width * 0.106));
  const nameFontSize = Math.max(9, fitFont(payload.productName, nameDesired, 0.6));
  const logoToNameGap = Math.round(height * 0.05);
  const nameY = logoY + logoBoxH + logoToNameGap + Math.round(nameFontSize * 0.85);

  // ---- Divider line (teal, short, centered) ----
  const dividerY = nameY + Math.round(height * 0.07);
  const dividerHalf = Math.round(width * 0.16);

  // ---- Dosage badge (font + width both clamped to fit) ----
  // Near-square corners and a clear gap below the divider, like the bottle.
  const badgeCharUnits = estimateBadgeTextUnits(payload.dosage);
  const badgeDesired = Math.round(Math.min(height * 0.12, width * 0.20));
  const badgeFontSize = Math.max(
    25,
    fitFont('0'.repeat(Math.max(1, Math.ceil(badgeCharUnits))), badgeDesired, 0.70)
  );
  const badgeH = Math.round(badgeFontSize * 1.5);
  const badgePadding = Math.round(badgeFontSize * 0.9);
  let badgeW = Math.round(badgeCharUnits * badgeFontSize * 0.85 + badgePadding);
  const maxBadgeW = Math.round(width * 0.80);
  if (badgeW > maxBadgeW) badgeW = maxBadgeW;
  badgeW = Math.max(badgeW, Math.round(badgeFontSize * 3));
  const badgeX = Math.round(cx - badgeW / 2);
  const badgeY = dividerY + Math.round(height * 0.06);
  const badgeR = Math.max(3, Math.round(badgeH * 0.16));
  const badgeTextY = badgeY + Math.round(badgeH * 0.72);
  const badgeUnitGap = Math.max(1, Math.round(badgeFontSize * 0.30));
  const badgeDoseMarkup = buildBadgeDoseMarkup(payload.dosage, badgeUnitGap);

  // ---- Disclaimer (two lines, fit to width) ----
  // Bold + letter-spaced caps are wide, so use a generous char ratio.
  const discDesired = Math.round(Math.min(height * 0.05, width * 0.05));
  const discFont = Math.max(6, fitFont('ALLEEN VOOR ONDERZOEKSDOELEINDEN', discDesired, 0.64));
  const discY1 = Math.round(height * 0.9);
  const discY2 = discY1 + discFont + Math.round(height * 0.012);

  const logoElement = logo
    ? `<image href="${logo.dataUri}" x="${logoX}" y="${logoY}" width="${logoBoxW}" height="${logoBoxH}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${cx}" y="${logoY + Math.round(logoBoxH * 0.7)}" text-anchor="middle" font-size="${Math.max(12, Math.round(logoBoxH * 0.6))}" font-family="${fontContext.family(fonts.frontProductName)}" font-weight="700" fill="#0A2647">GoPeptides</text>`;

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        ${fontContext.styleBlock}
      </defs>

      <!-- Logo (DNA icon + GoPeptides) -->
      ${logoElement}

      <!-- Product name -->
      <text x="${cx}" y="${nameY}" text-anchor="middle"
        font-size="${nameFontSize}" font-family="${fontContext.family(fonts.frontProductName)}"
        font-weight="700" fill="${colors.frontProductName}">${name}</text>

      <!-- Teal divider -->
      <rect x="${cx - dividerHalf}" y="${dividerY}" width="${dividerHalf * 2}" height="${Math.max(2, Math.round(height * 0.012))}" rx="2" fill="${colors.frontDivider}"/>

      <!-- Dosage badge (mg value) -->
      <rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeR}" fill="${colors.frontBadgeFill}" stroke="${colors.frontBadgeStroke}" stroke-width="${Math.max(1, Math.round(height * 0.006))}"/>
      <text x="${cx}" y="${badgeTextY}" text-anchor="middle"
        font-size="${badgeFontSize}" font-family="${fontContext.family(fonts.frontDosage)}"
        font-weight="400" fill="${colors.frontDosage}">${badgeDoseMarkup}</text>

      <!-- Disclaimer (two lines, on the wave) -->
      <text x="${cx}" y="${discY1}" text-anchor="middle"
        font-size="${discFont}" font-family="${fontContext.family(fonts.frontDisclaimer)}"
        font-weight="700" fill="${colors.frontDisclaimer}" letter-spacing="0.5">NIET VOOR MENSELIJK GEBRUIK</text>
      <text x="${cx}" y="${discY2}" text-anchor="middle"
        font-size="${discFont}" font-family="${fontContext.family(fonts.frontDisclaimer)}"
        font-weight="700" fill="${colors.frontDisclaimer}" letter-spacing="0.5">ALLEEN VOOR ONDERZOEKSDOELEINDEN</text>
    </svg>`
  );
}

function backTextSvg(width: number, height: number, payload: LabelRenderPayload, fontContext: LabelFontContext): Buffer {
  const colors = resolveColors(payload);
  const fonts = resolveFonts(payload);
  const labels = getLanguageLabels(payload.language);
  const fitFont = (text: string, desired: number, charRatio: number, maxWidth: number): number => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return desired;
    const estimate = clean.length * desired * charRatio;
    if (estimate <= maxWidth) return desired;
    return Math.max(4, Math.floor(maxWidth / (clean.length * charRatio)));
  };
  const r = Math.max(4, Math.round(Math.min(width, height) * 0.03));
  const isPortrait = height > width;

  // Header bar
  const headerH = Math.max(18, Math.round(height * 0.09));

  // Text layout
  const lineData = [
    { label: labels.batch, value: payload.batchNumber },
    { label: labels.unopened, value: payload.storageUnopened },
    { label: labels.reconst, value: payload.storageReconstituted },
    { label: labels.note, value: payload.storageNote },
    { label: labels.shelf, value: payload.shelfLifeDate },
  ].filter(l => l.value);

  const startX = Math.round(width * 0.045);
  // Available vertical space for the info block (between header and code zone)
  const codeZoneY = isPortrait ? Math.round(height * 0.7) : Math.round(height * 0.6);
  const blockTop = headerH + Math.round(height * 0.04);
  const blockBottom = codeZoneY - Math.round(height * 0.02);
  const count = Math.max(1, lineData.length);
  const lineHeight = Math.max(10, Math.floor((blockBottom - blockTop) / count));
  // Cap the font so the longest "label: value" line never overflows the width.
  const longestChars = Math.max(
    1,
    ...lineData.map((l) => `${l.label}: ${formatBackSideText(l.value || '')}`.length)
  );
  const widthCapFont = Math.floor((width * 0.88) / (longestChars * 0.5));
  const fontSize = Math.max(7, Math.min(Math.round(height * 0.05), Math.round(lineHeight * 0.62), widthCapFont));
  const labelFontSize = Math.max(6, Math.round(fontSize * 0.92));

  // Header text, sized to fit the label width (bold caps run wide).
  const headerPrefix = 'GoPeptides — ';
  const headerName = escapeXml(payload.productName);
  const headerDose = escapeXml(payload.dosage);
  const headerText = `${headerPrefix}${payload.productName} ${payload.dosage}`;
  const headerFont = Math.max(6, Math.min(Math.round(headerH * 0.55), Math.floor((width * 0.84) / (headerText.length * 0.60))));

  const textNodes = lineData
    .map(({ label, value }, index) => {
      const baseY = blockTop + index * lineHeight + Math.round(lineHeight * 0.7);
      const labelText = escapeXml(formatBackSideLabel(label));
      const valueText = escapeXml(formatBackSideValue(value || '-'));
      return `<text x="${startX}" y="${baseY}" xml:space="preserve" font-family="${fontContext.family(fonts.backFieldLabels)}"><tspan font-family="${fontContext.family(fonts.backFieldLabels)}" font-size="${labelFontSize}" font-weight="700" fill="${colors.backFieldLabels}">${labelText}</tspan><tspan font-family="${fontContext.family(fonts.backFieldLabels)}" font-size="${labelFontSize}" font-weight="700" fill="${colors.backFieldLabels}">:</tspan><tspan font-size="${fontSize}" fill="${colors.backFieldValues}"> </tspan><tspan font-family="${fontContext.family(fonts.backFieldValues)}" font-size="${fontSize}" fill="${colors.backFieldValues}">${valueText}</tspan></text>`;
    })
    .join('');

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${fontContext.styleBlock}
        <clipPath id="labelClip">
          <rect x="0" y="0" width="${width}" height="${height}" rx="${r}"/>
        </clipPath>
      </defs>
      <!-- Background -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="${r}" fill="#ffffff"/>
      <!-- Header strip -->
      <rect x="0" y="0" width="${width}" height="${headerH}" rx="${r}" fill="#f4fbfb"/>
      <rect x="0" y="${Math.round(headerH / 2)}" width="${width}" height="${Math.round(headerH / 2)}" fill="#f4fbfb"/>
      <rect x="0" y="${headerH - Math.max(2, Math.round(height * 0.006))}" width="${width}" height="${Math.max(2, Math.round(height * 0.006))}" fill="${colors.backHeaderAccent}"/>
      <!-- Header: product name + mg dosage -->
      <text x="${Math.round(width * 0.5)}" y="${Math.round(headerH * 0.7)}" text-anchor="middle"
        font-size="${headerFont}" font-family="${fontContext.family(fonts.backHeaderPrefix)}" font-weight="700">
        <tspan font-family="${fontContext.family(fonts.backHeaderPrefix)}" fill="${colors.backHeaderPrefix}">${escapeXml(headerPrefix)}</tspan><tspan font-family="${fontContext.family(fonts.backHeaderNameDosage)}" fill="${colors.backHeaderNameDosage}">${headerName} ${headerDose}</tspan>
      </text>
      <!-- Outer border -->
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${r}" fill="none" stroke="#c5e8f2" stroke-width="2"/>
      <!-- Info lines -->
      ${textNodes}
      <!-- Invisible marker rect so barcode/QR compositing lands in the right zone -->
      <rect id="codeZone" x="${Math.round(width * 0.03)}" y="${codeZoneY}" width="${Math.round(width * 0.94)}" height="${height - codeZoneY - 4}" fill="#f8fdff"/>
    </svg>`
  );
}

async function renderFrontSide(
  payload: LabelRenderPayload,
  width: number,
  height: number,
  fontContext: LabelFontContext,
  workDir: string
): Promise<Buffer> {
  const logo = await loadLogoBase64();
  const bg = await renderFrontBackground(width, height, workDir);
  const svgPath = path.join(workDir, 'front.svg');
  await fs.promises.writeFile(svgPath, buildFrontSvg(width, height, payload, logo, fontContext));
  const content = await sharp(svgPath).png().toBuffer();
  return sharp(bg)
    .composite([{ input: content, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function renderBackSide(
  payload: LabelRenderPayload,
  width: number,
  height: number,
  fontContext: LabelFontContext,
  workDir: string
): Promise<Buffer> {
  const isPortrait = height > width;

  // QR code — right/bottom corner, square
  const qrSize = isPortrait
    ? Math.max(60, Math.round(Math.min(width, height) * 0.28))
    : Math.max(54, Math.round(height * 0.35));

  // Barcode — left side, wider than tall
  const barcodeW = isPortrait
    ? Math.round(width * 0.85)
    : Math.round(width * 0.46);
  const barcodeH = isPortrait
    ? Math.max(28, Math.round(height * 0.065))
    : Math.max(28, Math.round(height * 0.22));

  const qrBuffer = payload.qrUrl?.trim()
    ? await QRCode.toBuffer(payload.qrUrl, {
        margin: 1,
        width: qrSize,
        errorCorrectionLevel: 'M',
      })
    : null;

  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'code128',
    text: payload.barcodeText,
    scale: 3,
    height: 12,
    includetext: false,
    backgroundcolor: 'FFFFFF',
  });

  // Code zone top edge
  const codeZoneY = isPortrait ? Math.round(height * 0.7) : Math.round(height * 0.62);

  // Barcode bottom-left within code zone (below text block)
  const barcodeLeft = Math.round(width * 0.04);
  const barcodeTop = codeZoneY + Math.round((height - codeZoneY - barcodeH) / 2);

  // QR bottom-right — keep clear of rounded border (aligned bottom with barcode)
  const qrInsetRight = Math.round(width * (isPortrait ? 0.05 : 0.065));
  const qrLeft = width - qrSize - qrInsetRight;
  const qrTop = (barcodeTop + barcodeH) - qrSize;

  const scaledBarcode = await sharp(barcodeBuffer)
    .resize(barcodeW, barcodeH, { fit: 'fill' })
    .png()
    .toBuffer();

  const composites: Array<{ input: Buffer; left: number; top: number }> = [
    { input: scaledBarcode, left: barcodeLeft, top: barcodeTop },
  ];
  if (qrBuffer) {
    composites.push({ input: qrBuffer, left: qrLeft, top: qrTop });
  }

  const svgPath = path.join(workDir, 'back.svg');
  await fs.promises.writeFile(svgPath, backTextSvg(width, height, payload, fontContext));

  return sharp(svgPath)
    .composite(composites)
    .png()
    .toBuffer();
}

function buildCenteredInfoSvg(
  width: number,
  height: number,
  payload: LabelRenderPayload,
  fontContext: LabelFontContext
): Buffer {
  const colors = resolveColors(payload);
  const fonts = resolveFonts(payload);
  const labels = getLanguageLabels(payload.language);
  const fitFont = (text: string, desired: number, charRatio: number, maxWidth: number): number => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return desired;
    const estimate = clean.length * desired * charRatio;
    if (estimate <= maxWidth) return desired;
    return Math.max(4, Math.floor(maxWidth / (clean.length * charRatio)));
  };

  const px = Math.round(width * 0.06);
  const innerWidth = Math.max(24, width - px * 2);

  const baseFontSize = Math.max(4, Math.min(Math.round(height * 0.042), fitFont(payload.batchNumber || 'GP-260605-003', Math.round(height * 0.042), 0.58, innerWidth)));
  const iconSize = Math.round(height * 0.12);
  const batchH = Math.round(height * 0.23);
  const rowH = Math.round((height - batchH) / 3);
  const textX = px + iconSize + Math.round(width * 0.04);
  const rowTextWidth = width - textX - px;
  
  const rowFont = Math.max(5, Math.min(Math.round(height * 0.048), fitFont(`${labels.storage}:`, Math.round(height * 0.048), 0.58, rowTextWidth)));
  const maxSmallFont = fitFont('2-8°C, Beschermen', Math.round(rowFont * 0.92), 0.58, rowTextWidth);
  const smallFont = Math.max(4, Math.min(Math.round(rowFont * 0.92), maxSmallFont));

  const batchValue = payload.batchNumber || 'GP-260605-003';
  const batchValueY = Math.round(batchH * 0.74);

  const wrapText = (text: string, maxChars: number) => {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= maxChars) {
        cur = (cur + ' ' + w).trim();
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  /**
   * Shrinks font size (down to minFontSize) and re-wraps at each size until the
   * wrapped block fits within maxHeight, so longer storage text never overflows
   * into the row below. firstLineRatio must match the baseline offset used to
   * position the first tspan (it's larger than lineHeightRatio, so it has to be
   * counted separately or the fit check underestimates the block's real height).
   * At the floor size, lines that still don't fit are dropped rather than left
   * to overlap the next row.
   */
  const fitWrappedTextToBox = (
    text: string,
    maxWidth: number,
    maxHeight: number,
    startFontSize: number,
    minFontSize: number,
    charRatio: number,
    lineHeightRatio: number,
    firstLineRatio: number
  ): { font: number; lines: string[] } => {
    const blockHeight = (font: number, lineCount: number) =>
      font * firstLineRatio + Math.max(0, lineCount - 1) * font * lineHeightRatio + font * 0.2;
    for (let font = startFontSize; font >= minFontSize; font -= 1) {
      const maxChars = Math.max(1, Math.floor(maxWidth / (font * charRatio)));
      const lines = wrapText(text, maxChars);
      if (blockHeight(font, lines.length) <= maxHeight || font === minFontSize) {
        let maxLines = 1;
        while (maxLines < lines.length && blockHeight(font, maxLines + 1) <= maxHeight) {
          maxLines += 1;
        }
        return { font, lines: lines.slice(0, maxLines) };
      }
    }
    return { font: minFontSize, lines: [text] };
  };

  // All filled storage fields (unopened / reconstituted / special note) are
  // combined into the single Storage row — fitWrappedTextToBox shrinks the font
  // as needed so they fit. If none were filled in, don't invent placeholder
  // storage instructions — hide both the value and the "Storage:" heading.
  const storageParts = [payload.storageUnopened, payload.storageReconstituted, payload.storageNote]
    .map((v) => (v || '').trim())
    .filter(Boolean);
  const hasStorageData = storageParts.length > 0;
  const storageText = storageParts.join(' / ');
  const storageBoxTop = Math.round(rowH * 0.42);
  const storageBottomMargin = Math.round(rowH * 0.1);
  const storageAvailableHeight = Math.max(smallFont * 1.55, rowH - storageBoxTop - storageBottomMargin);
  const { font: storageFont, lines: storageLines } = hasStorageData
    ? fitWrappedTextToBox(storageText, rowTextWidth, storageAvailableHeight, smallFont, 4, 0.58, 1.15, 1.55)
    : { font: smallFont, lines: [] as string[] };
  const storageTspans = storageLines.map((line, idx) =>
    `<tspan x="${textX}" dy="${idx === 0 ? 0 : storageFont * 1.15}">${escapeXml(line)}</tspan>`
  ).join('');

  // CoA reference is per-label (each product/dosage/batch has its own certificate
  // number), so it must fit on one line rather than word-wrap — shrink the font
  // instead of breaking the text across rows. If no reference was entered, hide
  // both the value and the "CoA:" heading rather than showing filler text.
  const hasCoaData = Boolean(payload.coaReference && payload.coaReference.trim());
  const coaText = hasCoaData ? payload.coaReference!.trim() : '';
  const coaFont = Math.max(4, Math.min(smallFont, fitFont(coaText, smallFont, 0.58, rowTextWidth)));

  const shelfText = payload.shelfLifeDate && payload.shelfLifeDate.trim()
    ? `${labels.shelf}: ${payload.shelfLifeDate.trim()}`
    : '';
  const shelfFont = shelfText ? Math.max(4, Math.min(Math.round(baseFontSize * 0.7), fitFont(shelfText, Math.round(baseFontSize * 0.7), 0.58, innerWidth))) : 0;

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff" fill-opacity="${payload.fullBackground ? '0' : '1'}" />

      <text x="${px}" y="${Math.round(batchH * (shelfText ? 0.46 : 0.55))}"
            font-family="${fontContext.family(fonts.backFieldValues)}"
            font-size="${Math.max(4, Math.round(baseFontSize * 1.05))}" font-weight="700"
            fill="${colors.backFieldValues}">${escapeXml(batchValue)}</text>
      ${shelfText ? `<text x="${px}" y="${batchValueY}"
            font-family="${fontContext.family(fonts.backFieldLabels)}"
            font-size="${shelfFont}"
            fill="${colors.backFieldLabels}">${escapeXml(shelfText)}</text>` : ''}

      <!-- Row 1: Thermometer / Opslag -->
      <g transform="translate(0, ${batchH})">
        <line x1="${px}" y1="-10" x2="${width - px}" y2="-10" stroke="${colors.backHeaderAccent}" stroke-width="1" opacity="0.7"/>
        <g transform="translate(${px}, ${Math.round((rowH - iconSize)/2)}) scale(${iconSize / 24})">
          <path d="M14,14.7 V4 C14,2.9 13.1,2 12,2 C10.9,2 10,2.9 10,4 V14.7 C8.8,15.6 8,17.2 8,19 C8,21.2 9.8,23 12,23 C14.2,23 16,21.2 16,19 C16,17.2 15.2,15.6 14,14.7 Z M12,21 C10.9,21 10,20.1 10,19 C10,18.3 10.4,17.7 11,17.3 V9 H13 V17.3 C13.6,17.7 14,18.3 14,19 C14,20.1 13.1,21 12,21 Z" fill="${colors.backHeaderAccent}"/>
          <circle cx="12" cy="19" r="1.5" fill="${colors.backHeaderAccent}"/>
        </g>
        ${hasStorageData ? `<text x="${textX}" y="${Math.round(rowH * 0.42)}"
              font-family="${fontContext.family(fonts.backFieldLabels)}"
              font-size="${rowFont}" font-weight="800"
              fill="${colors.backFieldLabels}">${escapeXml(labels.storage)}:</text>
        <text x="${textX}" y="${Math.round(rowH * 0.42) + storageFont * 1.55}"
              font-family="${fontContext.family(fonts.backFieldValues)}"
              font-size="${storageFont}"
              fill="${colors.backFieldValues}">${storageTspans}</text>` : ''}
      </g>

      <!-- Row 2: Verify / 99% HPLC -->
      <g transform="translate(0, ${batchH + rowH})">
        <line x1="${px}" y1="-10" x2="${width - px}" y2="-10" stroke="${colors.backHeaderAccent}" stroke-width="1" opacity="0.7"/>
        <g transform="translate(${px}, ${Math.round((rowH - iconSize)/2)}) scale(${iconSize / 24})">
          <path d="M12,2 L21,6 V12 C21,17.2 17.8,21 12,22 C6.2,21 3,17.2 3,12 V6 Z" fill="none" stroke="${colors.backHeaderAccent}" stroke-width="1.8"/>
          <path d="M7.5,12.2 L10.3,15 L16.8,8.5" fill="none" stroke="${colors.backHeaderAccent}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="${textX}" y="${Math.round(rowH * 0.42)}"
              font-family="${fontContext.family(fonts.backFieldLabels)}"
              font-size="${rowFont}" font-weight="800"
              fill="${colors.backFieldLabels}">>=99% HPLC</text>
        <text x="${textX}" y="${Math.round(rowH * 0.42) + smallFont * 1.55}"
              font-family="${fontContext.family(fonts.backFieldValues)}"
              font-size="${smallFont}"
              fill="${colors.backFieldValues}">${escapeXml(labels.purity)}</text>
      </g>

      <!-- Row 3: Book / CoA -->
      <g transform="translate(0, ${batchH + rowH * 2})">
        <line x1="${px}" y1="-10" x2="${width - px}" y2="-10" stroke="${colors.backHeaderAccent}" stroke-width="1" opacity="0.7"/>
        <g transform="translate(${px}, ${Math.round((rowH - iconSize)/2)}) scale(${iconSize / 24})">
          <path d="M21,4 H3 C1.9,4 1,4.9 1,6 V18 C1,19.1 1.9,20 3,20 H21 C22.1,20 23,19.1 23,18 V6 C23,4.9 22.1,4 21,4 Z M21,18 H12 V6 H21 V18 Z M11,18 H3 V6 H11 V18 Z" fill="${colors.backHeaderAccent}"/>
          <rect x="15" y="8" width="4" height="2" fill="${colors.backHeaderAccent}"/>
          <rect x="15" y="11" width="4" height="2" fill="${colors.backHeaderAccent}"/>
          <rect x="15" y="14" width="4" height="2" fill="${colors.backHeaderAccent}"/>
          <circle cx="7" cy="9" r="1.5" fill="${colors.backHeaderAccent}"/>
          <rect x="6" y="11" width="2" height="5" fill="${colors.backHeaderAccent}"/>
        </g>
        ${hasCoaData ? `<text x="${textX}" y="${Math.round(rowH * 0.42)}"
              font-family="${fontContext.family(fonts.backFieldLabels)}"
              font-size="${rowFont}" font-weight="800"
              fill="${colors.backFieldLabels}">CoA:</text>` : ''}
        ${hasCoaData ? `<text x="${textX}" y="${Math.round(rowH * 0.42) + smallFont * 1.55}"
              font-family="${fontContext.family(fonts.backFieldValues)}"
              font-size="${coaFont}"
              fill="${colors.backFieldValues}">${escapeXml(coaText)}</text>` : ''}
      </g>
    </svg>`
  );
}

export async function renderCenteredLabelPng(payload: LabelRenderPayload): Promise<{ buffer: Buffer; widthPx: number; heightPx: number }> {
  const { widthPx, heightPx } = sidePixelSize(payload.labelWidthMm, payload.labelHeightMm);
  const leftWidth   = Math.round(widthPx * 0.29);
  const centerWidth = Math.round(widthPx * 0.42);
  const rightWidth  = widthPx - leftWidth - centerWidth;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gopep-label-centered-'));

  try {
    const fontContext = await prepareLabelFontContext(workDir, Object.values(resolveFonts(payload)));
    const colors = resolveColors(payload);
    const fonts  = resolveFonts(payload);
    const background = await renderFrontBackground(widthPx, heightPx, workDir);
    const logo = await loadLogoBase64();

    // Center panel — unchanged front design
    const front = await sharp(buildFrontSvg(centerWidth, heightPx, payload, logo, fontContext)).png().toBuffer();

    // Left panel — batch header + storage rows + HPLC block
    const info = await sharp(buildCenteredInfoSvg(leftWidth, heightPx, payload, fontContext)).png().toBuffer();

    // Right panel — GoPeptides branding + QR + horizontal barcode
    const brandingH    = Math.round(heightPx * 0.24);
    const cx_r         = Math.round(rightWidth / 2);
    const rightInnerW  = Math.max(24, rightWidth - Math.round(rightWidth * 0.14));
    const fitRightFont = (text: string, desired: number, charRatio: number): number => {
      const clean = text.replace(/\s+/g, ' ').trim();
      if (!clean) return desired;
      const estimate = clean.length * desired * charRatio;
      if (estimate <= rightInnerW) return desired;
      return Math.max(6, Math.floor(rightInnerW / (clean.length * charRatio)));
    };
    const brandFontSz  = fitRightFont('GoPeptides', Math.max(6, Math.round(rightWidth * 0.17)), 0.62);
    const urlFontSz    = fitRightFont('www.gopeptides.nl', Math.max(5, Math.round(rightWidth * 0.09)), 0.58);

    const rightPanelSvg = Buffer.from(
      `<svg width="${rightWidth}" height="${heightPx}" xmlns="http://www.w3.org/2000/svg">
        <!-- Branding zone tint -->
        <rect width="100%" height="100%" fill="#ffffff" />
        <rect x="2" y="0" width="${rightWidth - 2}" height="${brandingH}"
              fill="${colors.backHeaderAccent}" fill-opacity="0.07"/>
        <!-- GoPeptides name in logo nav color -->
        <text x="${cx_r}" y="${Math.round(brandingH * 0.42)}"
              text-anchor="middle"
              font-family="${fontContext.family(fonts.backHeaderPrefix)}"
              font-size="${brandFontSz}" font-weight="700"
              fill="${colors.backHeaderPrefix}">GoPeptides</text>
        <!-- Contact URL -->
        <text x="${cx_r}" y="${Math.round(brandingH * 0.78)}"
              text-anchor="middle"
              font-family="${fontContext.family(fonts.backFieldLabels)}"
              font-size="${urlFontSz}"
              fill="${colors.backHeaderAccent}">www.gopeptides.nl</text>
      </svg>`
    );
    const rightPanel = await sharp(rightPanelSvg).png().toBuffer();

    // QR — centered between branding block and barcode
    const qrSize = Math.min(
      Math.round(rightWidth * 0.72),
      Math.round((heightPx - brandingH) * 0.50)
    );
    const qr = payload.qrUrl.trim()
      ? await QRCode.toBuffer(payload.qrUrl, { margin: 1, width: qrSize, errorCorrectionLevel: 'M' })
      : null;

    // Barcode — horizontal at the bottom of the right panel (no rotation)
    const barcodeW   = Math.round(rightWidth * 0.84);
    const barcodeH   = Math.max(14, Math.round(heightPx * 0.09));
    const barcode = await sharp(await bwipjs.toBuffer({
      bcid: 'code128',
      text: payload.barcodeText,
      scale: 2,
      height: 8,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    }))
      .resize(barcodeW, barcodeH, { fit: 'fill' })
      .png()
      .toBuffer();

    const rightX      = leftWidth + centerWidth;
    const barcodeLeft = rightX + Math.round((rightWidth - barcodeW) / 2);
    const barcodeTop  = heightPx - barcodeH - Math.round(heightPx * 0.03);
    const qrLeft      = rightX + Math.round((rightWidth - qrSize) / 2);
    // Vertically center QR between branding block bottom and barcode top
    const qrTop = brandingH + Math.round((barcodeTop - brandingH - qrSize) / 2);

    const composites: Array<{ input: Buffer; left: number; top: number }> = [
      { input: info,       left: 0,          top: 0 },
      { input: front,      left: leftWidth,   top: 0 },
      { input: rightPanel, left: rightX,      top: 0 },
      { input: barcode,    left: barcodeLeft, top: barcodeTop },
    ];
    if (qr) {
      composites.push({ input: qr, left: qrLeft, top: qrTop });
    }

    const buffer = await sharp(background).composite(composites).png().toBuffer();
    return { buffer, widthPx, heightPx };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

/**
 * Variation 3 — TIFF background with all label content center-aligned on top.
 *
 * Rendered at TIFF_LABEL_DPI (600) so the TIFF background is used at or near
 * its native resolution instead of being scaled down to a blurry 300 DPI canvas.
 * frontWidth = label width / 2 (20 mm for a 40 mm label), centered with
 * ~10 mm of visible TIFF on each side.
 *
 * Returns dpi=TIFF_LABEL_DPI so the PDF converter uses the correct physical size.
 */
export async function renderTiffLabelPng(payload: LabelRenderPayload): Promise<{ buffer: Buffer; widthPx: number; heightPx: number; dpi: number }> {
  const dpi = payload.previewDpi && payload.previewDpi > 0 ? payload.previewDpi : TIFF_LABEL_DPI;
  const widthPx = mmToPx(payload.labelWidthMm, dpi);
  const heightPx = mmToPx(payload.labelHeightMm, dpi);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gopep-label-tiff-'));

  try {
    const fontContext = await prepareLabelFontContext(workDir, Object.values(resolveFonts(payload)));
    const logo = await loadLogoBase64();

    // 1. Background. Rainbow on (default): the client's holographic TIFF
    // (assets/label-tiff-background.tiff) used as-is at full vibrancy — no white
    // veil, its center band is already light enough for the front text.
    // Rainbow off: plain white, no substitute artwork.
    let background: Buffer;
    const wantsRainbow = payload.useRainbowBackground !== false;
    const tiffBg = wantsRainbow ? await loadTiffBackgroundBuffer(widthPx, heightPx) : null;
    if (tiffBg) {
      background = tiffBg;
    } else {
      background = await sharp({
        create: { width: widthPx, height: heightPx, channels: 3, background: '#ffffff' },
      })
        .png()
        .toBuffer();
    }

    // 2. Front content SVG — built at the "front half" width (20 mm for a 40 mm
    //    label) so all element sizes match the standard front panel.
    const leftWidth   = Math.round(widthPx * 0.29);
    const centerWidth = Math.round(widthPx * 0.42);
    const rightWidth  = widthPx - leftWidth - centerWidth;
    const topInset    = Math.round(heightPx * 0.02);
    const colors      = resolveColors(payload);
    const fonts       = resolveFonts(payload);

    const frontSvgPath = path.join(workDir, 'tiff-front.svg');
    await fs.promises.writeFile(
      frontSvgPath,
      buildFrontSvg(centerWidth, heightPx - topInset, payload, logo, fontContext, 0.75)
    );
    const frontContent = await sharp(frontSvgPath).png().toBuffer();

    // 3. Left panel — batch header + storage rows + HPLC block
    const info = await sharp(buildCenteredInfoSvg(leftWidth, heightPx, payload, fontContext)).png().toBuffer();

    // 4. Right panel — GoPeptides branding + QR + horizontal barcode
    const brandingH    = Math.round(heightPx * 0.24);
    const cx_r         = Math.round(rightWidth / 2);
    const rightInnerW  = Math.max(24, rightWidth - Math.round(rightWidth * 0.14));
    const fitRightFont = (text: string, desired: number, charRatio: number): number => {
      const clean = text.replace(/\s+/g, ' ').trim();
      if (!clean) return desired;
      const estimate = clean.length * desired * charRatio;
      if (estimate <= rightInnerW) return desired;
      return Math.max(6, Math.floor(rightInnerW / (clean.length * charRatio)));
    };
    const brandFontSz  = fitRightFont('GoPeptides', Math.max(6, Math.round(rightWidth * 0.17)), 0.62);
    const urlFontSz    = fitRightFont('www.gopeptides.nl', Math.max(5, Math.round(rightWidth * 0.09)), 0.58);

    const rightPanelSvg = Buffer.from(
      `<svg width="${rightWidth}" height="${heightPx}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff" fill-opacity="${payload.fullBackground ? '0' : '1'}" />
        <rect x="2" y="0" width="${rightWidth - 2}" height="${brandingH}"
              fill="${colors.backHeaderAccent}" fill-opacity="0.07"/>
        <text x="${cx_r}" y="${Math.round(brandingH * 0.42)}"
              text-anchor="middle"
              font-family="${fontContext.family(fonts.backHeaderPrefix)}"
              font-size="${brandFontSz}" font-weight="700"
              fill="${colors.backHeaderPrefix}">GoPeptides</text>
        <text x="${cx_r}" y="${Math.round(brandingH * 0.78)}"
              text-anchor="middle"
              font-family="${fontContext.family(fonts.backFieldLabels)}"
              font-size="${urlFontSz}"
              fill="${colors.backHeaderAccent}">www.gopeptides.nl</text>
      </svg>`
    );
    const rightPanel = await sharp(rightPanelSvg).png().toBuffer();

    const qrSize = Math.min(Math.round(rightWidth * 0.72), Math.round((heightPx - brandingH) * 0.50));
    const qr = payload.qrUrl.trim()
      ? await QRCode.toBuffer(payload.qrUrl, { margin: 1, width: qrSize, errorCorrectionLevel: 'M' })
      : null;

    const barcodeW   = Math.round(rightWidth * 0.84);
    const barcodeH   = Math.max(14, Math.round(heightPx * 0.09));
    const barcode = await sharp(await bwipjs.toBuffer({
      bcid: 'code128',
      text: payload.barcodeText,
      scale: 2,
      height: 8,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    }))
      .resize(barcodeW, barcodeH, { fit: 'fill' })
      .png()
      .toBuffer();

    const rightX      = leftWidth + centerWidth;
    const barcodeLeft = rightX + Math.round((rightWidth - barcodeW) / 2);
    const barcodeTop  = heightPx - barcodeH - Math.round(heightPx * 0.03);
    const qrLeft      = rightX + Math.round((rightWidth - qrSize) / 2);
    const qrTop       = brandingH + Math.round((barcodeTop - brandingH - qrSize) / 2);

    const composites: Array<{ input: Buffer; left: number; top: number }> = [
      { input: info,       left: 0,          top: 0 },
      { input: frontContent, left: leftWidth,   top: topInset },
      { input: rightPanel, left: rightX,      top: 0 },
      { input: barcode,    left: barcodeLeft, top: barcodeTop },
    ];
    if (qr) {
      composites.push({ input: qr, left: qrLeft, top: qrTop });
    }

    const buffer = await sharp(background).composite(composites).png().toBuffer();

    return { buffer, widthPx, heightPx, dpi };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function renderCombinedLabelPng(payload: LabelRenderPayload): Promise<{ buffer: Buffer; widthPx: number; heightPx: number }> {
  const { widthPx, heightPx } = sidePixelSize(payload.labelWidthMm, payload.labelHeightMm);
  // The front and back share one physical sticker. Rendering each half at its
  // final size avoids shrinking an 80 mm image to a 40 mm printer setting.
  const frontWidth = Math.floor(widthPx / 2);
  const backWidth = widthPx - frontWidth;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gopep-label-'));

  try {
    const fontContext = await prepareLabelFontContext(workDir, Object.values(resolveFonts(payload)));
    const front = await renderFrontSide(payload, frontWidth, heightPx, fontContext, workDir);
    const back = await renderBackSide(payload, backWidth, heightPx, fontContext, workDir);

    const buffer = await sharp({
      create: {
        width: widthPx,
        height: heightPx,
        channels: 4,
        background: '#ffffff',
      },
    })
      .composite([
        { input: front, left: 0, top: 0 },
        { input: back, left: frontWidth, top: 0 },
      ])
      .png()
      .toBuffer();

    return { buffer, widthPx, heightPx };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function convertPngToPdf(pngBuffer: Buffer, widthPx: number, heightPx: number, dpi = LABEL_DPI): Promise<Buffer> {
  const pages = [{ buffer: pngBuffer, widthPx, heightPx, dpi }];
  return combineLabelPngsToPdf(pages);
}

export async function combineLabelPngsToPdf(
  pages: Array<{ buffer: Buffer; widthPx: number; heightPx: number; dpi?: number }>
): Promise<Buffer> {
  const pdf = await PDFDocument.create();

  for (const { buffer, widthPx, heightPx, dpi = LABEL_DPI } of pages) {
    const widthPt = (widthPx / dpi) * 72;
    const heightPt = (heightPx / dpi) * 72;
    const page = pdf.addPage([widthPt, heightPt]);
    const pngImage = await pdf.embedPng(buffer);
    page.drawImage(pngImage, { x: 0, y: 0, width: widthPt, height: heightPt });
  }

  return Buffer.from(await pdf.save());
}

export function ensureLabelOutputDir(baseUploadDir: string): string {
  const dir = path.resolve(baseUploadDir, 'labels');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function makeStableLabelFileStem(productSlug: string, dosage: string): string {
  const safeDosage = dosage.toLowerCase().replace(/[^a-z0-9+]/g, '-').replace(/-+/g, '-');
  return `${productSlug}-${safeDosage}`;
}

export function makeLabelFileStem(productSlug: string, dosage: string): string {
  return `${makeStableLabelFileStem(productSlug, dosage)}-${Date.now()}`;
}

