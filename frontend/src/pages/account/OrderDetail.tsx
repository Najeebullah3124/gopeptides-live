import { Link, useParams } from 'react-router-dom';
import { useOrder } from '@/hooks/useOrders';
import { useT } from '@/hooks/useT';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { StatusTimeline } from '@/components/account/StatusTimeline';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate, parseShippingAddress } from '@/utils/helpers';

const statusTones: Record<string, 'primary' | 'gold' | 'success' | 'danger' | 'muted'> = {
  PROCESSING: 'success',
  SHIPPED: 'primary',
  DELIVERED: 'primary',
  PENDING: 'gold',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

export default function OrderDetailPage() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useOrder(id);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Spinner size={28} className="text-primary mx-auto" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink-muted mb-4">{t('orderDetail.notFound')}</p>
        <Link to="/account/orders" className="btn-out inline-flex">
          {t('orderDetail.backToOrders')}
        </Link>
      </div>
    );
  }

  const addr = parseShippingAddress(order.shippingAddress);

  return (
    <div>
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-light mb-4"
      >
        <Icon name="arrowLeft" size={13} />
        {t('orderDetail.allOrders')}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-ink font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-ink-muted">{t('orderDetail.placedOn', { date: formatDate(order.createdAt) })}</p>
        </div>
        <Badge tone={statusTones[order.status] || 'muted'}>{t(`status.${order.status}`)}</Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5">
          <section className="card p-6">
            <h2 className="text-lg font-bold text-ink mb-5">{t('orderDetail.tracking')}</h2>
            {(order.trackingNumber || order.courier) && (
              <div className="mb-6 p-4 rounded-lg bg-surfaceAlt border border-line">
                <p className="text-sm font-bold text-ink mb-1">Tracking Information</p>
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  {order.courier && <span className="font-medium text-ink">{order.courier}:</span>}
                  {order.trackingNumber && <span>{order.trackingNumber}</span>}
                </div>
              </div>
            )}
            <StatusTimeline status={order.status} createdAt={order.createdAt} updatedAt={order.updatedAt} />
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-ink mb-4">{t('orderDetail.items')}</h2>
            <ul className="divide-y divide-lineSoft">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="w-14 h-14 rounded-md bg-bg border border-line flex items-center justify-center text-primary flex-shrink-0">
                    <Icon name="flask" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{i.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {t('orderDetail.qtyTimes', { n: i.quantity, price: formatCompactCurrency(i.price) })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-ink">{formatCompactCurrency(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-ink mb-4">{t('orderDetail.totals')}</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>{t('cart.subtotal')}</span>
                <span className="text-ink">{formatCompactCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>
                    {t('cart.discount')}
                    {order.couponCode ? ` (${order.couponCode})` : ''}
                  </span>
                  <span>-{formatCompactCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-muted">
                <span>{t('cart.shipping')}</span>
                <span className="text-ink">{order.shipping === 0 ? t('cart.free') : formatCompactCurrency(order.shipping)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>{t('cart.vat')}</span>
                <span className="text-ink">{formatCompactCurrency(order.tax)}</span>
              </div>
              <div className="h-px bg-line my-2" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-ink">{t('orderDetail.totalPaid')}</span>
                <span className="text-primary">{formatCompactCurrency(order.total)}</span>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h3 className="label">
              <Icon name="truck" size={12} className="inline -mt-0.5 mr-1" /> {t('orderDetail.shipping')}
            </h3>
            <p className="text-sm text-ink leading-relaxed">
              {addr.firstName} {addr.lastName}
              <br />
              {addr.street}
              <br />
              {addr.postalCode} {addr.city}
              <br />
              {addr.country}
            </p>
            {addr.phone && <p className="text-xs text-ink-muted mt-2">{addr.phone}</p>}
          </section>

          <section className="card p-5">
            <h3 className="label">
              <Icon name="lock" size={12} className="inline -mt-0.5 mr-1" /> {t('orderDetail.payment')}
            </h3>
            <p className="text-sm text-ink">{order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}</p>
            <p className="text-xs text-ink-muted mt-1">
              {t('label.status')}: <span className="text-ink">{order.paymentStatus}</span>
            </p>
          </section>

          {order.notes && (
            <section className="card p-5">
              <h3 className="label">
                <Icon name="info" size={12} className="inline -mt-0.5 mr-1" /> {t('orderDetail.notes')}
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">{order.notes}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
