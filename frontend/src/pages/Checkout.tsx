import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckoutSteps, CheckoutStep } from '@/components/checkout/CheckoutSteps';
import { ShippingForm, ShippingFormValues, toOrderAddress } from '@/components/checkout/ShippingForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { couponService } from '@/services/couponService';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { stashOrderConfirm } from '@/utils/orderConfirmStorage';
import { Icon } from '@/components/ui/Icon';

// Wallid + bank + EcomTrade24 hosted checkout (card / PayPal / iDEAL / crypto)
type PaymentMethodChoice = 'wallid' | 'bank_transfer' | 'ecomtrade24';

export default function CheckoutPage() {
  const { t } = useT();
  useSEO({ title: t('checkout.title') });
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const openModal = useUiStore((s) => s.openModal);
  const createOrder = useCreateOrder(!user);

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [shippingValues, setShippingValues] = useState<ShippingFormValues | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>('wallid');
  const storedCoupon = useCartStore((s) => s.appliedCoupon);
  const setStoredCoupon = useCartStore((s) => s.setAppliedCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState(storedCoupon?.code ?? '');
  const [previewDiscount, setPreviewDiscount] = useState(storedCoupon?.discountAmount ?? 0);
  const [expressQuote, setExpressQuote] = useState({ surcharge: 0, included: false, eligible: false, country: '' });
  const onExpressQuote = useCallback(
    (q: { surcharge: number; included: boolean; eligible: boolean; country: string }) => {
      setExpressQuote((prev) =>
        prev.surcharge === q.surcharge &&
        prev.included === q.included &&
        prev.eligible === q.eligible &&
        prev.country === q.country
          ? prev
          : q,
      );
    },
    [],
  );
  const [redirectingPay, setRedirectingPay] = useState(false);

  useEffect(() => {
    if (storedCoupon) {
      setAppliedCoupon(storedCoupon.code);
      setPreviewDiscount(storedCoupon.discountAmount);
    }
  }, [storedCoupon]);

  useEffect(() => {
    if (!appliedCoupon) return;
    let cancelled = false;
    couponService.validate(appliedCoupon, subtotal).then((result) => {
      if (cancelled) return;
      setPreviewDiscount(result.discountAmount);
      setStoredCoupon({ code: result.code, discountAmount: result.discountAmount });
    }).catch(() => {
      if (cancelled) return;
      setAppliedCoupon('');
      setPreviewDiscount(0);
      setStoredCoupon(null);
    });
    return () => { cancelled = true; };
  }, [subtotal, appliedCoupon, setStoredCoupon]);

  useEffect(() => {
    if (user && !user.emailVerified) {
      navigate('/verify-email?redirect=/checkout', { replace: true });
    } else if (items.length === 0 && step !== 'confirmation' && !redirectingPay) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, step, navigate, user, redirectingPay]);

  const afterDiscount = Math.max(0, subtotal - previewDiscount);

  const submitShipping = async (values: ShippingFormValues) => {
    setShippingValues(values);
    const payload = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      shippingAddress: toOrderAddress(values),
      couponCode: appliedCoupon || undefined,
      guestEmail: !user ? values.email : undefined,
      paymentMethod,
      expressDelivery: !!values.expressDelivery,
    };
    try {
      const result = await createOrder.mutateAsync(payload);

      if (paymentMethod === 'bank_transfer') {
        if (!result.bankTransferDetails) {
          toast(t('checkout.bankTransferMissing'), 'error');
          return;
        }
        stashOrderConfirm({ order: result.order, bankTransferDetails: result.bankTransferDetails });
        navigate(`/order-confirmation?orderId=${result.order.id}`, { replace: true });
        return;
      }

      if (paymentMethod === 'wallid') {
        if (!result.wallidRedirectUrl) {
          toast(t('checkout.wallidMissing'), 'error');
          return;
        }
        stashOrderConfirm({ order: result.order });
        setRedirectingPay(true);
        window.location.assign(result.wallidRedirectUrl);
        return;
      }

      if (paymentMethod === 'ecomtrade24') {
        if (!result.ecomtradeRedirectUrl) {
          toast(t('checkout.ecomtradeMissing'), 'error');
          return;
        }
        stashOrderConfirm({ order: result.order });
        setRedirectingPay(true);
        window.location.assign(result.ecomtradeRedirectUrl);
        return;
      }
    } catch {
      // toast handled in hook
    }
  };

  const methodBtn = (method: PaymentMethodChoice, active: boolean) =>
    `flex items-center justify-center p-4 border rounded-xl font-medium transition-all text-center ${
      active
        ? 'border-primary bg-primary/[0.04] text-primary shadow-sm'
        : 'border-divider hover:border-ink-muted text-ink-muted'
    }`;

  return (
    <div className="container-app py-10">
      <h1 className="text-3xl font-extrabold text-ink text-center mb-2">{t('checkout.title')}</h1>
      <p className="text-sm text-ink-muted text-center mb-8">
        {user ? t('checkout.signedInAs', { email: user.email }) : t('checkout.guestNote')}
      </p>

      {!user && step === 'shipping' && (
        <div className="checkout-guest-banner">
          <div className="checkout-guest-banner-text">
            <Icon name="user" size={16} />
            <span>{t('checkout.guestBanner')}</span>
          </div>
          <button className="btn-out btn-sm" onClick={() => openModal('login')}>
            {t('btn.login')}
          </button>
        </div>
      )}

      <CheckoutSteps current={step} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-8 max-w-5xl mx-auto">
        <div>
          {step === 'shipping' && (
            <div className="card p-6">
              <div className="mb-6 pb-6 border-b border-divider">
                <h3 className="text-lg font-bold text-ink mb-3">{t('checkout.paymentMethod')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallid')}
                    className={methodBtn('wallid', paymentMethod === 'wallid')}
                  >
                    <img
                      src="/wallid-logo-64.webp"
                      alt=""
                      width={20}
                      height={20}
                      className="mr-2 h-5 w-5 shrink-0 rounded-sm object-contain"
                      decoding="async"
                    />
                    {t('checkout.method.wallid')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ecomtrade24')}
                    className={methodBtn('ecomtrade24', paymentMethod === 'ecomtrade24')}
                  >
                    <Icon name="lock" size={18} className="mr-2 shrink-0" />
                    {t('checkout.method.ecomtrade24')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={methodBtn('bank_transfer', paymentMethod === 'bank_transfer')}
                  >
                    <Icon name="document" size={18} className="mr-2 shrink-0" />
                    {t('checkout.method.bankTransfer')}
                  </button>
                </div>
                {paymentMethod === 'wallid' && (
                  <p className="mt-3 text-sm text-ink-muted">{t('checkout.wallidHint')}</p>
                )}
                {paymentMethod === 'ecomtrade24' && (
                  <p className="mt-3 text-sm text-ink-muted">{t('checkout.ecomtradeHint')}</p>
                )}
                {paymentMethod === 'bank_transfer' && (
                  <p className="mt-3 text-sm text-ink-muted">{t('checkout.bankTransferHint')}</p>
                )}
              </div>

              <ShippingForm
                defaultValues={shippingValues || undefined}
                defaultEmail={user?.email}
                afterDiscount={afterDiscount}
                onQuoteChange={onExpressQuote}
                onSubmit={submitShipping}
              />
            </div>
          )}
        </div>

        <OrderSummary
          appliedCoupon={appliedCoupon}
          discount={previewDiscount}
          extraShipping={expressQuote.surcharge}
          expressIncluded={expressQuote.included}
          country={expressQuote.country || undefined}
          onApplyCoupon={(c, discountAmount) => {
            setAppliedCoupon(c);
            setPreviewDiscount(discountAmount);
            setStoredCoupon({ code: c, discountAmount });
          }}
          onClearCoupon={() => {
            setAppliedCoupon('');
            setPreviewDiscount(0);
            setStoredCoupon(null);
          }}
        />
      </div>
    </div>
  );
}
