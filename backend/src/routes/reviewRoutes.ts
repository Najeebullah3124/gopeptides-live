import { Router } from 'express';
import {
  adminList,
  approve,
  create,
  googleSummary,
  listApproved,
  listForProduct,
  remove,
  unapprove,
  getGoogleMeta,
} from '../controllers/reviewController';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validate } from '../middleware/validateRequest';
import {
  adminListReviewsValidator,
  createReviewValidator,
  listProductReviewsValidator,
  reviewIdValidator,
} from '../validators/reviewValidators';

const router = Router();

router.get('/approved', listApproved);
router.get('/google-summary', googleSummary);
router.get('/google-meta', getGoogleMeta);
router.get('/product/:productId', validate(listProductReviewsValidator), listForProduct);
router.post('/', optionalAuth, validate(createReviewValidator), create);

router.get('/admin', requireAuth, requireAdmin, validate(adminListReviewsValidator), adminList);
router.get('/', requireAuth, requireAdmin, validate(adminListReviewsValidator), adminList);
router.put('/:id/approve', requireAuth, requireAdmin, validate(reviewIdValidator), approve);
router.put('/:id/unapprove', requireAuth, requireAdmin, validate(reviewIdValidator), unapprove);
router.delete('/:id', requireAuth, requireAdmin, validate(reviewIdValidator), remove);

export default router;
