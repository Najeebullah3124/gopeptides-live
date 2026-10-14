import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';
import { CartSummary } from '@/components/cart/CartSummary';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { useT } from '@/hooks/useT';
import { couponService } from '@/services/couponService';
import { extractErrorMessage } from '@/services/api';
import { useUiStore } from '@/stores/uiStore';

interface OrderSummaryProps {
  appliedCoupon: string;
  discount: number;
  extraShipping?: number;
  expressIncluded?: boolean;
  country?: string;
  onApplyCoupon: (code: string, discountAmount: number) => void;
  onClearCoupon: () => void;
  className?: string;
}

export function OrderSummary({
  appliedCoupon,
  discount,
  extraShipping = 0,
  expressIncluded = false,
  country,
  onApplyCoupon,
  onClearCoupon,
  className,
}: OrderSummaryProps) {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);

  const applyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setValidating(true);
    try {
      const result = await couponService.validate(trimmed, subtotal);
      onApplyCoupon(result.code, result.discountAmount);
      setCode('');
      toast(t('cart.discountApplied'), 'success');
    } catch (err) {
      toast(extractErrorMessage(err), 'error');
    } finally {
      setValidating(false);
    }
  };

  return (
    <aside className={className}>
      <div className="card p-5 lg:sticky lg:top-24">
        <h3 className="text-sm font-bold uppercase tracking-[1.5px] text-ink mb-4">{t('checkout.summary')}</h3>

        <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1 mb-4">
          {items.map((i) => (
            <li key={i.productId} className="flex gap-3">
              <div className="relative w-14 h-14 rounded-md bg-bg border border-line overflow-hidden flex-shrink-0">
                {i.snapshot.image ? (
                  <img
                    src={i.snapshot.image}
                    alt={i.snapshot.name}
                    loading="lazy"
                    decoding="async"
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="flask" size={18} className="absolute inset-0 m-auto text-primary" />
                )}
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-bg text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                  {i.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{i.snapshot.name}</p>
                <p className="text-[11px] text-ink-muted">{i.snapshot.weight}</p>
              </div>
              <span className="text-sm font-semibold text-ink whitespace-nowrap">
                {formatCompactCurrency(i.quantity * i.snapshot.price)}
              </span>
            </li>
          ))}
        </ul>

        {!appliedCoupon ? (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder={t('cart.discountCode')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <Button
              type="button"
              variant="secondary"
              loading={validating}
              onClick={() => void applyCode()}
            >
              {t('btn.apply')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-md bg-primary/[0.06] border border-primary/20 mb-4">
            <span className="text-xs font-semibold text-primary">
              <Icon name="check" size={11} className="inline mr-1" />
              {t('cart.codeReady', { code: appliedCoupon })}
            </span>
            <button
              onClick={onClearCoupon}
              className="text-ink-muted hover:text-danger p-0.5"
              aria-label={t('btn.remove')}
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        )}

        <CartSummary discount={discount} extraShipping={extraShipping} expressIncluded={expressIncluded} country={country} />
      </div>
    </aside>
  );
}
