import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/helpers';

export type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

interface CheckoutStepsProps {
  current: CheckoutStep;
}

export function CheckoutSteps({ current }: CheckoutStepsProps) {
  const { t } = useT();

  const steps: { id: CheckoutStep; label: string; icon: 'truck' | 'lock' | 'check' }[] = [
    { id: 'shipping', label: t('checkout.step.shipping'), icon: 'truck' },
    { id: 'payment', label: t('checkout.step.payment'), icon: 'lock' },
    { id: 'confirmation', label: t('checkout.step.confirmation'), icon: 'check' },
  ];

  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.id} className="flex-1 flex items-center">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                  done && 'bg-primary border-primary text-bg',
                  active && 'border-primary text-primary bg-primary/10',
                  !done && !active && 'border-line text-ink-muted bg-surface',
                )}
              >
                {done ? <Icon name="check" size={14} /> : <Icon name={s.icon} size={14} />}
              </div>
              <span
                className={cn(
                  'text-sm font-semibold transition-colors hidden sm:inline',
                  active ? 'text-ink' : done ? 'text-ink-muted' : 'text-ink-dim',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn('flex-1 h-px mx-3 transition-colors', done ? 'bg-primary' : 'bg-line')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
