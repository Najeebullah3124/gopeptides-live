import { Response } from 'express';

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string> | Array<{ field?: string; message: string }>;
  code?: string;
}

export function ok<T>(res: Response, data: T, message?: string, meta?: Record<string, unknown>): Response {
  const body: SuccessResponse<T> = { success: true, data };
  if (message) body.message = message;
  if (meta) body.meta = meta;
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T, message?: string): Response {
  const body: SuccessResponse<T> = { success: true, data };
  if (message) body.message = message;
  return res.status(201).json(body);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function fail(
  res: Response,
  status: number,
  message: string,
  errors?: ErrorResponse['errors'],
  code?: string,
): Response {
  const body: ErrorResponse = { success: false, message };
  if (errors) body.errors = errors;
  if (code) body.code = code;
  return res.status(status).json(body);
}

export class ApiError extends Error {
  status: number;
  errors?: ErrorResponse['errors'];
  code?: string;

  constructor(status: number, message: string, errors?: ErrorResponse['errors'], code?: string) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.code = code;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, errors?: ErrorResponse['errors']): ApiError {
    return new ApiError(400, message, errors, 'BAD_REQUEST');
  }
  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, undefined, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, undefined, 'FORBIDDEN');
  }
  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message, undefined, 'NOT_FOUND');
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, message, undefined, 'CONFLICT');
  }
  static unprocessable(message: string, errors?: ErrorResponse['errors']): ApiError {
    return new ApiError(422, message, errors, 'UNPROCESSABLE');
  }
  static tooMany(message = 'Too many requests'): ApiError {
    return new ApiError(429, message, undefined, 'RATE_LIMITED');
  }
  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, undefined, 'INTERNAL');
  }
}
