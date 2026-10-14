import { api, unwrap } from './api';
import type { Product } from '@/types/product';

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export const wishlistService = {
  list(): Promise<WishlistItem[]> {
    return unwrap(api.get('/wishlist'));
  },
  add(productId: string): Promise<WishlistItem> {
    return unwrap(api.post('/wishlist/add', { productId }));
  },
  remove(productId: string): Promise<unknown> {
    return api.delete(`/wishlist/remove/${productId}`);
  },
};
