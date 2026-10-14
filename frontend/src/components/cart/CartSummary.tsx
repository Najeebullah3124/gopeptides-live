import { TAX_RATE } from '@/constants';
import { shippingQuote } from '@/utils/shipping';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { Icon } from '@/components/ui/Icon';
import { useCartStore } from '@/stores/cartStore';
import { cn } from '@/utils/helpers';
import { useT } from '@/hooks/useT';

interface CartSummaryProps {
  discount?: number;
  hideTax?: boolean;
  className?: string;
  extraShipping?: number;
  expressIncluded?: boolean;
  /** Destination country from the checkout form; omitted in the cart (falls back to the domain). */
  country?: string;
}

export function CartSummary({
  discount = 0,
  hideTax,
  className,
  extraShipping = 0,
  expressIncluded = false,
  country,
}: CartSummaryProps) {
  const { t } = useT();
  const subtotal = useCartStore((s) => s.subtotal());
  const afterDiscount = Math.max(0, subtotal - discount);
  const { shipping, threshold } = shippingQuote(afterDiscount, country);
  const tax = hideTax ? 0 : afterDiscount * TAX_RATE;
  const total = afterDiscount + shipping + extraShipping + tax;

  const freeShipProgress = Math.min(100, (afterDiscount / threshold) * 100);
  const remainingToFree = Math.max(0, threshold - afterDiscount);

  return (
    <div className={cn('space-y-3', className)}>
      {remainingToFree > 0 && (
        <div className="card p-3 bg-primary/[0.04] border-primary/20">
          <div className="flex items-center gap-2 text-xs text-ink mb-2">
            <Icon name="truck" size={14} className="text-primary" />
            <span>
              <strong className="text-primary">{formatCompactCurrency(remainingToFree)}</strong> {t('cart.toFreeShipping')}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
              style={{ width: `${freeShipProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-ink-muted">
          <span>{t('cart.subtotal')}</span>
          <span className="text-ink">{formatCompactCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-primary">
            <span>{t('cart.discount')}</span>
            <span>-{formatCompactCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-ink-muted">
          <span>{t('cart.shipping')}</span>
          <span className={shipping === 0 ? 'text-primary' : 'text-ink'}>
            {shipping === 0 ? t('cart.free') : formatCompactCurrency(shipping)}
          </span>
        </div>
        {(extraShipping > 0 || expressIncluded) && (
          <div className="flex justify-between text-ink-muted">
            <span>{t('checkout.express.label')}</span>
            <span className={extraShipping === 0 ? 'text-primary' : 'text-ink'}>
              {extraShipping === 0 ? t('checkout.express.included') : formatCompactCurrency(extraShipping)}
            </span>
          </div>
        )}
        {!hideTax && (
          <div className="flex justify-between text-ink-muted">
            <span>{t('cart.vat')}</span>
            <span className="text-ink">
              {TAX_RATE === 0 ? t('cart.vatValue') : formatCompactCurrency(tax)}
            </span>
          </div>
        )}
        <div className="h-px bg-line my-2" />
        <div className="flex justify-between text-base font-bold text-ink">
          <span>{t('cart.total')}</span>
          <span className="text-primary">{formatCompactCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
