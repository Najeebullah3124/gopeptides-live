import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiResponse';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'ADMIN') return next(ApiError.forbidden('Admin access required'));
  next();
}
