import { Router } from 'express';
import { body } from 'express-validator';
import { subscribe } from '../controllers/subscriberController';
import { contactLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validateRequest';

const router = Router();

router.post(
  '/',
  contactLimiter,
  validate([
    body('email').isEmail().normalizeEmail(),
    body('name').optional().isString().isLength({ max: 80 }),
  ]),
  subscribe,
);

export default router;
