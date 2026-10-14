import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';
export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export type ModalKind = null | 'login' | 'register' | 'forgot' | 'product';
export interface UiState {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  modal: ModalKind;
  modalData: unknown;
  openModal: (kind: ModalKind, data?: unknown) => void;
  closeModal: () => void;
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
  flashProductId: string | null;
  flash: (productId: string) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  cartOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  modal: null,
  modalData: null,
  openModal: (kind, data) => set({ modal: kind, modalData: data ?? null }),
  closeModal: () => set({ modal: null, modalData: null }),
  toasts: [],
  toast: (message, variant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, message, variant }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  flashProductId: null,
  flash: (productId) => {
    set({ flashProductId: productId });
    setTimeout(() => {
      if (get().flashProductId === productId) set({ flashProductId: null });
    }, 900);
  },
}));
