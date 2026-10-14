import { Router } from 'express';
import { confirmPayment, createIntent, stripeWebhook, nowpaymentsWebhook, confirmWallidPayment, confirmEcomtradePayment } from '../controllers/paymentController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/create-intent', optionalAuth, createIntent);
router.post('/confirm', optionalAuth, confirmPayment);
// Stripe + Wallid + EcomTrade24 webhooks are mounted with raw body in app.ts BEFORE express.json
router.post('/webhook', stripeWebhook);
router.post('/wallid/confirm', optionalAuth, confirmWallidPayment);
router.post('/ecomtrade24/confirm', optionalAuth, confirmEcomtradePayment);
router.post('/nowpayments-webhook', nowpaymentsWebhook);

export default router;
