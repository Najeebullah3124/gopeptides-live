import { body, param, query } from 'express-validator';

export const productIdValidator = [param('productId').isString().isLength({ min: 1 })];
export const reviewIdValidator = [param('id').isString().isLength({ min: 1 })];

export const listProductReviewsValidator = [
  ...productIdValidator,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

export const createReviewValidator = [
  body('productId').isString().isLength({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 }).toInt(),
  body('title').isString().isLength({ min: 1, max: 120 }),
  body('body').isString().isLength({ min: 10, max: 2000 }),
  body('guestName').optional({ values: 'falsy' }).isString().isLength({ max: 60 }),
  body('guestEmail').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
];

export const adminListReviewsValidator = [
  query('approved').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
];
