import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError, created, noContent, ok } from '../utils/apiResponse';
import { buildMeta, parsePagination } from '../utils/pagination';
import { cache } from '../services/cacheService';
import { env } from '../config/env';

const REVIEW_SELECT = {
  id: true,
  productId: true,
  rating: true,
  title: true,
  body: true,
  translations: true,
  verified: true,
  approved: true,
  createdAt: true,
  guestName: true,
  user: { select: { firstName: true, lastName: true } },
  product: { select: { name: true, slug: true } },
} as const;

// ─── Review translation helpers (same pattern as productController) ──────────
type ReviewLang = 'nl' | 'de';
interface ReviewLangOverride { title?: string; body?: string }

async function gtxTranslate(text: string, target: string, source = 'en'): Promise<string> {
  if (!text.trim()) return '';
  const { data } = await axios.get('https://translate.googleapis.com/translate_a/single', {
    params: { client: 'gtx', sl: source, tl: target, dt: 't', q: text },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const chunks: string[][] = data[0];
  return chunks.map((c) => c[0] ?? '').join('');
}

function parseReviewTranslations(raw: string): Record<string, ReviewLangOverride> {
  try { return JSON.parse(raw) as Record<string, ReviewLangOverride>; } catch { return {}; }
}

/** Translate a single review's title/body into lang, caching the result back to the DB. */
async function resolveReviewLang(
  review: { id: string; title: string; body: string; translations: string },
  lang: ReviewLang,
): Promise<{ title: string; body: string }> {
  const stored = parseReviewTranslations(review.translations);
  if (stored[lang]?.title || stored[lang]?.body) {
    return { title: stored[lang].title ?? review.title, body: stored[lang].body ?? review.body };
  }
  try {
    const [title, body] = await Promise.all([
      gtxTranslate(review.title, lang),
      gtxTranslate(review.body, lang),
    ]);
    const updated = { ...stored, [lang]: { title, body } };
    prisma.review.update({ where: { id: review.id }, data: { translations: JSON.stringify(updated) } }).catch(() => {});
    return { title, body };
  } catch (err) {
    console.error(`[translate] review ${review.id} -> ${lang} failed:`, err);
    return { title: review.title, body: review.body };
  }
}

type SerializedReview = { id: string; title: string; body: string; translations: string } & Record<string, unknown>;

type GoogleReviewSummary = {
  name: string;
  rating: number;
  reviewCount: number;
  url: string;
  address: string;
  placeId: string;
  source: 'live' | 'fallback';
};

const GOOGLE_SUMMARY_CACHE_KEY = 'reviews:google-summary:v3';
const MAX_REASONABLE_GOOGLE_REVIEW_COUNT = 10_000;
const DEFAULT_PLACE_ID = 'ChIJP40W2xoLxkcR1VHaE5jeXLw';

/** Stable deep-link to this business's Google reviews (not a fragile share.google short link). */
export function googleBusinessReviewsUrl(placeId?: string | null): string {
  const id = (placeId || env.google.placeId || DEFAULT_PLACE_ID).trim();
  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(id)}`;
}

function fallbackGoogleSummary(): GoogleReviewSummary {
  const placeId = env.google.placeId || DEFAULT_PLACE_ID;
  return {
    name: 'GoPeptides',
    rating: 4.5,
    reviewCount: 2,
    url: googleBusinessReviewsUrl(placeId),
    address: env.google.placeAddress || 'Johan Cruijff Boulevard, 1101 Amsterdam, Netherlands',
    placeId,
    source: 'fallback',
  };
}

function fallbackGoogleMeta() {
  const fallback = fallbackGoogleSummary();
  return { ...fallback, userRatingCount: fallback.reviewCount, reviews: [] };
}

function isReasonableGoogleRating(rating: unknown, reviewCount: unknown): rating is number {
  return (
    typeof rating === 'number' &&
    Number.isFinite(rating) &&
    rating >= 1 &&
    rating <= 5 &&
    typeof reviewCount === 'number' &&
    Number.isFinite(reviewCount) &&
    reviewCount >= 0 &&
    reviewCount <= MAX_REASONABLE_GOOGLE_REVIEW_COUNT
  );
}

/** Apply language override to a list of reviews and strip the raw translations cache from output. */
async function localizeReviews(items: SerializedReview[], lang?: string): Promise<Array<Omit<SerializedReview, 'translations'>>> {
  const useLang = lang === 'nl' || lang === 'de' ? (lang as ReviewLang) : null;
  return Promise.all(
    items.map(async ({ translations, ...rest }) => {
      if (!useLang) return rest;
      const t = await resolveReviewLang({ id: rest.id, title: rest.title, body: rest.body, translations }, useLang);
      return { ...rest, ...t };
    }),
  );
}

export async function listForProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const lang = req.query.lang as string | undefined;
    const pagination = parsePagination(req, { page: 1, limit: 10, maxLimit: 50 });
    const where: Prisma.ReviewWhereInput = { productId, approved: true };
    const [items, totalCount, agg] = await Promise.all([
      prisma.review.findMany({
        where,
        select: REVIEW_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: { productId, approved: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    res.json({
      success: true,
      data: await localizeReviews(items as SerializedReview[], lang),
      meta: {
        ...buildMeta(pagination, totalCount),
        averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        reviewCount: agg._count.rating,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function googleSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cached = await cache.get<GoogleReviewSummary>(GOOGLE_SUMMARY_CACHE_KEY);
    if (cached) {
      ok(res, cached);
      return;
    }

    const fallback = fallbackGoogleSummary();
    if (!env.google.placesApiKey || !env.google.placeId) {
      await cache.set(GOOGLE_SUMMARY_CACHE_KEY, fallback, 3600);
      ok(res, fallback);
      return;
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', env.google.placeId);
    url.searchParams.set('fields', 'name,rating,user_ratings_total,url,formatted_address');
    url.searchParams.set('key', env.google.placesApiKey);

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'GoPeptides/1.0' },
    });

    if (!response.ok) {
      await cache.set(GOOGLE_SUMMARY_CACHE_KEY, fallback, 900);
      ok(res, fallback);
      return;
    }

    const payload = await response.json() as {
      status?: string;
      result?: {
        name?: string;
        rating?: number;
        user_ratings_total?: number;
        url?: string;
        formatted_address?: string;
      };
    };

    if (payload.status !== 'OK' || !payload.result) {
      await cache.set(GOOGLE_SUMMARY_CACHE_KEY, fallback, 900);
      ok(res, fallback);
      return;
    }

    const liveRating = Number(payload.result.rating);
    const liveCount = Number(payload.result.user_ratings_total);
    if (!isReasonableGoogleRating(liveRating, liveCount)) {
      await cache.set(GOOGLE_SUMMARY_CACHE_KEY, fallback, 900);
      ok(res, fallback);
      return;
    }

    const live: GoogleReviewSummary = {
      name: payload.result.name || fallback.name,
      rating: liveRating,
      reviewCount: liveCount,
      // Always use Place ID reviews deep-link — Maps `result.url` / share.google often open search/maps noise.
      url: googleBusinessReviewsUrl(env.google.placeId),
      address: payload.result.formatted_address || fallback.address,
      placeId: env.google.placeId,
      source: 'live',
    };

    await cache.set(GOOGLE_SUMMARY_CACHE_KEY, live, 3600);
    ok(res, live);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, rating, title, body: reviewBody, guestName, guestEmail } = req.body as {
      productId: string;
      rating: number;
      title: string;
      body: string;
      guestName?: string;
      guestEmail?: string;
    };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    let verified = false;
    if (req.user) {
      const purchased = await prisma.orderItem.findFirst({
        where: {
          productId,
          order: { userId: req.user.id, status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } },
        },
      });
      verified = !!purchased;

      const existing = await prisma.review.findFirst({ where: { productId, userId: req.user.id } });
      if (existing) throw ApiError.conflict('You have already reviewed this product');
    } else {
      if (!guestName || !guestEmail) throw ApiError.badRequest('Guest reviews require a name and email');
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user?.id,
        guestName: req.user ? null : guestName,
        guestEmail: req.user ? null : guestEmail,
        rating,
        title,
        body: reviewBody,
        verified,
        approved: false,
      },
      select: REVIEW_SELECT,
    });

    await cache.invalidateProducts();
    created(res, review, 'Review submitted — awaiting moderation');
  } catch (err) {
    next(err);
  }
}

export async function listApproved(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lang = req.query.lang as string | undefined;
    const pagination = parsePagination(req, { page: 1, limit: 12, maxLimit: 50 });
    const [items, totalCount, agg] = await Promise.all([
      prisma.review.findMany({
        where: { approved: true },
        select: REVIEW_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.review.count({ where: { approved: true } }),
      prisma.review.aggregate({ where: { approved: true }, _avg: { rating: true } }),
    ]);
    res.json({
      success: true,
      data: await localizeReviews(items as SerializedReview[], lang),
      meta: { ...buildMeta(pagination, totalCount), averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0 },
    });
  } catch (err) {
    next(err);
  }
}

export async function adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req, { page: 1, limit: 20, maxLimit: 100 });
    // adminListReviewsValidator applies .toBoolean(), so this is already a real
    // boolean (or undefined) here, not the string 'true'/'false'.
    const approved = req.query.approved as boolean | undefined;
    const where: Prisma.ReviewWhereInput = {};
    if (approved === true) where.approved = true;
    if (approved === false) where.approved = false;

    const [items, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        select: REVIEW_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ success: true, data: items, meta: buildMeta(pagination, totalCount) });
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const review = await prisma.review.update({
      where: { id },
      data: { approved: true },
      select: REVIEW_SELECT,
    });
    await cache.invalidateProducts();
    ok(res, review, 'Review approved');
  } catch (err) {
    next(err);
  }
}

export async function unapprove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const review = await prisma.review.update({
      where: { id },
      data: { approved: false },
      select: REVIEW_SELECT,
    });
    await cache.invalidateProducts();
    ok(res, review, 'Review unapproved');
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.review.delete({ where: { id } });
    await cache.invalidateProducts();
    noContent(res);
  } catch (err) {
    next(err);
  }
}


export async function getGoogleMeta(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.google.placesApiKey || !env.google.placeId) {
      return ok(res, fallbackGoogleMeta());
    }
    const url = `https://places.googleapis.com/v1/places/${env.google.placeId}?fields=reviews,rating,userRatingCount`;
    const response = await axios.get(url, {
      headers: { 'X-Goog-Api-Key': env.google.placesApiKey }
    });
    const fallback = fallbackGoogleMeta();
    const data = response.data as {
      rating?: number;
      reviewCount?: number;
      userRatingCount?: number;
      reviews?: unknown[];
    };
    const reviewCount = Number(data.reviewCount ?? data.userRatingCount ?? fallback.reviewCount);
    if (!isReasonableGoogleRating(data.rating, reviewCount)) {
      return ok(res, fallback);
    }
    return ok(res, {
      ...fallback,
      ...data,
      rating: Number(data.rating ?? fallback.rating),
      reviewCount,
      userRatingCount: reviewCount,
      source: 'live',
      reviews: data.reviews || [],
    });
  } catch (error) {
    console.error('Google Places API error:', error);
    return ok(res, fallbackGoogleMeta());
  }
}

