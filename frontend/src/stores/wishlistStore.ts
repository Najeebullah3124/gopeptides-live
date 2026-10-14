import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  ids: string[];
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  /** Drop ids that are no longer in the known product set (stale localStorage). */
  pruneMissing: (validIds: string[]) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids;
        set({ ids: ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId] });
      },
      remove: (productId) => set({ ids: get().ids.filter((id) => id !== productId) }),
      has: (productId) => get().ids.includes(productId),
      clear: () => set({ ids: [] }),
      pruneMissing: (validIds) => {
        const valid = new Set(validIds);
        const next = get().ids.filter((id) => valid.has(id));
        if (next.length !== get().ids.length) set({ ids: next });
      },
    }),
    { name: 'gp-wishlist' },
  ),
);
