import { body, param } from 'express-validator';

const addressSchema = [
  body('shippingAddress.firstName').isString().isLength({ min: 1, max: 50 }),
  body('shippingAddress.lastName').isString().isLength({ min: 1, max: 50 }),
  body('shippingAddress.street').isString().isLength({ min: 1, max: 200 }),
  body('shippingAddress.city').isString().isLength({ min: 1, max: 80 }),
  body('shippingAddress.postalCode').isString().isLength({ min: 1, max: 20 }),
  body('shippingAddress.country').isString().isLength({ min: 2, max: 60 }),
  body('shippingAddress.phone').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
];

const itemsSchema = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isString().isLength({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1, max: 99 }).toInt(),
];

export const createOrderValidator = [
  ...addressSchema,
  ...itemsSchema,
  body('couponCode').optional({ values: 'falsy' }).isString().isLength({ max: 30 }),
  body('notes').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
  body('paymentMethod').optional().isString().isLength({ max: 30 }),
  body('expressDelivery').optional().isBoolean().toBoolean(),
];

export const createGuestOrderValidator = [
  ...createOrderValidator,
  body('guestEmail').isEmail().withMessage('Valid guest email is required').normalizeEmail(),
];

export const orderIdValidator = [param('id').isString().isLength({ min: 1 })];

export const updateOrderStatusValidator = [
  ...orderIdValidator,
  body('status').isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed']),
];
