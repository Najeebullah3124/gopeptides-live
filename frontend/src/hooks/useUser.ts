import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { extractErrorMessage } from '@/services/api';
import type { Address, AddressInput } from '@/types/address';
import type { User } from '@/types/user';

export function useProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const u = await userService.getProfile();
      setUser(u);
      return u;
    },
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'>>) =>
      userService.updateProfile(payload),
    onSuccess: (u) => {
      setUser(u);
      qc.invalidateQueries({ queryKey: ['user'] });
      toast('Profile updated', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useChangePassword() {
  const toast = useUiStore((s) => s.toast);
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userService.changePassword(currentPassword, newPassword),
    onSuccess: () => toast('Password updated', 'success'),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => userService.listAddresses(),
    staleTime: 60_000,
  });
}

export function useCreateAddress() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddressInput) => userService.createAddress(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast('Address saved', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useUpdateAddress() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddressInput }) =>
      userService.updateAddress(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast('Address updated', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useDeleteAddress() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast('Address removed', 'info');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export type { Address };
