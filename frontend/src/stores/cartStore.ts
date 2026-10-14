import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalCartItem } from '@/types/cart';

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface CartState {
  items: LocalCartItem[];
  appliedCoupon: AppliedCoupon | null;
  add: (item: LocalCartItem) => void;
  updateQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setItems: (items: LocalCartItem[]) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  count: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      add: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: Math.min(i.snapshot.stock, i.quantity + item.quantity) }
                : i,
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      updateQty: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(i.snapshot.stock, quantity) } : i,
          ),
        });
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      clear: () => set({ items: [], appliedCoupon: null }),
      setItems: (items) => set({ items }),
      setAppliedCoupon: (appliedCoupon) => set({ appliedCoupon }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((n, i) => n + i.quantity * i.snapshot.price, 0),
    }),
    { name: 'gp-cart' },
  ),
);
