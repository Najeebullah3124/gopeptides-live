import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '@/services/wishlistService';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { extractErrorMessage } from '@/services/api';

export function useWishlist() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.list(),
    enabled: !!token,
    staleTime: 60_000,
  });
}

/** Single source for header badge / counts — remote when logged in, local otherwise. */
export function useWishlistCount() {
  const user = useAuthStore((s) => s.user);
  const localCount = useWishlistStore((s) => s.ids.length);
  const { data: remote } = useWishlist();
  if (!user) return localCount;
  return remote?.length ?? 0;
}

export function useAddToWishlist() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistService.add(productId),
    onSuccess: (_data, productId) => {
      // Keep local mirror in sync so UI never drifts if token/user flicker
      const ids = useWishlistStore.getState().ids;
      if (!ids.includes(productId)) useWishlistStore.setState({ ids: [...ids, productId] });
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useRemoveFromWishlist() {
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => wishlistService.remove(productId),
    onSuccess: (_data, productId) => {
      useWishlistStore.getState().remove(productId);
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
}

export function useWishlistStatus(productId: string) {
  const user = useAuthStore((s) => s.user);
  const localWishlist = useWishlistStore((s) => s.ids);
  const { data: remoteWishlist } = useWishlist();

  if (!user) return localWishlist.includes(productId);
  // Prefer remote; fall back to local mirror while remote loads
  if (remoteWishlist) return remoteWishlist.some((w) => w.productId === productId);
  return localWishlist.includes(productId);
}

export function useToggleWishlist() {
  const user = useAuthStore((s) => s.user);
  const localToggle = useWishlistStore((s) => s.toggle);
  const add = useAddToWishlist();
  const remove = useRemoveFromWishlist();
  const { data: remoteWishlist } = useWishlist();
  const localIds = useWishlistStore((s) => s.ids);

  return (productId: string) => {
    if (!user) {
      localToggle(productId);
      return;
    }
    const inRemote = remoteWishlist?.some((w) => w.productId === productId);
    const inLocal = localIds.includes(productId);
    if (inRemote || (!remoteWishlist && inLocal)) {
      remove.mutate(productId);
    } else {
      add.mutate(productId);
    }
  };
}
