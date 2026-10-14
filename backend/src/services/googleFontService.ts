import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { env } from '../config/env';

/** Default label font — geometric sans-serif matching GoPeptides product labels (Montserrat). */
export const DEFAULT_LABEL_FONT = 'Montserrat';

const BUNDLED_FONT_FILES: Record<string, { regular: string; bold: string }> = {
  'dejavu sans': {
    regular: 'DejaVuSans.ttf',
    bold: 'DejaVuSans-Bold.ttf',
  },
  montserrat: {
    regular: 'Montserrat-Regular.ttf',
    bold: 'Montserrat-Bold.ttf',
  },
};

const GOOGLE_FONTS_METADATA_URL = 'https://fonts.google.com/metadata/fonts';
const LEGACY_FONT_MAP: Record<string, string> = {
  'dejavu-sans': 'Montserrat',
  roboto: 'Montserrat',
  'dejavu serif': 'Montserrat',
  'dejavu-serif': 'Merriweather',
  arial: 'Open Sans',
  times: 'Merriweather',
  courier: 'Roboto Mono',
};

/** User-Agent that makes Google Fonts CSS return TTF URLs (not WOFF2). */
const TTF_USER_AGENT = 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko';

let cachedFontFamilies: string[] | null = null;

export function normalizeLabelFontFamily(
  value: string | undefined,
  fallback: string = DEFAULT_LABEL_FONT
): string {
  const raw = (value || '').trim();
  if (!raw) return fallback;
  const legacy = LEGACY_FONT_MAP[raw.toLowerCase()];
  if (legacy) return legacy;
  if (/^[\w\s+'-]{1,80}$/.test(raw)) return raw;
  return fallback;
}

export function toSvgFontToken(family: string): string {
  const slug = normalizeLabelFontFamily(family)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `GF_${slug || 'montserrat'}`;
}

function fontCacheDir(family: string): string {
  const slug = normalizeLabelFontFamily(family)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return path.resolve(env.upload.dir, 'font-cache', slug || 'montserrat');
}

function bundledFontKey(family: string): string | null {
  const key = normalizeLabelFontFamily(family).toLowerCase();
  return BUNDLED_FONT_FILES[key] ? key : null;
}

export interface GoogleFontFiles {
  regularPath: string;
  boldPath: string;
}

function bundledFontPaths(family: string): GoogleFontFiles | null {
  const key = bundledFontKey(family);
  if (!key) return null;
  const files = BUNDLED_FONT_FILES[key];
  const regularPath = path.join(process.cwd(), 'assets', 'fonts', files.regular);
  const boldPath = path.join(process.cwd(), 'assets', 'fonts', files.bold);
  if (!fs.existsSync(regularPath) || !fs.existsSync(boldPath)) return null;
  return { regularPath, boldPath };
}

function parseFontWeightUrls(css: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const block of css.split('@font-face')) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const urlMatch = block.match(/url\((https:\/\/[^)]+)\)/);
    if (weightMatch && urlMatch) {
      map.set(parseInt(weightMatch[1], 10), urlMatch[1]);
    }
  }
  return map;
}

async function fetchGoogleFontCss(family: string): Promise<string> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;600;700&display=swap`;
  const res = await axios.get<string>(cssUrl, {
    headers: { 'User-Agent': TTF_USER_AGENT },
    timeout: 20000,
    responseType: 'text',
  });
  return res.data;
}

async function downloadFontBuffer(url: string): Promise<Buffer> {
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(res.data);
}

export async function ensureGoogleFontFiles(family: string): Promise<GoogleFontFiles> {
  const normalized = normalizeLabelFontFamily(family);
  const bundled = bundledFontPaths(normalized);
  if (bundled) return bundled;

  const dir = fontCacheDir(normalized);
  const regularPath = path.join(dir, 'regular.ttf');
  const boldPath = path.join(dir, 'bold.ttf');

  if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
    return { regularPath, boldPath };
  }

  const css = await fetchGoogleFontCss(normalized);
  const urls = parseFontWeightUrls(css);
  const regularUrl = urls.get(400);
  const boldUrl = urls.get(700) || urls.get(600) || regularUrl;
  if (!regularUrl || !boldUrl) {
    throw new Error(`Google Font "${normalized}" could not be downloaded`);
  }

  const [regular, bold] = await Promise.all([
    downloadFontBuffer(regularUrl),
    downloadFontBuffer(boldUrl),
  ]);

  await fs.promises.mkdir(dir, { recursive: true });
  await Promise.all([
    fs.promises.writeFile(regularPath, regular),
    fs.promises.writeFile(boldPath, bold),
  ]);

  return { regularPath, boldPath };
}

export async function listGoogleFontFamilies(search = '', limit = 40): Promise<string[]> {
  if (!cachedFontFamilies) {
    const res = await axios.get<string>(GOOGLE_FONTS_METADATA_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000,
      responseType: 'text',
    });
    const json = JSON.parse(res.data.replace(/^\)\]\}'\n?/, '')) as {
      familyMetadataList?: Array<{ family: string }>;
    };
    cachedFontFamilies = (json.familyMetadataList || [])
      .map((item) => item.family)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  const bundled = [DEFAULT_LABEL_FONT];
  const q = search.trim().toLowerCase();

  if (!q) {
    const google = cachedFontFamilies.filter((family) => family !== DEFAULT_LABEL_FONT).slice(0, limit - 1);
    return [...bundled, ...google];
  }

  const matches = cachedFontFamilies.filter((family) => family.toLowerCase().includes(q));
  const withBundled = DEFAULT_LABEL_FONT.toLowerCase().includes(q)
    ? [DEFAULT_LABEL_FONT, ...matches.filter((family) => family !== DEFAULT_LABEL_FONT)]
    : matches;
  return withBundled.slice(0, limit);
}
