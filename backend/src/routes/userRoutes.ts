import { Router } from 'express';
import {
  changePassword,
  createAddress,
  deleteAddress,
  getProfile,
  listAddresses,
  updateAddress,
  updateProfile,
} from '../controllers/userController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validateRequest';
import {
  addressIdValidator,
  addressValidator,
  changePasswordValidator,
  updateProfileValidator,
} from '../validators/userValidators';

const router = Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileValidator), updateProfile);
router.put('/password', validate(changePasswordValidator), changePassword);

router.get('/addresses', listAddresses);
router.post('/addresses', validate(addressValidator), createAddress);
router.put('/addresses/:id', validate([...addressIdValidator, ...addressValidator]), updateAddress);
router.delete('/addresses/:id', validate(addressIdValidator), deleteAddress);

export default router;
