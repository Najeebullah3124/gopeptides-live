import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyOrders } from '@/hooks/useOrders';
import { useT } from '@/hooks/useT';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import type { OrderStatus } from '@/types/order';

const statusTones: Record<string, 'primary' | 'gold' | 'success' | 'danger' | 'muted'> = {
  PROCESSING: 'success',
  SHIPPED: 'primary',
  DELIVERED: 'primary',
  PENDING: 'gold',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

export default function OrderHistoryPage() {
  const { t } = useT();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const { data, isLoading } = useMyOrders(page, status || undefined);

  const orders = data?.data || [];
  const totalPages = data?.meta.totalPages || 1;
  const total = data?.meta.totalCount ?? 0;

  const filterOptions = [
    { value: '', label: t('orders.filter.all') },
    { value: 'PENDING', label: t('status.PENDING') },
    { value: 'PROCESSING', label: t('status.PROCESSING') },
    { value: 'SHIPPED', label: t('status.SHIPPED') },
    { value: 'DELIVERED', label: t('status.DELIVERED') },
    { value: 'CANCELLED', label: t('status.CANCELLED') },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink mb-2">{t('orders.title')}</h1>
      <p className="text-sm text-ink-muted mb-6">
        {data ? (total === 1 ? t('orders.count', { n: total }) : t('orders.countPlural', { n: total })) : t('label.loading')}
      </p>

      <div className="flex justify-end mb-5">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '');
            setPage(1);
          }}
          options={filterOptions}
          className="w-auto min-w-[180px]"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-4">
            <Icon name="document" size={22} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-ink mb-2">{t('orders.empty.title')}</h3>
          <p className="text-sm text-ink-muted mb-5">{t('orders.empty.desc')}</p>
          <Link to="/shop" className="btn-cta inline-flex">
            {t('orders.browseShop')}
          </Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[1.5px] text-ink-muted">
                  <th className="text-left px-5 py-3">{t('orders.col.orderNo')}</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">{t('orders.col.date')}</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">{t('orders.col.items')}</th>
                  <th className="text-left px-5 py-3">{t('orders.col.status')}</th>
                  <th className="text-right px-5 py-3">{t('orders.col.total')}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-lineSoft last:border-0 hover:bg-surfaceAlt transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-ink font-mono">{o.orderNumber}</td>
                    <td className="px-5 py-4 text-sm text-ink-muted hidden sm:table-cell">{formatDate(o.createdAt)}</td>
                    <td className="px-5 py-4 text-sm text-ink-muted hidden md:table-cell">
                      {t('orders.itemsCount', { n: o.items.length })}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTones[o.status] || 'muted'}>{t(`status.${o.status}`)}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-ink text-right">{formatCompactCurrency(o.total)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/account/orders/${o.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light"
                      >
                        {t('orders.action.view')}
                        <Icon name="arrowRight" size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <Icon name="arrowLeft" size={12} />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'min-w-[34px] h-8 rounded-md text-xs font-semibold transition-colors',
                    p === page ? 'bg-primary text-bg' : 'text-ink-muted hover:text-ink hover:bg-surfaceHi',
                  )}
                >
                  {p}
                </button>
              ))}
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <Icon name="arrowRight" size={12} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
