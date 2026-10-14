import { Router } from 'express';
import { add, list, remove } from '../controllers/wishlistController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', list);
router.post('/add', add);
router.delete('/remove/:productId', remove);

export default router;
