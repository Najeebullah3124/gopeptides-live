import { body } from 'express-validator';

export const registerValidator = [
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
];

export const forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const verifyEmailValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('code').isString().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code is required'),
];

export const resendVerificationValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

export const resetPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('code').isString().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),
];

export const changePasswordValidator = [
  body('currentPassword').isString().isLength({ min: 1 }),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .matches(/[0-9]/),
];
