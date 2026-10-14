import { Router } from 'express';
import {
  listPosts,
  getPostBySlug,
  listCategories,
  adminListPosts,
  adminGetPost,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminUploadImage,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from '../controllers/blogController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// Public routes
router.get('/categories', listCategories);
router.get('/', listPosts);

// Admin routes
router.get('/admin/posts', requireAuth, requireAdmin, adminListPosts);
router.get('/admin/posts/:id', requireAuth, requireAdmin, adminGetPost);
router.post('/admin/posts', requireAuth, requireAdmin, adminCreatePost);
router.put('/admin/posts/:id', requireAuth, requireAdmin, adminUpdatePost);
router.delete('/admin/posts/:id', requireAuth, requireAdmin, adminDeletePost);
router.post('/admin/posts/upload-image', requireAuth, requireAdmin, upload.single('image'), adminUploadImage);

router.post('/admin/categories', requireAuth, requireAdmin, adminCreateCategory);
router.put('/admin/categories/:id', requireAuth, requireAdmin, adminUpdateCategory);
router.delete('/admin/categories/:id', requireAuth, requireAdmin, adminDeleteCategory);

router.get('/:slug', getPostBySlug);

export default router;
