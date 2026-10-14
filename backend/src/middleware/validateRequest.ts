import { NextFunction, Request, Response } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/apiResponse';

export function validate(chains: ValidationChain[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    for (const chain of chains) {
      await chain.run(req);
    }
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array().map((e) => ({
      field: 'path' in e ? (e as { path: string }).path : undefined,
      message: e.msg as string,
    }));
    next(ApiError.unprocessable('Validation failed', errors));
  };
}
