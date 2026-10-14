import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError, fail } from '../utils/apiResponse';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, undefined, 'NOT_FOUND');
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Always log errors to console for troubleshooting
  console.error('[error]', err);

  if (err instanceof ApiError) {
    fail(res, err.status, err.message, err.errors, err.code);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') || 'field';
        fail(res, 409, `Duplicate value for ${target}`, undefined, 'DUPLICATE');
        return;
      }
      case 'P2025':
        fail(res, 404, 'Record not found', undefined, 'NOT_FOUND');
        return;
      case 'P2003':
        fail(res, 400, 'Foreign key constraint failed', undefined, 'FK_FAILED');
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    fail(res, 400, 'Database validation error', undefined, 'DB_VALIDATION');
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    fail(res, 400, 'Invalid JSON body', undefined, 'BAD_JSON');
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Internal server error';

  fail(
    res,
    500,
    env.isProduction ? 'Internal server error' : message,
    undefined,
    'INTERNAL',
  );
}
