import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';

interface PaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
  amountLabel: string;
}

export function PaymentForm({ onSuccess, onBack, amountLabel }: PaymentFormProps) {
  const { t } = useT();
  const stripe = useStripe();
  const elements = useElements();
  const toast = useUiStore((s) => s.toast);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/order-confirmation` },
    });

    if (error) {
      const msg = error.message || t('checkout.paymentFailed');
      setMessage(msg);
      toast(msg, 'error');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onSuccess(paymentIntent.id);
    } else {
      setMessage(t('checkout.paymentIncomplete'));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'ideal', 'bancontact', 'sepa_debit'],
          }}
        />
      </div>

      {message && (
        <div className="card p-3 border-danger/40 bg-danger/[0.08] text-sm text-danger flex items-center gap-2">
          <Icon name="warning" size={14} />
          {message}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Icon name="shield" size={12} className="text-primary" />
        {t('checkout.secure')}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="secondary" onClick={onBack} disabled={submitting} className="sm:flex-shrink-0">
          <Icon name="arrowLeft" size={14} />
          {t('checkout.backToShipping')}
        </Button>
        <Button type="submit" size="lg" loading={submitting} disabled={!stripe || !elements} className="flex-1">
          {t('checkout.pay', { amount: amountLabel })}
          <Icon name="lock" size={14} />
        </Button>
      </div>
    </form>
  );
}
