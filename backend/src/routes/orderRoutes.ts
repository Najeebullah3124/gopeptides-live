import { Router } from 'express';
import {
  createGuestOrder,
  createOrder,
  getOrder,
  listAllOrders,
  myOrders,
  printOrderLabel,
  updateOrderStatus,
} from '../controllers/orderController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validate } from '../middleware/validateRequest';
import {
  createGuestOrderValidator,
  createOrderValidator,
  orderIdValidator,
  updateOrderStatusValidator,
} from '../validators/orderValidators';

const router = Router();

router.post('/guest', validate(createGuestOrderValidator), createGuestOrder);

router.post('/', requireAuth, validate(createOrderValidator), createOrder);
router.get('/my-orders', requireAuth, myOrders);
router.get('/', requireAuth, requireAdmin, listAllOrders);
router.get('/:id', requireAuth, validate(orderIdValidator), getOrder);
router.put('/:id/status', requireAuth, requireAdmin, validate(updateOrderStatusValidator), updateOrderStatus);
router.post('/:id/print-label', requireAuth, requireAdmin, printOrderLabel);

export default router;
