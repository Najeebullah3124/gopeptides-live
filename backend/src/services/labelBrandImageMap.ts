import fs from 'fs';
import path from 'path';

/** Maps product slug → filename in new-brand-images/ (project root) */
export const BRAND_IMAGE_BY_SLUG: Record<string, string> = {
  '5-amino-1mq-50mg': '5-Amino-1MQ 50 mg juiste foto.png',
  'bpc-157-10mg': 'BPC-157 10mg juiste foto.png',
  'bpc157-tb500-wolf-10mg': 'BPC157+TB500 (Wolverine Blend) 5+5 mg juiste foto.png',
  'bpc157-tb500-wolf-20mg': 'BPC157+TB500 (Wolverine Blend) 10+10 juiste foto.png',
  'cagrilintide-5mg': 'Cagrilintide 5 mg juiste foto.png',
  'cagrilintide-10mg': 'Cagrilintide 10 mg juiste foto.png',
  'cjc1295-ipamorelin-5mg': 'CJC1295+Ipamorelin Blend 5+5 mg juiste foto.png',
  'cjc1295-ipamorelin-10mg': 'CJC1295+Ipamorelin Blend 10+10 mg juiste foto.png',
  'ghk-cu-50mg': 'GHK-Cu 50 mg juiste foto.png',
  'ghk-cu-100mg': 'GHK-Cu 100 mg juiste foto.png',
  'glow-50mg': 'GLOW 50 mg juiste foto.png',
  'klow-80mg': 'KLOW 80 mg juiste foto.png',
  'mots-c-5mg': 'Mots-C 5 mg juiste foto.png',
  'mots-c-10mg': 'Mots-C 10 mg juiste foto.png',
  'nad-500mg': 'NAD+ 500 mg juiste foto.png',
  'nad-1000mg': 'NAD+ 1000 mg juiste foto.png',
  'retatrutide-10mg': 'Retatutride 10 mg juiste foto.png',
  'retatrutide-15mg': 'Retatutride 15 mg juiste foto.png',
  'retatrutide-20mg': 'Retatutride 20 mg juiste foto.png',
  'retatrutide-30mg': 'Retatutride 30 mg juiste foto.png',
  'retatrutide-60mg': 'Retatutride 60 mg juiste foto.png',
  'selank-10mg': 'Selank 10 mg juiste foto.png',
  'semax-5mg': 'Semax 5 mg juiste foto.png',
  'semax-10mg': 'Semax 10 mg juiste foto.png',
  'ss-31-10mg': 'SS-31 10 mg juiste afbeelding.png',
  'tb-500-10mg': 'TB500 10 mg juiste foto.png',
  'tesamorelin-5mg': 'Tesamorelin 5 mg juiste foto.png',
  'tesamorelin-10mg': 'Tesamorelin 10 mg juiste foto.png',
  'tirzepatide-10mg': 'Tirzepatide 10 mg juiste foto.png',
  'tirzepatide-15mg': 'Tirzepatide 15 mg juiste foto.png',
  'tirzepatide-20mg': 'Tirzepatide 20 mg juiste foto.png',
  'tirzepatide-30mg': 'Tirzepatide 30 mg juiste foto.png',
  'tirzepatide-60mg': 'Tirzepatide 60 mg juiste foto.png',
};

/** Nexipep-Ecommerce/new-brand-images — run scripts from backend/ */
export function resolveBrandImagesDir(): string {
  return path.resolve(process.cwd(), '..', 'new-brand-images');
}

export function resolveBrandImagePath(slug: string): string | null {
  const fileName = BRAND_IMAGE_BY_SLUG[slug];
  if (!fileName) return null;
  const full = path.join(resolveBrandImagesDir(), fileName);
  return fs.existsSync(full) ? full : null;
}

export function resolveProductImageOutputDirs(): string[] {
  const root = path.resolve(process.cwd(), '..');
  const dirs = [
    path.join(root, 'frontend-build', 'public', 'products'),
    path.join(root, 'frontend-build', 'dist', 'products'),
    path.join(root, 'frontend', 'products'),
  ];
  return [...new Set(dirs)];
}
