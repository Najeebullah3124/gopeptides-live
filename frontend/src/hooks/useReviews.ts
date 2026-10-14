import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '@/services/reviewService';
import { useUiStore } from '@/stores/uiStore';
import { useLangStore } from '@/stores/langStore';
import { extractErrorMessage } from '@/services/api';
import type { ReviewInput } from '@/types/review';

export function useProductReviews(productId: string | undefined, page = 1) {
  const lang = useLangStore((s) => s.lang);
  return useQuery({
    queryKey: ['reviews', 'product', productId, page, lang],
    queryFn: () => reviewService.listForProduct(productId as string, page, 10, lang),
    enabled: !!productId,
    staleTime: 60_000,
  });
}

export function useCreateReview() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewInput) => reviewService.create(payload),
    onSuccess: (_, vars) => {
      toast('Review submitted — awaiting moderation', 'success');
      qc.invalidateQueries({ queryKey: ['reviews', 'product', vars.productId] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useAdminReviews(approved: boolean | null, page: number) {
  return useQuery({
    queryKey: ['admin', 'reviews', approved, page],
    queryFn: () => reviewService.adminList(approved, page),
    staleTime: 30_000,
  });
}

export function useApproveReview() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast('Review approved', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useUnapproveReview() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewService.unapprove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast('Review unapproved', 'info');
    },
  });
}

export function useDeleteReview() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast('Review deleted', 'info');
    },
  });
}
