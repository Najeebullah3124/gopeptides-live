import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useCartStore } from '@/stores/cartStore';
import { useWishlist, useRemoveFromWishlist } from '@/hooks/useWishlist';
import { useProducts } from '@/hooks/useProducts';
import { useSEO } from '@/hooks/useSEO';
import { useT } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProductImage } from '@/components/product/ProductImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { productImage } from '@/utils/helpers';
import type { Product } from '@/types/product';

export default function WishlistPage() {
  const { t } = useT();
  useSEO({ title: t('wishlist.title'), description: t('wishlist.empty.desc') });
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const localIds = useWishlistStore((s) => s.ids);
  const localRemove = useWishlistStore((s) => s.remove);
  const pruneMissing = useWishlistStore((s) => s.pruneMissing);
  const add = useCartStore((s) => s.add);
  const remoteList = useWishlist();
  const remove = useRemoveFromWishlist();

  // Guest wishlist must resolve against the shop catalog — not featured-only (that desynced hearts/badge).
  const catalog = useProducts(
    { limit: 60 },
    { enabled: !user && localIds.length > 0 },
  );

  let products: Product[] = [];
  if (user) {
    products = (remoteList.data || []).map((w) => w.product);
  } else if (catalog.data?.data) {
    const wanted = new Set(localIds);
    products = catalog.data.data.filter((p) => wanted.has(p.id));
  }

  // Drop stale local ids only when the catalog response is complete (avoid pruning page-2 products).
  useEffect(() => {
    if (user || !catalog.isSuccess || !catalog.data?.data) return;
    if (localIds.length === 0) return;
    const total = catalog.data.meta?.totalCount ?? catalog.data.data.length;
    if (total > catalog.data.data.length) return;
    pruneMissing(catalog.data.data.map((p) => p.id));
  }, [user, catalog.isSuccess, catalog.data, localIds.length, pruneMissing]);

  const onRemove = (p: Product) => {
    if (user) {
      remove.mutate(p.id);
    } else {
      localRemove(p.id);
      toast(t('product.removedWishlist'), 'info');
    }
  };

  const onAddToCart = (p: Product) => {
    if (p.stock <= 0) {
      toast(t('product.outOfStock'), 'error');
      return;
    }
    add({
      productId: p.id,
      quantity: 1,
      snapshot: {
        name: p.name,
        price: p.price,
        image: productImage(p),
        slug: p.slug,
        weight: p.weight,
        stock: p.stock,
      },
    });
    toast(t('toast.addedToCart', { name: p.name }), 'success');
  };

  const guestLoading = !user && localIds.length > 0 && catalog.isLoading;

  if (!user && localIds.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-5">
          <Icon name="heart" size={26} className="text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-ink mb-3">{t('wishlist.empty.title')}</h1>
        <p className="text-sm text-ink-muted mb-6 max-w-md mx-auto">{t('wishlist.empty.desc')}</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link to="/shop" className="btn-cta">
            {t('wishlist.browseShop')}
          </Link>
          <Link to="/login?redirect=/wishlist" className="btn-out">
            {t('wishlist.loginToSync')}
          </Link>
        </div>
      </div>
    );
  }

  if ((user && remoteList.isLoading) || guestLoading) {
    return (
      <div className="container-app py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">{t('wishlist.title')}</h1>
          <p className="text-sm text-ink-muted">
            {products.length === 1
              ? t('wishlist.itemsSaved', { n: products.length })
              : t('wishlist.itemsSavedPlural', { n: products.length })}
            {!user && t('wishlist.onDevice')}
          </p>
        </div>
        {!user && (
          <Link
            to="/login?redirect=/wishlist"
            className="text-xs text-primary hover:text-primary-light font-semibold"
          >
            {t('wishlist.loginSync')}
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-ink-muted mb-5">{t('wishlist.empty.title')}</p>
          <Link to="/shop" className="btn-cta inline-flex">
            {t('wishlist.browseShop')}
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <article key={p.id} className="card overflow-hidden">
              <div className="relative">
                <Link to={`/${p.slug}`} className="block aspect-square bg-gradient-to-br from-bg via-surfaceAlt to-bg">
                  <ProductImage product={p} size={160} />
                </Link>
                <button
                  onClick={() => onRemove(p)}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-bg/70 backdrop-blur text-danger hover:bg-danger/15"
                  aria-label={t('product.removedWishlist')}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
              <div className="p-4">
                <Link to={`/${p.slug}`} className="block">
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-primary mb-1.5">
                    {p.purity} · {p.weight}
                  </p>
                  <h3 className="text-sm font-bold text-ink truncate hover:text-primary transition-colors">{p.name}</h3>
                </Link>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-base font-extrabold text-ink">{formatCompactCurrency(p.price)}</span>
                  <Button size="sm" onClick={() => onAddToCart(p)} disabled={p.stock <= 0}>
                    <Icon name="cart" size={12} />
                    {t('product.toCart')}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
