import { Router } from 'express';
import {
  adminCreate,
  adminDelete,
  adminList,
  adminUpdate,
  validateCoupon,
} from '../controllers/couponController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validate } from '../middleware/validateRequest';
import {
  couponIdValidator,
  createCouponValidator,
  validateCouponValidator,
} from '../validators/couponValidators';

const router = Router();

router.post('/validate', optionalAuth, validate(validateCouponValidator), validateCoupon);

router.get('/', requireAuth, requireAdmin, adminList);
router.post('/', requireAuth, requireAdmin, validate(createCouponValidator), adminCreate);
router.put('/:id', requireAuth, requireAdmin, validate(couponIdValidator), adminUpdate);
router.delete('/:id', requireAuth, requireAdmin, validate(couponIdValidator), adminDelete);

export default router;
