import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/helpers';
import type { OrderStatus } from '@/types/order';

interface StatusTimelineProps {
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

const flow: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const iconFor: Record<OrderStatus, 'document' | 'check' | 'truck' | 'spark' | 'warning'> = {
  PENDING: 'document',
  PROCESSING: 'check',
  SHIPPED: 'truck',
  DELIVERED: 'spark',
  CANCELLED: 'warning',
  REFUNDED: 'warning',
};

const titleKey: Record<OrderStatus, string> = {
  PENDING: 'timeline.placed',
  PROCESSING: 'timeline.processing',
  SHIPPED: 'timeline.shipped',
  DELIVERED: 'timeline.delivered',
  CANCELLED: 'timeline.cancelled',
  REFUNDED: 'timeline.refunded',
};

const descKey: Record<OrderStatus, string> = {
  PENDING: 'timeline.placed.desc',
  PROCESSING: 'timeline.processing.desc',
  SHIPPED: 'timeline.shipped.desc',
  DELIVERED: 'timeline.delivered.desc',
  CANCELLED: 'timeline.cancelled.desc',
  REFUNDED: 'timeline.refunded.desc',
};

export function StatusTimeline({ status }: StatusTimelineProps) {
  const { t } = useT();

  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return (
      <div className="card p-5 border-danger/30 bg-danger/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger/15 border border-danger/40 flex items-center justify-center text-danger">
            <Icon name={iconFor[status]} size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-danger">{t(titleKey[status])}</p>
            <p className="text-xs text-ink-muted">{t(descKey[status])}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = flow.indexOf(status);

  return (
    <ol className="space-y-0">
      {flow.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const upcoming = i > currentIdx;

        return (
          <li key={s} className="flex gap-4 relative">
            {i !== flow.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-line" aria-hidden />
            )}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 border-2 z-10',
                done && 'bg-primary border-primary text-bg',
                active && 'border-primary text-primary bg-primary/15 animate-pulseGlow',
                upcoming && 'border-line text-ink-dim bg-surface',
              )}
            >
              {done ? <Icon name="check" size={12} /> : <Icon name={iconFor[s]} size={12} />}
            </div>
            <div className={cn('pb-6 flex-1', upcoming && 'opacity-50')}>
              <p className={cn('text-sm font-bold', active ? 'text-primary' : 'text-ink')}>{t(titleKey[s])}</p>
              <p className="text-xs text-ink-muted">{t(descKey[s])}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
