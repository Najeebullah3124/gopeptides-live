import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { useCartStore } from '@/stores/cartStore';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { couponService } from '@/services/couponService';
import { extractErrorMessage } from '@/services/api';

export default function CartPage() {
  const { t } = useT();
  useSEO({ title: t('cart.pageTitle') });
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const storedCoupon = useCartStore((s) => s.appliedCoupon);
  const setStoredCoupon = useCartStore((s) => s.setAppliedCoupon);
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const [coupon, setCoupon] = useState(storedCoupon?.code ?? '');
  const [discount, setDiscount] = useState(storedCoupon?.discountAmount ?? 0);
  const [appliedCoupon, setAppliedCoupon] = useState(storedCoupon?.code ?? '');
  const [validating, setValidating] = useState(false);

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) return;
    setValidating(true);
    try {
      const result = await couponService.validate(code, subtotal);
      setDiscount(result.discountAmount);
      setAppliedCoupon(result.code);
      setCoupon(result.code);
      setStoredCoupon({ code: result.code, discountAmount: result.discountAmount });
      toast(t('cart.discountApplied'), 'success');
    } catch (err) {
      toast(extractErrorMessage(err), 'error');
    } finally {
      setValidating(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-5">
          <Icon name="cart" size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">{t('cart.emptyTitle')}</h1>
        <p className="text-ink-muted mb-6">{t('cart.emptySub')}</p>
        <Button onClick={() => navigate('/shop')}>{t('wishlist.browseShop')}</Button>
      </div>
    );
  }

  return (
    <div className="container-app py-10" style={{ padding: 'clamp(24px,5vw,40px) clamp(16px,5vw,40px)' }}>
      <div className="flex items-baseline justify-between mb-8 gap-3 flex-wrap">
        <h1 className="text-3xl font-extrabold text-ink">{t('cart.pageTitle')}</h1>
        <Link to="/shop" className="text-sm text-primary hover:text-primary-light">
          {t('cart.continueShoppingArrow')}
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="card p-2">
          {items.map((item) => (
            <CartItem key={item.productId} item={item} />
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="card p-5">
            <h3 className="text-sm font-bold uppercase tracking-[1.5px] text-ink mb-4">{t('cart.discountCode')}</h3>
            <div className="flex gap-2">
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="WELCOME15" />
              <Button onClick={() => void applyCoupon()} variant="secondary" loading={validating}>
                {t('btn.apply')}
              </Button>
            </div>
            {appliedCoupon && (
              <p className="text-xs text-primary mt-2">
                <Icon name="check" size={11} className="inline" /> {t('cart.codeReady', { code: appliedCoupon })}
              </p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold uppercase tracking-[1.5px] text-ink mb-4">{t('checkout.summary')}</h3>
            <CartSummary discount={discount} />
            <Button fullWidth size="lg" className="mt-5" onClick={() => navigate('/checkout')}>
              {t('cart.proceed')}
              <Icon name="arrowRight" size={14} />
            </Button>
            <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-ink-muted">
              <Icon name="shield" size={12} className="text-primary" />
              {t('cart.secure')}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
