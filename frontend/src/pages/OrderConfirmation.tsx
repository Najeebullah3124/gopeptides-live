import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOrder } from '@/hooks/useOrders';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/helpers';
import { paymentService } from '@/services/paymentService';
import { useUiStore } from '@/stores/uiStore';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/hooks/useT';
import { BANK_TRANSFER } from '@/constants';
import { readOrderConfirm, type BankTransferDetails } from '@/utils/orderConfirmStorage';
import type { Order } from '@/types/order';

export default function OrderConfirmationPage() {
  const { t } = useT();
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const paymentIntentId = params.get('pi') || params.get('payment_intent');
  const wallidReturn = params.get('wallid') === '1';
  const ecomtradeReturn = params.get('ecomtrade') === '1';
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const isLoggedIn = !!useAuthStore((s) => s.accessToken);
  // Guests cannot call GET /orders/:id (auth-only) — use stashed create-order payload.
  const { data: fetchedOrder, isLoading, refetch } = useOrder(isLoggedIn ? orderId || undefined : undefined);
  const stashOnLoad = orderId ? readOrderConfirm(orderId) : null;
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(() => stashOnLoad?.order ?? null);
  const [bankDetails, setBankDetails] = useState<BankTransferDetails | null>(
    () => stashOnLoad?.bankTransferDetails ?? null,
  );
  const [confirming, setConfirming] = useState(!!paymentIntentId || wallidReturn || ecomtradeReturn);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const clearCart = useCartStore((s) => s.clear);
  const order = fetchedOrder ?? confirmedOrder;
  const isBankTransfer = order?.paymentMethod === 'bank_transfer' || !!bankDetails;

  useEffect(() => {
    if (!orderId) return;
    const stash = readOrderConfirm(orderId);
    if (stash?.order) setConfirmedOrder((prev) => prev ?? stash.order);
    if (stash?.bankTransferDetails) setBankDetails((prev) => prev ?? stash.bankTransferDetails ?? null);
  }, [orderId]);

  useEffect(() => {
    if (order?.paymentMethod === 'bank_transfer' || bankDetails || order?.paymentMethod === 'wallid' || order?.paymentMethod === 'ecomtrade24' || order?.paymentMethod === 'crypto') {
      clearCart();
    }
  }, [order?.paymentMethod, bankDetails, clearCart]);

  useEffect(() => {
    if (!paymentIntentId) return;
    let active = true;
    paymentService
      .confirm(paymentIntentId)
      .then((res) => {
        if (!active) return;
        clearCart();
        if (res.order) setConfirmedOrder(res.order);
        refetch();
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setConfirming(false);
      });
    return () => {
      active = false;
    };
  }, [paymentIntentId, refetch, clearCart]);

  useEffect(() => {
    if (!wallidReturn || !orderId || paymentIntentId) {
      if (!paymentIntentId && !wallidReturn && !ecomtradeReturn) setConfirming(false);
      return;
    }
    let active = true;
    paymentService
      .confirmWallid(orderId)
      .then((res) => {
        if (!active) return;
        clearCart();
        if (res.order) setConfirmedOrder(res.order);
        refetch();
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setConfirming(false);
      });
    return () => {
      active = false;
    };
  }, [wallidReturn, orderId, paymentIntentId, refetch, clearCart]);

  useEffect(() => {
    if (!ecomtradeReturn || !orderId || paymentIntentId) return;
    let active = true;
    paymentService
      .confirmEcomtrade(orderId)
      .then((res) => {
        if (!active) return;
        clearCart();
        if (res.order) setConfirmedOrder(res.order);
        refetch();
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setConfirming(false);
      });
    return () => {
      active = false;
    };
  }, [ecomtradeReturn, orderId, paymentIntentId, refetch, clearCart]);

  useEffect(() => {
    if (!orderId) navigate('/', { replace: true });
  }, [orderId, navigate]);

  // Google Ads purchase conversion — fired once per order (guarded in localStorage against reloads).
  useEffect(() => {
    if (!order?.id) return;
    const firedKey = `gp_conv_fired_${order.id}`;
    try {
      if (localStorage.getItem(firedKey)) return;
      localStorage.setItem(firedKey, '1');
    } catch {
      // Storage unavailable (private mode) — still report the conversion.
    }
    try {
      window.gtag?.('event', 'conversion', {
        send_to: 'AW-18369431565/y0Z_CN3j3uwcEI2QnbdE',
        transaction_id: order.orderNumber,
        value: order.total,
        currency: 'EUR',
      });
    } catch {
      // Analytics must never break the confirmation page.
    }
  }, [order?.id]);

  if (!order && (confirming || isLoading)) {
    return (
      <div className="container-app py-24 text-center">
        <Spinner size={28} className="text-primary mx-auto mb-4" />
        <p className="text-sm text-ink-muted">{t('confirm.confirming')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-app py-24 text-center max-w-lg mx-auto">
        <div className="inline-flex w-16 h-16 rounded-full bg-success/15 border-2 border-success/40 items-center justify-center mb-5">
          <Icon name="check" size={28} className="text-success" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink mb-3">{t('confirm.title')}</h1>
        <p className="text-sm text-ink-muted mb-6">{t('confirm.emailFallback')}</p>
        <Link to="/shop" className="btn-cta">{t('confirm.continueShop')}</Link>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const estDelivery = new Date(new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000);

  const displayBank: BankTransferDetails = bankDetails ?? {
    accountHolder: BANK_TRANSFER.accountHolder,
    iban: BANK_TRANSFER.iban,
    bic: BANK_TRANSFER.bic,
    reference: order.orderNumber,
  };

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    toast(t('confirm.orderCopied'), 'success');
    setTimeout(() => setCopied(false), 1500);
  };

  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    toast(t('confirm.copied'), 'success');
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="container-app py-12 max-w-3xl" style={{ padding: 'clamp(24px,5vw,48px) clamp(16px,5vw,40px)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex w-20 h-20 rounded-full bg-success/15 border-2 border-success/40 items-center justify-center mb-6 animate-pulseGlow">
          <Icon name="check" size={36} className="text-success" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-success mb-2">{t('confirm.eyebrow')}</p>
        <h1 className="text-4xl font-extrabold text-ink mb-3">{t('confirm.title')}</h1>
        <p className="text-ink-muted">
          {t('confirm.confirmation', { email: order.user?.email || order.guestEmail || '—' })}
        </p>
      </motion.div>

      <div className="card p-6 mb-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-5 pb-5 border-b border-line">
          <div>
            <p className="text-[11px] uppercase tracking-[1.5px] text-ink-muted font-bold mb-1">
              {t('confirm.orderNumber')}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-primary font-mono">{order.orderNumber}</span>
              <button
                aria-label={t('confirm.copyOrder')}
                onClick={copyOrderNumber}
                className="p-1.5 text-ink-muted hover:text-primary rounded-md hover:bg-surfaceHi"
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <Badge tone={order.status === 'PROCESSING' ? 'success' : order.status === 'PENDING' ? 'gold' : 'muted'}>
              {t(`status.${order.status}`)}
            </Badge>
            <span className="text-xs text-ink-muted">
              {t('confirm.placed', { date: formatDate(order.createdAt) })}
            </span>
            <span className="text-xs text-ink-muted">
              {t('confirm.paymentMethod')}:{' '}
              {order.paymentMethod === 'bank_transfer'
                ? t('checkout.method.bankTransfer')
                : order.paymentMethod === 'wallid'
                  ? t('checkout.method.wallid')
                  : order.paymentMethod === 'ecomtrade24' || order.paymentMethod === 'crypto'
                    ? t('checkout.method.ecomtrade24')
                    : t('checkout.method.card')}
            </span>
          </div>
        </div>

        <h3 className="label">{t('confirm.items')}</h3>
        <ul className="space-y-3 mb-6">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-bg border border-line flex items-center justify-center text-primary flex-shrink-0">
                <Icon name="flask" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{i.name}</p>
                <p className="text-[11px] text-ink-muted">
                  {t('orderDetail.qtyTimes', { n: i.quantity, price: formatCompactCurrency(i.price) })}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink">{formatCompactCurrency(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5 text-sm pt-5 border-t border-line">
          <div className="flex justify-between text-ink-muted">
            <span>{t('cart.subtotal')}</span>
            <span>{formatCompactCurrency(order.subtotal)}</span>
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
            <span>{order.shipping === 0 ? t('cart.free') : formatCompactCurrency(order.shipping)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>{t('cart.vat')}</span>
            <span>{formatCompactCurrency(order.tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-line">
            <span className="text-ink">{t('cart.total')}</span>
            <span className="text-primary">{formatCompactCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {isBankTransfer && (
        <div className="card p-6 mb-5">
          <h3 className="label mb-3 flex items-center gap-1.5">
            <Icon name="bank" size={12} className="inline -mt-0.5" />
            {t('confirm.bank.title')}
          </h3>
          <p className="text-sm text-ink-muted mb-5 leading-relaxed">{t('confirm.bank.instructions')}</p>

          <dl className="space-y-3 text-sm">
            {(
              [
                ['holder', t('confirm.bank.holder'), displayBank.accountHolder],
                ['iban', t('confirm.bank.iban'), displayBank.iban],
                ['bic', t('confirm.bank.bic'), displayBank.bic],
                ['ref', t('confirm.bank.reference'), displayBank.reference],
                ['amount', t('confirm.bank.amount'), formatCompactCurrency(order.total)],
              ] as const
            ).map(([key, label, value]) => (
              <div key={key} className="flex items-start justify-between gap-3 py-2 border-b border-line last:border-0">
                <div>
                  <dt className="text-[11px] uppercase tracking-[1px] text-ink-muted font-bold">{label}</dt>
                  <dd className="font-mono text-ink font-semibold mt-0.5 select-all">{value}</dd>
                </div>
                <button
                  type="button"
                  aria-label={`${t('confirm.copyOrder')} ${label}`}
                  onClick={() => copyField(key, value)}
                  className="p-1.5 text-ink-muted hover:text-primary rounded-md hover:bg-surfaceHi shrink-0"
                >
                  <Icon name={copiedField === key ? 'check' : 'copy'} size={14} />
                </button>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <h4 className="label">
            <Icon name="truck" size={12} className="inline -mt-0.5 mr-1" />
            {t('confirm.shipsTo')}
          </h4>
          <p className="text-sm text-ink leading-relaxed">
            {addr.firstName} {addr.lastName}
            <br />
            {addr.street}
            <br />
            {addr.postalCode} {addr.city}
            <br />
            {addr.country}
          </p>
          {addr.expressDelivery && (
            <p className="text-xs font-semibold text-primary mt-2">{t('checkout.express.title')}</p>
          )}
        </div>
        <div className="card p-5">
          <h4 className="label">
            <Icon name="info" size={12} className="inline -mt-0.5 mr-1" />
            {t('confirm.estDelivery')}
          </h4>
          <p className="text-base font-semibold text-ink">{formatDate(estDelivery)}</p>
          <p className="text-xs text-ink-muted mt-1">
            {isBankTransfer ? t('confirm.bank.deliveryNote') : t('confirm.expressNote')}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/shop" className="btn-out flex-1 justify-center">
          {t('confirm.continueShop')}
        </Link>
        {order.userId && (
          <Link to={`/account/orders/${order.id}`} className="btn-cta flex-1 justify-center">
            {t('confirm.viewInAccount')}
            <Icon name="arrowRight" size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
