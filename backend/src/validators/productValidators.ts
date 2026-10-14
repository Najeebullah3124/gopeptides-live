import { body, param, query } from 'express-validator';

export const listProductsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().isLength({ max: 100 }),
  query('category').optional().isString().isLength({ max: 60 }),
  query('sort').optional().isIn(['featured', 'price_asc', 'price_desc', 'newest', 'rating']),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('inStock').optional().isBoolean().toBoolean(),
  query('purity').optional().isString().isLength({ max: 30 }),
];

export const slugValidator = [param('slug').isString().isLength({ min: 1, max: 120 })];
export const idValidator = [param('id').isString().isLength({ min: 1, max: 60 })];

export const createProductValidator = [
  body('name').isString().isLength({ min: 1, max: 120 }),
  body('slug').isString().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with dashes'),
  body('description').isString().isLength({ min: 1 }),
  body('shortDesc').isString().isLength({ min: 1, max: 300 }),
  body('price').isFloat({ min: 0 }),
  body('comparePrice').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  body('sku').isString().isLength({ min: 1, max: 60 }),
  body('purity').isString().isLength({ min: 1, max: 30 }),
  body('weight').isString().isLength({ min: 1, max: 30 }),
  body('casNumber').isString().isLength({ min: 1, max: 30 }),
  body('categoryId').isString().isLength({ min: 1 }),
  body('badge').optional({ values: 'null' }).isString().isLength({ max: 30 }),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean(),
  body('sequence').optional({ values: 'null' }).isString().isLength({ max: 500 }),
  body('storage').optional({ values: 'null' }).isString().isLength({ max: 300 }),
  body('benefits').optional().isArray(),
  body('seoData').optional().isObject(),
];

export const updateProductValidator = [
  ...idValidator,
  body('name').optional().isString().isLength({ min: 1, max: 120 }),
  body('slug').optional().isString().matches(/^[a-z0-9-]+$/),
  body('description').optional().isString(),
  body('shortDesc').optional().isString().isLength({ max: 300 }),
  body('price').optional().isFloat({ min: 0 }),
  body('comparePrice').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('sku').optional().isString().isLength({ max: 60 }),
  body('purity').optional().isString(),
  body('weight').optional().isString(),
  body('casNumber').optional().isString(),
  body('categoryId').optional().isString(),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean(),
  body('benefits').optional().isArray(),
  body('seoData').optional().isObject(),
];
