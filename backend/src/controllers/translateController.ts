import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { ApiError, ok } from '../utils/apiResponse';

// Free unofficial Google Translate endpoint — no API key required.
// Uses the same backend that powers translate.google.com.
async function translateText(text: string, target: string, source = 'en'): Promise<string> {
  if (!text.trim()) return '';

  const url = 'https://translate.googleapis.com/translate_a/single';
  const { data } = await axios.get(url, {
    params: { client: 'gtx', sl: source, tl: target, dt: 't', q: text },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  // Response: [ [ ["translated chunk", "original chunk"], ... ], ... ]
  const chunks: string[][] = data[0];
  return chunks.map((chunk) => chunk[0] ?? '').join('');
}

export async function autoTranslate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, excerpt, content, seoTitle, seoDescription, targetLang } = req.body as {
      title?: string;
      excerpt?: string;
      content?: string;
      seoTitle?: string;
      seoDescription?: string;
      targetLang: string;
    };

    if (!targetLang || !/^[a-z]{2,3}$/.test(targetLang)) {
      throw ApiError.badRequest('targetLang must be a valid 2-letter language code (e.g. "nl", "de", "fr")');
    }

    const [translatedTitle, translatedExcerpt, translatedContent, translatedSeoTitle, translatedSeoDesc] = await Promise.all([
      translateText(title || '', targetLang),
      translateText(excerpt || '', targetLang),
      translateText(content || '', targetLang),
      translateText(seoTitle || '', targetLang),
      translateText(seoDescription || '', targetLang),
    ]);

    ok(res, {
      title: translatedTitle,
      excerpt: translatedExcerpt,
      content: translatedContent,
      seoTitle: translatedSeoTitle,
      seoDescription: translatedSeoDesc,
      targetLang,
    });
  } catch (err) {
    next(err);
  }
}
