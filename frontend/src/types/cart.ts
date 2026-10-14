import type { Product } from './product';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  updatedAt: string;
  summary: {
    itemCount: number;
    subtotal: number;
  };
}

export interface LocalCartItem {
  productId: string;
  quantity: number;
  snapshot: {
    name: string;
    price: number;
    image: string | null;
    slug: string;
    weight: string;
    stock: number;
  };
}
