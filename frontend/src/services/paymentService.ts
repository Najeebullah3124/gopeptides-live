import { api, unwrap } from './api';
import type { Order } from '@/types/order';

export const paymentService = {
  createIntent(orderId: string): Promise<{ clientSecret: string; publishableKey: string }> {
    return unwrap(api.post('/payments/create-intent', { orderId }));
  },
  confirm(paymentIntentId: string): Promise<{ status: string; orderId: string; order?: Order }> {
    return unwrap(api.post('/payments/confirm', { paymentIntentId }));
  },
  confirmWallid(orderId: string): Promise<{ status: string; orderId: string; order?: Order }> {
    return unwrap(api.post('/payments/wallid/confirm', { orderId }));
  },
  confirmEcomtrade(orderId: string): Promise<{ status: string; orderId: string; order?: Order }> {
    return unwrap(api.post('/payments/ecomtrade24/confirm', { orderId }));
  },
};
