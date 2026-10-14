import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService, CreateOrderInput } from '@/services/orderService';
import { extractErrorMessage } from '@/services/api';
import { useUiStore } from '@/stores/uiStore';
import { useCartStore } from '@/stores/cartStore';
import type { OrderStatus } from '@/types/order';

export function useMyOrders(page = 1, status?: OrderStatus) {
  return useQuery({
    queryKey: ['orders', 'mine', page, status],
    queryFn: () => orderService.myOrders(page, status),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.get(id as string),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateOrder(guest = false) {
  const toast = useUiStore((s) => s.toast);
  const clearCart = useCartStore((s) => s.clear);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderInput) =>
      guest ? orderService.createGuest(payload) : orderService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}
