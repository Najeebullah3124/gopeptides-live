import { Router } from 'express';
import {
  byCategory,
  createProduct,
  deleteProduct,
  deleteProductImage,
  featured,
  getBySlug,
  labResults,
  list,
  listCategories,
  related,
  reorderProductImages,
  updateProduct,
  uploadImages,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/productController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { upload } from '../middleware/uploadMiddleware';
import { validate } from '../middleware/validateRequest';
import {
  createProductValidator,
  idValidator,
  listProductsValidator,
  slugValidator,
  updateProductValidator,
} from '../validators/productValidators';

const router = Router();

router.get('/', validate(listProductsValidator), list);
router.get('/featured', featured);
router.get('/lab-results', labResults);
router.get('/categories', listCategories);
router.get('/category/:slug', validate(slugValidator), byCategory);
router.get('/:id/related', validate(idValidator), related);
router.get('/:slug', validate(slugValidator), getBySlug);

router.post('/', requireAuth, requireAdmin, validate(createProductValidator), createProduct);
router.put('/:id', requireAuth, requireAdmin, validate(updateProductValidator), updateProduct);
router.delete('/:id', requireAuth, requireAdmin, validate(idValidator), deleteProduct);
router.post('/:id/images', requireAuth, requireAdmin, validate(idValidator), upload.array('images', 8), uploadImages);
router.delete('/:productId/images/:imageId', requireAuth, requireAdmin, deleteProductImage);
router.put('/:productId/images/reorder', requireAuth, requireAdmin, reorderProductImages);

// Category admin CRUD
router.post('/admin/categories', requireAuth, requireAdmin, createCategory);
router.put('/admin/categories/:id', requireAuth, requireAdmin, updateCategory);
router.delete('/admin/categories/:id', requireAuth, requireAdmin, deleteCategory);

export default router;
