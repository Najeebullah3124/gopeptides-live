import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { useCreateReview } from '@/hooks/useReviews';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/helpers';

const schema = z.object({
  rating: z.number().int().min(1, 'Please rate the product').max(5),
  title: z.string().min(1, 'Required').max(120),
  body: z.string().min(10, 'At least 10 characters').max(2000),
  guestName: z.string().optional(),
  guestEmail: z.string().email().or(z.literal('')).optional(),
});
type WriteReviewForm = z.infer<typeof schema>;

interface WriteReviewFormProps {
  productId: string;
  onSubmitted?: () => void;
}

export function WriteReviewForm({ productId, onSubmitted }: WriteReviewFormProps) {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const createReview = useCreateReview();
  const [open, setOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WriteReviewForm>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, title: '', body: '', guestName: '', guestEmail: '' },
  });

  const rating = watch('rating');

  const submit = async (data: WriteReviewForm) => {
    await createReview.mutateAsync({
      productId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      guestName: user ? undefined : data.guestName,
      guestEmail: user ? undefined : data.guestEmail || undefined,
    });
    reset();
    setOpen(false);
    onSubmitted?.();
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Icon name="plus" size={13} />
        {t('reviews.write')}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="card p-5 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-ink">{t('review.write.share')}</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-ink-muted hover:text-ink"
          aria-label={t('btn.close')}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div>
        <span className="label">{t('review.write.rating')}</span>
        <div className="flex items-center gap-1 mt-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onClick={() => setValue('rating', n, { shouldValidate: true })}
              className={cn(
                'text-2xl transition-colors',
                (hoverRating || rating) >= n ? 'text-gold' : 'text-ink-faint hover:text-gold/60',
              )}
              aria-label={`${n} ★`}
            >
              ★
            </button>
          ))}
          <span className="ml-3 text-xs text-ink-muted">
            {rating ? `${rating} / 5` : t('review.write.ratePrompt')}
          </span>
        </div>
        {errors.rating?.message && <p className="text-xs text-danger mt-1">{errors.rating.message}</p>}
      </div>

      <Input
        label={t('review.write.title')}
        placeholder={t('review.write.titlePlaceholder')}
        {...register('title')}
        error={errors.title?.message}
      />
      <Textarea
        label={t('review.write.body')}
        placeholder={t('review.write.bodyPlaceholder')}
        rows={5}
        {...register('body')}
        error={errors.body?.message}
      />

      {!user && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('review.write.guestName')} placeholder="Dr. A. Onderzoeker" {...register('guestName')} />
          <Input label={t('review.write.guestEmail')} placeholder="jij@lab.edu" type="email" {...register('guestEmail')} />
        </div>
      )}

      <p className="text-[11px] text-ink-muted leading-relaxed">{t('review.write.disclaimer')}</p>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
          {t('btn.cancel')}
        </Button>
        <Button type="submit" loading={createReview.isPending} className="flex-1">
          {t('review.write.submit')}
        </Button>
      </div>
    </form>
  );
}
