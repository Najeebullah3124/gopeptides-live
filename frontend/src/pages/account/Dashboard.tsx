import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMyOrders } from '@/hooks/useOrders';
import { useAddresses } from '@/hooks/useUser';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useWishlist } from '@/hooks/useWishlist';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/helpers';

const statusTones: Record<string, 'primary' | 'gold' | 'success' | 'danger' | 'muted'> = {
  PROCESSING: 'success',
  SHIPPED: 'primary',
  DELIVERED: 'primary',
  PENDING: 'gold',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

export default function AccountDashboard() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const { data: ordersData, isLoading } = useMyOrders(1);
  const { data: addresses } = useAddresses();
  const localWishlistCount = useWishlistStore((s) => s.ids.length);
  const { data: remoteWishlist } = useWishlist();
  const wishlistCount = user ? (remoteWishlist?.length ?? 0) : localWishlistCount;

  const orders = ordersData?.data || [];
  const recent = orders.slice(0, 3);

  const totalSpent = orders.reduce(
    (n, o) => (o.status !== 'CANCELLED' && o.status !== 'REFUNDED' ? n + o.total : n),
    0,
  );

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink mb-2">
        {t('account.welcome', { name: user?.firstName || '' })}
      </h1>
      <p className="text-sm text-ink-muted mb-8">{t('account.snapshot')}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon name="document" size={16} className="text-primary" />
            </div>
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-ink-muted">
              {t('account.totalOrders')}
            </p>
          </div>
          <p className="text-3xl font-extrabold text-ink">{ordersData?.meta.totalCount ?? '—'}</p>
          <Link
            to="/account/orders"
            className="text-xs text-primary hover:text-primary-light mt-2 inline-flex items-center gap-1"
          >
            {t('account.viewHistory')}
            <Icon name="arrowRight" size={11} />
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon name="spark" size={16} className="text-primary" />
            </div>
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-ink-muted">
              {t('account.totalSpent')}
            </p>
          </div>
          <p className="text-3xl font-extrabold text-ink">{formatCompactCurrency(totalSpent)}</p>
          <p className="text-xs text-ink-muted mt-2">{t('account.acrossOrders')}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon name="heart" size={16} className="text-primary" />
            </div>
            <p className="text-[11px] uppercase tracking-[1.5px] font-bold text-ink-muted">
              {t('account.wishlistCard')}
            </p>
          </div>
          <p className="text-3xl font-extrabold text-ink">{wishlistCount}</p>
          <Link
            to="/wishlist"
            className="text-xs text-primary hover:text-primary-light mt-2 inline-flex items-center gap-1"
          >
            {t('account.viewItems')}
            <Icon name="arrowRight" size={11} />
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink">{t('account.recentOrders')}</h2>
            <Link to="/account/orders" className="text-xs text-primary hover:text-primary-light font-semibold">
              {t('account.seeAll')}
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-ink-muted">
              {t('account.noOrdersYet')}{' '}
              <Link to="/shop" className="text-primary hover:text-primary-light font-semibold">
                {t('account.browseShop')}
              </Link>
              .
            </div>
          ) : (
            <div
              className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style dangerouslySetInnerHTML={{__html: `
                .flex.overflow-x-auto::-webkit-scrollbar { display: none; }
              `}} />
              {recent.map((o) => (
                <div key={o.id} className="flex-shrink-0 w-[260px] bg-surfaceAlt border border-lineSoft hover:border-primary/45 rounded-card p-4 transition-colors">
                  <Link to={`/account/orders/${o.id}`} className="block">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold font-mono text-ink">{o.orderNumber}</span>
                      <Badge tone={statusTones[o.status] || 'muted'}>{t(`status.${o.status}`)}</Badge>
                    </div>
                    <p className="text-[11px] text-ink-muted mb-3">
                      {t('orders.itemsCount', { n: o.items.length })}
                    </p>
                    <div className="flex justify-between items-center pt-2.5 border-t border-lineSoft">
                      <span className="text-[10px] text-ink-dim">{formatDate(o.createdAt)}</span>
                      <span className="text-sm font-bold text-ink">{formatCompactCurrency(o.total)}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink">{t('account.defaultAddress')}</h2>
            <Link to="/account/addresses" className="text-xs text-primary hover:text-primary-light font-semibold">
              {t('account.manage')}
            </Link>
          </div>
          {!addresses || addresses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-ink-muted mb-3">{t('account.noAddressesYet')}</p>
              <Link to="/account/addresses" className="btn-out btn-sm inline-flex">
                {t('account.addAddress')}
              </Link>
            </div>
          ) : (
            (() => {
              const def = addresses.find((a) => a.isDefault) || addresses[0];
              return (
                <div className="text-sm text-ink leading-relaxed">
                  <p className="font-semibold">
                    {def.firstName} {def.lastName}
                  </p>
                  <p className="text-ink-muted">{def.street}</p>
                  <p className="text-ink-muted">
                    {def.postalCode} {def.city}
                  </p>
                  <p className="text-ink-muted">{def.country}</p>
                  {def.phone && <p className="text-ink-muted mt-1">{def.phone}</p>}
                </div>
              );
            })()
          )}
        </section>
      </div>
    </div>
  );
}
