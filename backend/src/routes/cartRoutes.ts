import { Router } from 'express';
import { addItem, clearCart, getCart, removeItem, updateItem } from '../controllers/cartController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validateRequest';
import { addToCartValidator, itemIdValidator, updateCartValidator } from '../validators/cartValidators';

const router = Router();

router.use(requireAuth);

router.get('/', getCart);
router.post('/add', validate(addToCartValidator), addItem);
router.put('/update', validate(updateCartValidator), updateItem);
router.delete('/remove/:itemId', validate(itemIdValidator), removeItem);
router.delete('/clear', clearCart);

export default router;
