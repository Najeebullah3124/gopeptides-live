import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/utils/helpers';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">{leftIcon}</span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'field',
            !!leftIcon && 'pl-10',
            !!rightSlot && 'pr-10',
            error && 'border-danger/60 focus:border-danger focus:ring-danger/20',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted">{rightSlot}</span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-dim">{hint}</p>
      ) : null}
    </div>
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  return (
    <div className="w-full">
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select
        id={selectId}
        ref={ref}
        className={cn('field appearance-none pr-10 cursor-pointer', error && 'border-danger/60', className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, rows = 4, ...rest },
  ref,
) {
  const generatedId = useId();
  const textId = id || generatedId;
  return (
    <div className="w-full">
      {label && <label htmlFor={textId} className="label">{label}</label>}
      <textarea
        id={textId}
        ref={ref}
        rows={rows}
        className={cn('field resize-y', error && 'border-danger/60', className)}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});
