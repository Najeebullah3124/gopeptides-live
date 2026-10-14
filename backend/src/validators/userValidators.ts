import { body, param } from 'express-validator';

export const updateProfileValidator = [
  body('firstName').optional().isString().isLength({ min: 1, max: 50 }),
  body('lastName').optional().isString().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
];

export const changePasswordValidator = [
  body('currentPassword').isString().isLength({ min: 1 }).withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),
];

export const addressValidator = [
  body('firstName').isString().isLength({ min: 1, max: 50 }),
  body('lastName').isString().isLength({ min: 1, max: 50 }),
  body('street').isString().isLength({ min: 1, max: 200 }),
  body('city').isString().isLength({ min: 1, max: 80 }),
  body('postalCode').isString().isLength({ min: 1, max: 20 }),
  body('country').isString().isLength({ min: 2, max: 60 }),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
  body('isDefault').optional().isBoolean(),
];

export const addressIdValidator = [param('id').isString().isLength({ min: 1 })];
