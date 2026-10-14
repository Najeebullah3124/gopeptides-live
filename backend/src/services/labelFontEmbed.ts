import fs from 'fs';
import path from 'path';
import {
  DEFAULT_LABEL_FONT,
  ensureGoogleFontFiles,
  normalizeLabelFontFamily,
  toSvgFontToken,
} from './googleFontService';

export interface LabelFontContext {
  styleBlock: string;
  family: (googleFamily: string) => string;
}

/** Write font files beside SVG so librsvg/sharp can load them (base64 @font-face fails). */
export async function prepareLabelFontContext(
  workDir: string,
  families: Iterable<string>
): Promise<LabelFontContext> {
  const unique = [...new Set([...families].map((family) => normalizeLabelFontFamily(family)))];
  const tokenByFamily = new Map<string, string>();
  const rules: string[] = [];

  let idx = 0;
  for (const family of unique) {
    const token = toSvgFontToken(family);
    tokenByFamily.set(family, token);

    const { regularPath, boldPath } = await ensureGoogleFontFiles(family);
    const regularName = `font-${idx}-regular.ttf`;
    const boldName = `font-${idx}-bold.ttf`;
    await fs.promises.copyFile(regularPath, path.join(workDir, regularName));
    await fs.promises.copyFile(boldPath, path.join(workDir, boldName));

    rules.push(
      `@font-face { font-family: '${token}'; font-weight: 400; font-style: normal; src: url('${regularName}') format('truetype'); }`,
      `@font-face { font-family: '${token}'; font-weight: 700; font-style: normal; src: url('${boldName}') format('truetype'); }`,
      `@font-face { font-family: '${token}'; font-weight: 800; font-style: normal; src: url('${boldName}') format('truetype'); }`
    );
    idx += 1;
  }

  const styleBlock = rules.length
    ? `<style type="text/css"><![CDATA[\n${rules.join('\n')}\n]]></style>`
    : '';

  return {
    styleBlock,
    family: (googleFamily: string) => {
      const normalized = normalizeLabelFontFamily(googleFamily);
      return tokenByFamily.get(normalized) || toSvgFontToken(DEFAULT_LABEL_FONT);
    },
  };
}
