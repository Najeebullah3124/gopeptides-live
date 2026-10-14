import { Router } from 'express';
import { body } from 'express-validator';
import { submit } from '../controllers/contactController';
import { contactLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validateRequest';

const router = Router();

router.post(
  '/',
  contactLimiter,
  validate([
    body('name').isString().isLength({ min: 1, max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('subject').isString().isLength({ min: 1, max: 120 }),
    body('message').isString().isLength({ min: 5, max: 2000 }),
  ]),
  submit,
);

export default router;
