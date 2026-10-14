import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { Vial } from '@/components/product/Vial';
import { useUiStore } from '@/stores/uiStore';
import { useCartStore } from '@/stores/cartStore';
import { useT } from '@/hooks/useT';
import { couponService } from '@/services/couponService';
import { extractErrorMessage } from '@/services/api';
import { TAX_RATE } from '@/constants';
import { shippingQuote } from '@/utils/shipping';

const ACCENTS = ['#5CC0BE', '#7BD3D1', '#4FAFAD', '#A8E6E4', '#0D7377'];
function accentFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % ACCENTS.length;
  return ACCENTS[h];
}

export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const setOpen = useUiStore((s) => s.setCartOpen);
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotal());
  const storedCoupon = useCartStore((s) => s.appliedCoupon);
  const setStoredCoupon = useCartStore((s) => s.setAppliedCoupon);
  const itemCount = useCartStore((s) => s.count());
  const navigate = useNavigate();
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const [code, setCode] = useState(storedCoupon?.code ?? '');
  const [discount, setDiscount] = useState(storedCoupon?.discountAmount ?? 0);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  const applyCoupon = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setValidating(true);
    try {
      const result = await couponService.validate(trimmed, subtotal);
      setDiscount(result.discountAmount);
      setCode(result.code);
      setStoredCoupon({ code: result.code, discountAmount: result.discountAmount });
      toast(t('cart.discountApplied'), 'success');
    } catch (err) {
      toast(extractErrorMessage(err), 'error');
    } finally {
      setValidating(false);
    }
  };

  const afterDiscount = subtotal - discount;
  const { shipping, threshold: freeShippingThreshold } = shippingQuote(afterDiscount);
  const total = afterDiscount + shipping + afterDiscount * TAX_RATE;
  const freeProgress = Math.min(100, (afterDiscount / freeShippingThreshold) * 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="cart-backdrop"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.15, 1] }}
            className="cart-drawer cart-panel"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="cart-header">
              <span className="cart-title">
                {t('cart.title')}{' '}
                <span className="cart-item-count">
                  {itemCount} {t('cart.items')}
                </span>
              </span>
              <button onClick={() => setOpen(false)} className="btn-ghost sm" aria-label="Close cart">
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* Free shipping bar */}
            {afterDiscount > 0 && afterDiscount < freeShippingThreshold && (
              <div className="cart-shipping-bar">
                <span>
                  €{(freeShippingThreshold - afterDiscount).toFixed(2)}{' '}
                  <strong className="cart-shipping-bar-accent">{t('cart.toFreeShipping')}</strong>
                </span>
                <div className="progress-bar cart-progress">
                  <div className="progress-fill" style={{ width: `${freeProgress}%` }} />
                </div>
              </div>
            )}
            {afterDiscount >= freeShippingThreshold && afterDiscount > 0 && (
              <div className="cart-free-shipping-unlocked">
                {t('cart.freeShippingUnlocked')}
              </div>
            )}

            {/* Items */}
            <div className="cart-items-list">
              {items.length === 0 ? (
                <div className="cart-empty">
                  {t('cart.empty')}
                </div>
              ) : (
                items.map((it) => {
                  const accent = accentFor(it.snapshot.name);
                  return (
                    <div key={it.productId} className="cart-item">
                      <div className="cart-item-thumb">
                        {it.snapshot.image ? (
                          <img
                            src={it.snapshot.image}
                            alt={it.snapshot.name}
                            className="cart-item-img"
                          />
                        ) : (
                          <Vial color={accent} size={28} />
                        )}
                      </div>
                      <div className="cart-item-body">
                        <div className="cart-item-top-row">
                          <div className="cart-item-name-wrap">
                            <div className="cart-item-name">
                              {it.snapshot.name}
                            </div>
                            <div className="cart-item-weight">{it.snapshot.weight}</div>
                          </div>
                          <button
                            onClick={() => remove(it.productId)}
                            className="cart-item-remove"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="cart-item-bottom-row">
                          <div className="cart-item-qty-row">
                            <button
                              className="qty-btn"
                              onClick={() => updateQty(it.productId, it.quantity - 1)}
                              disabled={it.quantity <= 1}
                              aria-label="Decrease"
                            >
                              −
                            </button>
                            <span className="cart-item-qty">{it.quantity}</span>
                            <button
                              className="qty-btn"
                              onClick={() => updateQty(it.productId, it.quantity + 1)}
                              disabled={it.quantity >= it.snapshot.stock}
                              aria-label="Increase"
                            >
                              +
                            </button>
                          </div>
                          <span className="cart-item-line-price">
                            €{(it.snapshot.price * it.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="cart-footer">
                {discount > 0 && (
                  <div className="cart-discount-applied">{t('cart.discountApplied')}</div>
                )}
                <Row label={t('cart.subtotal')} value={`€${subtotal.toFixed(2)}`} />
                {discount > 0 && <Row label={t('cart.discount')} value={`−€${discount.toFixed(2)}`} color="#5CC0BE" />}
                <Row
                  label={t('cart.shipping')}
                  value={shipping === 0 ? t('cart.free') : `€${shipping.toFixed(2)}`}
                  color={shipping === 0 ? '#5CC0BE' : undefined}
                />
                <Row label={t('cart.vat')} value={TAX_RATE === 0 ? t('cart.vatValue') : `€${(afterDiscount * TAX_RATE).toFixed(2)}`} />
                <div className="cart-total-row">
                  <span className="cart-total-label">{t('cart.total')}</span>
                  <span className="cart-total-value">€{total.toFixed(2)}</span>
                </div>
                <button
                  className="btn-cta cart-checkout-btn"
                  onClick={() => {
                    setOpen(false);
                    navigate('/checkout');
                  }}
                >
                  {t('cart.checkout')}
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate('/cart');
                  }}
                  className="cart-view-cart-btn"
                >
                  {t('btn.viewCart')}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="cart-row">
      <span>{label}</span>
      <span className={color ? 'cart-row-teal' : undefined} style={color && color !== '#5CC0BE' ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
