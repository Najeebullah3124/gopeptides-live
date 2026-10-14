import { useUiStore } from '@/stores/uiStore';
import { Icon } from './Icon';
import { cn } from '@/utils/helpers';

const variantClasses = {
  success: 'border-primary/40 text-primary',
  error: 'border-danger/50 text-danger',
  info: 'border-line text-ink',
};

const variantIcons = {
  success: 'check',
  error: 'warning',
  info: 'info',
} as const;

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="fixed z-[200] top-4 right-4 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto bg-surface/95 backdrop-blur border rounded-card px-4 py-3 min-w-[280px] max-w-sm shadow-card flex items-start gap-3',
              variantClasses[t.variant],
            )}
          >
            <Icon name={variantIcons[t.variant]} size={18} className="mt-0.5 flex-shrink-0" />
            <p className="flex-1 text-sm text-ink leading-snug">{t.message}</p>
            <button
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="text-ink-muted hover:text-ink p-0.5"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
    </div>
  );
}
