import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function parsePagination(req: Request, defaults = { page: 1, limit: 12, maxLimit: 100 }): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page || defaults.page), 10) || defaults.page);
  const rawLimit = parseInt(String(req.query.limit || defaults.limit), 10) || defaults.limit;
  const limit = Math.min(defaults.maxLimit, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(params: PaginationParams, totalCount: number): PaginatedMeta {
  const totalPages = Math.max(1, Math.ceil(totalCount / params.limit));
  return {
    page: params.page,
    limit: params.limit,
    totalCount,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}
