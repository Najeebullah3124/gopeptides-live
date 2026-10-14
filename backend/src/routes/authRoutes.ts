import { Router } from 'express';
import {
  forgotPassword,
  login,
  logout,
  me,
  refreshToken,
  register,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validateRequest';
import {
  forgotPasswordValidator,
  loginValidator,
  registerValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  resendVerificationValidator,
} from '../validators/authValidators';

const router = Router();

router.post('/register', authLimiter, validate(registerValidator), register);
router.post('/login', authLimiter, validate(loginValidator), login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordValidator), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordValidator), resetPassword);
router.post('/verify-email', validate(verifyEmailValidator), verifyEmail);
router.post('/resend-verification', validate(resendVerificationValidator), resendVerification);
router.get('/me', requireAuth, me);

export default router;
