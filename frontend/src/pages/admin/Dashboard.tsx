import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { reviewService } from '@/services/reviewService';
import { couponService } from '@/services/couponService';
import { productService } from '@/services/productService';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useT } from '@/hooks/useT';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/helpers';

export default function AdminDashboard() {
  const { t } = useT();
  const orders = useQuery({ queryKey: ['admin', 'orders', 1], queryFn: () => adminService.listOrders(1) });
  const pendingReviews = useQuery({
    queryKey: ['admin', 'reviews', 'pending'],
    queryFn: () => reviewService.adminList(false, 1),
  });
  const coupons = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => couponService.adminList() });
  const products = useQuery({ queryKey: ['admin', 'products', 1], queryFn: () => productService.list({ limit: 1 }) });

  const recentOrders = orders.data?.data?.slice(0, 5) || [];
  const revenue = (orders.data?.data || [])
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    .reduce((n, o) => n + o.total, 0);

  const stats = [
    {
      label: t('admin.stat.totalOrders'),
      value: orders.data?.meta.totalCount ?? '—',
      icon: 'document' as const,
      link: '/admin/orders',
    },
    {
      label: t('admin.stat.revenue'),
      value: orders.isLoading ? '—' : formatCompactCurrency(revenue),
      icon: 'spark' as const,
    },
    {
      label: t('admin.stat.pendingReviews'),
      value: pendingReviews.data?.meta.totalCount ?? '—',
      icon: 'star' as const,
      link: '/admin/reviews',
    },
    {
      label: t('admin.stat.activeProducts'),
      value: products.data?.meta.totalCount ?? '—',
      icon: 'flask' as const,
      link: '/admin/products',
    },
    {
      label: t('admin.stat.activeCoupons'),
      value: coupons.data ? coupons.data.filter((c) => c.isActive).length : '—',
      icon: 'check' as const,
      link: '/admin/coupons',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.overview')}</h2>
      <p className="text-sm text-ink-muted mb-6">{t('admin.snapshot')}</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => {
          const card = (
            <div className="card p-5 h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Icon name={s.icon} size={14} className="text-primary" />
                </div>
                <p className="text-[10px] uppercase tracking-[1.5px] font-bold text-ink-muted">{s.label}</p>
              </div>
              <p className="text-2xl font-extrabold text-ink">{s.value}</p>
            </div>
          );
          return s.link ? (
            <Link to={s.link} key={s.label} className="block">{card}</Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink">{t('admin.recentOrders')}</h3>
          <Link to="/admin/orders" className="text-xs text-primary hover:text-primary-light font-semibold">
            {t('account.seeAll')}
          </Link>
        </div>
        {orders.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="text-sm text-ink-muted py-6 text-center">{t('admin.noOrdersYet')}</p>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              .flex.overflow-x-auto::-webkit-scrollbar { display: none; }
            `}} />
            {recentOrders.map((o) => (
              <div key={o.id} className="flex-shrink-0 w-[260px] bg-surfaceAlt border border-lineSoft hover:border-primary/45 rounded-card p-4 transition-colors">
                <Link to={`/admin/orders`} className="block">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold font-mono text-ink">{o.orderNumber}</span>
                    <Badge tone={o.status === 'CANCELLED' || o.status === 'REFUNDED' ? 'danger' : 'primary'}>
                      {t(`status.${o.status}`)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-ink-muted mb-3 truncate">
                    {o.user?.email || o.guestEmail || 'guest'}
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
    </div>
  );
}
