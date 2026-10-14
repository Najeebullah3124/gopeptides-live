import { body, param } from 'express-validator';

export const validateCouponValidator = [
  body('code').isString().isLength({ min: 1, max: 40 }),
  body('subtotal').isFloat({ min: 0 }),
  body('email').optional().isEmail(),
];

export const createCouponValidator = [
  body('code').isString().isLength({ min: 1, max: 40 }).toUpperCase(),
  body('discount').isFloat({ min: 0 }),
  body('type').isIn(['percent', 'fixed']),
  body('minOrder').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('maxUses').optional({ values: 'null' }).isInt({ min: 1 }),
  body('expiresAt').optional({ values: 'null' }).isISO8601(),
  body('isActive').optional().isBoolean(),
  body('oncePerUser').optional().isBoolean(),
];

export const couponIdValidator = [param('id').isString().isLength({ min: 1 })];
