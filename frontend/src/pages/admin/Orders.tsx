import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/adminService';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { extractErrorMessage } from '@/services/api';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate, withParsedAddress } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import type { Order, OrderStatus } from '@/types/order';

const STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

const tones: Record<OrderStatus, 'primary' | 'success' | 'gold' | 'danger' | 'muted'> = {
  PENDING: 'gold',
  PROCESSING: 'success',
  SHIPPED: 'primary',
  DELIVERED: 'primary',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

function paymentMethodLabel(method: string, t: (key: string) => string): string {
  if (method === 'bank_transfer') return t('checkout.method.bankTransfer');
  if (method === 'wallid') return t('checkout.method.wallid');
  if (method === 'crypto' || method === 'ecomtrade24') return t('checkout.method.ecomtrade24');
  if (method === 'stripe') return t('checkout.method.card');
  return method.replace(/_/g, ' ');
}

export default function AdminOrders() {
  const { t } = useT();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('');
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();

  useEffect(() => {
    if (selected) {
      setTrackingNumber(selected.trackingNumber || '');
      setCourier(selected.courier || '');
    }
  }, [selected]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page, status, search],
    queryFn: () => adminService.listOrders(page, status || undefined, search || undefined),
    placeholderData: (prev) => prev,
  });

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      status,
      trackingNumber,
      courier,
      paymentStatus,
    }: {
      id: string;
      status: OrderStatus;
      trackingNumber?: string;
      courier?: string;
      paymentStatus?: string;
    }) => adminService.updateOrderStatus(id, { status, trackingNumber, courier, paymentStatus }),
    onSuccess: (order) => {
      toast(`Order ${order.orderNumber} → ${t('status.' + order.status)}`, 'success');
      setSelected(withParsedAddress(order));
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const printLabel = useMutation({
    mutationFn: (id: string) => adminService.printOrderLabel(id),
    onSuccess: (res) => {
      toast(res.message || 'Label sent to printer successfully', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.orders.title')}</h2>
      <p className="text-sm text-ink-muted mb-6">
        {data
          ? data.meta.totalCount === 1
            ? t('orders.count', { n: data.meta.totalCount })
            : t('orders.countPlural', { n: data.meta.totalCount })
          : t('label.loading')}
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('admin.orders.search')}
          className="field flex-1 min-w-[240px]"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '');
            setPage(1);
          }}
          options={[
            { value: '', label: t('orders.filter.all') },
            ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
          ]}
          className="w-auto min-w-[160px]"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data || data.data.length === 0 ? (
        <div className="card p-12 text-center text-ink-muted">{t('admin.orders.noMatch')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                <th className="text-left px-4 py-3">{t('orders.col.orderNo')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.orders.col.customer')}</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">{t('orders.col.date')}</th>
                <th className="text-left px-4 py-3">{t('orders.col.status')}</th>
                <th className="text-right px-4 py-3">{t('orders.col.total')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.data.map((o) => (
                <tr key={o.id} className="border-b border-lineSoft last:border-0 hover:bg-surfaceAlt">
                  <td className="px-4 py-3 font-mono font-semibold text-ink">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-ink-muted hidden md:table-cell">
                    {o.user?.email || o.guestEmail || '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-muted hidden sm:table-cell">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3"><Badge tone={tones[o.status]}>{t(`status.${o.status}`)}</Badge></td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{formatCompactCurrency(o.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(withParsedAddress(o))}
                      className="text-xs font-semibold text-primary hover:text-primary-light"
                    >
                      {t('admin.orders.manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-5">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <Icon name="arrowLeft" size={12} />
          </Button>
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === data.meta.totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-ink-dim">…</span>}
                <button
                  onClick={() => setPage(p)}
                  className={cn(
                    'min-w-[32px] h-8 rounded-md text-xs font-semibold transition-colors',
                    p === page ? 'bg-primary text-bg' : 'text-ink-muted hover:text-ink hover:bg-surfaceHi',
                  )}
                >
                  {p}
                </button>
              </span>
            ))}
          <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
            <Icon name="arrowRight" size={12} />
          </Button>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? selected.orderNumber : ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label">{t('admin.orders.col.customer')}</p>
                <p className="text-ink">{selected.user?.email || selected.guestEmail || '—'}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {selected.shippingAddress.firstName} {selected.shippingAddress.lastName}
                </p>
              </div>
              <div>
                <p className="label">{t('admin.orders.placed')}</p>
                <p className="text-ink">{formatDate(selected.createdAt)}</p>
              </div>
              <div>
                <p className="label">{t('cart.total')}</p>
                <p className="text-ink font-bold">{formatCompactCurrency(selected.total)}</p>
                {selected.shippingAddress.expressDelivery && (
                  <p className="text-xs text-primary mt-1">{t('checkout.express.title')}</p>
                )}
              </div>
              <div>
                <p className="label">{t('admin.orders.payment')}</p>
                <p className="text-ink font-semibold">
                  {paymentMethodLabel(selected.paymentMethod, t)}
                  <span className="text-ink-muted font-medium">
                    {' '}
                    · {selected.paymentStatus.charAt(0).toUpperCase() + selected.paymentStatus.slice(1)}
                  </span>
                </p>
              </div>
            </div>

            <div className="pb-4 border-b border-lineSoft">
              <p className="label">Shipping Address</p>
              <div className="text-sm text-ink mt-1 space-y-0.5">
                <p className="font-semibold">
                  {selected.shippingAddress.firstName} {selected.shippingAddress.lastName}
                </p>
                <p>{selected.shippingAddress.street}</p>
                <p>
                  {selected.shippingAddress.postalCode} {selected.shippingAddress.city}
                </p>
                <p>{selected.shippingAddress.country}</p>
                {selected.shippingAddress.phone && <p>Tel: {selected.shippingAddress.phone}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end pb-4 border-b border-lineSoft">
              {selected.paymentMethod === 'bank_transfer' && selected.paymentStatus !== 'paid' && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Icon name="check" size={14} />}
                  onClick={() =>
                    updateStatus.mutate({
                      id: selected.id,
                      status: 'PROCESSING',
                      trackingNumber,
                      courier,
                      paymentStatus: 'paid',
                    })
                  }
                  disabled={updateStatus.isPending}
                >
                  {t('admin.orders.markPaid')}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Icon name="printer" size={14} />}
                onClick={() => printLabel.mutate(selected.id)}
                disabled={printLabel.isPending}
              >
                Print Shipping Label
              </Button>
            </div>

            <div>
              <p className="label">{t('orderDetail.items')}</p>
              <ul className="text-sm space-y-1.5">
                {selected.items.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span className="text-ink">
                      {i.name} <span className="text-ink-muted">× {i.quantity}</span>
                    </span>
                    <span className="text-ink">{formatCompactCurrency(i.price * i.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="label">{t('admin.orders.updateStatus')}</p>
              
              <div className="flex gap-3 mb-2">
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={t('admin.orders.trackingPh')}
                  className="field text-sm flex-1"
                />
                <input
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder={t('admin.orders.courierPh')}
                  className="field text-sm w-1/3"
                />
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: selected.id, status: selected.status, trackingNumber, courier })}
                  disabled={updateStatus.isPending || (trackingNumber === (selected.trackingNumber || '') && courier === (selected.courier || ''))}
                >
                  {t('btn.save')}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus.mutate({ id: selected.id, status: s, trackingNumber, courier })}
                    disabled={updateStatus.isPending || (s === selected.status && trackingNumber === (selected.trackingNumber || '') && courier === (selected.courier || ''))}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                      s === selected.status
                        ? 'border-primary/60 bg-primary/15 text-primary cursor-default'
                        : 'border-line text-ink-muted hover:text-ink hover:border-primary/40',
                    )}
                  >
                    {t(`status.${s}`)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted mt-2">{t('admin.orders.emailNote')}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
