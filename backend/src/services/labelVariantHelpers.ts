import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import {
  DEFAULT_LABEL_FONT,
  normalizeLabelFontFamily,
} from './googleFontService';

export interface LabelLangOverride {
  storageUnopened?: string;
  storageReconstituted?: string;
  storageNote?: string;
  shelfLifeDate?: string;
  coaReference?: string;
}

export type LabelTranslations = Record<string, LabelLangOverride>;

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

// Global brand palette (applied to every label, not per-variant):
//   brand navy  #1A2B4C  — GoPeptides wordmark / back header prefix
//   teal accent #2FA9B8  — product name, divider, dosage badge, back accents
//   slate text  #2C3E50  — disclaimer + back field values
export const DEFAULT_LABEL_COLORS: Required<LabelColorOverrides> = {
  frontProductName: '#2fa9b8',
  frontDosage: '#ffffff',
  frontDivider: '#2fa9b8',
  frontBadgeFill: '#2fa9b8',
  frontBadgeStroke: '#2fa9b8',
  frontDisclaimer: '#2c3e50',
  backHeaderPrefix: '#1a2b4c',
  backHeaderNameDosage: '#2fa9b8',
  backHeaderAccent: '#2fa9b8',
  backFieldLabels: '#2fa9b8',
  backFieldValues: '#2c3e50',
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

export type ResolvedLabelFonts = Record<keyof LabelFontOverrides, string>;

export const DEFAULT_LABEL_FONTS: ResolvedLabelFonts = {
  frontProductName: DEFAULT_LABEL_FONT,
  frontDosage: DEFAULT_LABEL_FONT,
  frontDisclaimer: DEFAULT_LABEL_FONT,
  backHeaderPrefix: DEFAULT_LABEL_FONT,
  backHeaderNameDosage: DEFAULT_LABEL_FONT,
  backFieldLabels: DEFAULT_LABEL_FONT,
  backFieldValues: DEFAULT_LABEL_FONT,
};

export function parseLabelColorOverrides(raw: string | null | undefined): LabelColorOverrides {
  try {
    const parsed = JSON.parse(raw || '{}');
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function stringifyLabelColorOverrides(input: unknown): string {
  if (typeof input === 'string') return input;
  return JSON.stringify(input || {});
}

export function resolveLabelColors(raw?: string | null): ResolvedLabelColors {
  return { ...DEFAULT_LABEL_COLORS, ...parseLabelColorOverrides(raw) };
}

export function parseLabelFontOverrides(raw: string | null | undefined): LabelFontOverrides {
  try {
    const parsed = JSON.parse(raw || '{}');
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function stringifyLabelFontOverrides(input: unknown): string {
  if (typeof input === 'string') return input;
  return JSON.stringify(input || {});
}

export function resolveLabelFonts(raw: string | null | undefined): ResolvedLabelFonts {
  const overrides = parseLabelFontOverrides(raw);
  return {
    frontProductName: normalizeLabelFontFamily(overrides.frontProductName, DEFAULT_LABEL_FONTS.frontProductName),
    frontDosage: normalizeLabelFontFamily(overrides.frontDosage, DEFAULT_LABEL_FONTS.frontDosage),
    frontDisclaimer: normalizeLabelFontFamily(overrides.frontDisclaimer, DEFAULT_LABEL_FONTS.frontDisclaimer),
    backHeaderPrefix: normalizeLabelFontFamily(overrides.backHeaderPrefix, DEFAULT_LABEL_FONTS.backHeaderPrefix),
    backHeaderNameDosage: normalizeLabelFontFamily(overrides.backHeaderNameDosage, DEFAULT_LABEL_FONTS.backHeaderNameDosage),
    backFieldLabels: normalizeLabelFontFamily(overrides.backFieldLabels, DEFAULT_LABEL_FONTS.backFieldLabels),
    backFieldValues: normalizeLabelFontFamily(overrides.backFieldValues, DEFAULT_LABEL_FONTS.backFieldValues),
  };
}

export interface LabelVariantFields {
  storageUnopened: string | null;
  storageReconstituted: string | null;
  storageNote: string | null;
  shelfLifeDate: string | null;
  coaReference: string | null;
}

export function parseLabelTranslations(raw: string | null | undefined): LabelTranslations {
  try {
    const parsed = JSON.parse(raw || '{}');
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function stringifyLabelTranslations(input: unknown): string {
  if (typeof input === 'string') return input;
  return JSON.stringify(input || {});
}

export function resolveLabelFields(
  variant: {
    storageUnopened: string | null;
    storageReconstituted: string | null;
    storageNote: string | null;
    shelfLifeDate: string | null;
    translations?: string | null;
  },
  language: string
): LabelVariantFields {
  const lang = language.toLowerCase();
  const translations = parseLabelTranslations(variant.translations);
  const override = translations[lang] || {};
  const coaReference =
    override.coaReference ??
    translations.en?.coaReference ??
    translations.nl?.coaReference ??
    translations.de?.coaReference ??
    null;
  return {
    storageUnopened: override.storageUnopened ?? variant.storageUnopened,
    storageReconstituted: override.storageReconstituted ?? variant.storageReconstituted,
    storageNote: override.storageNote ?? variant.storageNote,
    shelfLifeDate: override.shelfLifeDate ?? variant.shelfLifeDate,
    coaReference,
  };
}

export function deriveDosageFromProduct(weight: string, name: string): string {
  const trimmed = (weight || '').trim();
  if (trimmed) return trimmed;
  const match = name.match(/(\d+(?:\+\d+)?)\s*mg/i);
  if (match) {
    const raw = match[1];
    if (raw.includes('+')) {
      return raw.split('+').map((part) => `${part} mg`).join('+');
    }
    return `${raw} mg`;
  }
  return '10 mg';
}

export function getLabelDimensions(productName: string): { width: number; height: number } {
  const normalized = productName.toLowerCase().replace(/\s+/g, '').replace(/\+/g, '+');
  return normalized.includes('nad+') ? { width: 30, height: 60 } : { width: 40, height: 20 };
}

export function makePlaceholderBatch(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `GP-${yy}${mm}${dd}-NEW`;
}

export async function deleteLabelVariantAssets(variantId: string): Promise<number> {
  const { prisma } = await import('../config/database');
  const assets = await prisma.labelAsset.findMany({ where: { labelVariantId: variantId } });
  for (const asset of assets) {
    const absolutePath = path.resolve(env.upload.dir, 'labels', asset.fileName);
    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  }
  await prisma.labelAsset.deleteMany({ where: { labelVariantId: variantId } });
  return assets.length;
}
