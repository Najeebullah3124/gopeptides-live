import { body, param } from 'express-validator';

export const addToCartValidator = [
  body('productId').isString().isLength({ min: 1 }),
  body('quantity').isInt({ min: 1, max: 99 }).toInt(),
];

export const updateCartValidator = [
  body('itemId').isString().isLength({ min: 1 }),
  body('quantity').isInt({ min: 1, max: 99 }).toInt(),
];

export const itemIdValidator = [param('itemId').isString().isLength({ min: 1 })];
