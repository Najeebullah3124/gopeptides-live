import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/authService';
import { cartService } from '@/services/cartService';
import { wishlistService } from '@/services/wishlistService';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { extractErrorMessage } from '@/services/api';
import type { LoginPayload, RegisterPayload } from '@/types/user';

export function useMe() {
  const token = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const user = await authService.me();
        setUser(user);
        return user;
      } catch (err) {
        clear();
        throw err;
      }
    },
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useUiStore((s) => s.toast);
  const { t } = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: async (data) => {
      setSession(data.user, data.accessToken);
      
      // Sync local cart and wishlist
      const cartItems = useCartStore.getState().items;
      const wishlistIds = useWishlistStore.getState().ids;
      for (const item of cartItems) {
        try { await cartService.add(item.productId, item.quantity); } catch (e) {}
      }
      if (cartItems.length > 0) useCartStore.getState().clear();
      for (const id of wishlistIds) {
        try { await wishlistService.add(id); } catch (e) {}
      }
      if (wishlistIds.length > 0) useWishlistStore.getState().clear();

      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast(t('toast.welcomeBack', { name: data.user.firstName }), 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useUiStore((s) => s.toast);
  const { t } = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: async (data) => {
      setSession(data.user, data.accessToken);

      // Sync local cart and wishlist
      const cartItems = useCartStore.getState().items;
      const wishlistIds = useWishlistStore.getState().ids;
      for (const item of cartItems) {
        try { await cartService.add(item.productId, item.quantity); } catch (e) {}
      }
      if (cartItems.length > 0) useCartStore.getState().clear();
      for (const id of wishlistIds) {
        try { await wishlistService.add(id); } catch (e) {}
      }
      if (wishlistIds.length > 0) useWishlistStore.getState().clear();

      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast(t('toast.accountCreated'), 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const toast = useUiStore((s) => s.toast);
  const { t } = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clear();
      qc.clear();
      toast(t('toast.loggedOut'), 'info');
    },
  });
}

export function useForgotPassword() {
  const toast = useUiStore((s) => s.toast);
  const { t } = useT();
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => toast(t('toast.resetSent'), 'success'),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useVerifyEmail() {
  const toast = useUiStore((s) => s.toast);
  return useMutation({
    mutationFn: (data: { email: string; code: string }) => authService.verifyEmail(data.email, data.code),
    onSuccess: () => toast('Email verified successfully.', 'success'),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useResendVerification() {
  const toast = useUiStore((s) => s.toast);
  return useMutation({
    mutationFn: (email: string) => authService.resendVerification(email),
    onSuccess: () => toast('Verification code sent.', 'success'),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useResetPassword() {
  const toast = useUiStore((s) => s.toast);
  return useMutation({
    mutationFn: (data: { email: string; code: string; password: string }) => authService.resetPassword(data.email, data.code, data.password),
    onSuccess: () => toast('Password updated successfully. Please log in.', 'success'),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}
