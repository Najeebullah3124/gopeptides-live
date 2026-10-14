import { api, unwrap } from './api';
import type { Cart } from '@/types/cart';

export const cartService = {
  get(): Promise<Cart> {
    return unwrap(api.get('/cart'));
  },
  add(productId: string, quantity: number): Promise<Cart> {
    return unwrap(api.post('/cart/add', { productId, quantity }));
  },
  update(itemId: string, quantity: number): Promise<Cart> {
    return unwrap(api.put('/cart/update', { itemId, quantity }));
  },
  remove(itemId: string): Promise<unknown> {
    return api.delete(`/cart/remove/${itemId}`);
  },
  clear(): Promise<unknown> {
    return api.delete('/cart/clear');
  },
};
