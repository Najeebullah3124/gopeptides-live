import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

// Public route to fetch settings (needed by frontend app initialization)
router.get('/', getSettings);

// Admin route to update settings
router.put('/', requireAuth, requireAdmin, updateSettings);

export default router;
