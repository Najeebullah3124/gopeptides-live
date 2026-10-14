import { cn } from '@/utils/helpers';

type BadgeTone = 'primary' | 'gold' | 'danger' | 'success' | 'muted' | 'accent';

const tones: Record<BadgeTone, string> = {
  primary: 'bg-primary/15 text-primary border border-primary/30',
  gold: 'bg-gold/15 text-gold border border-gold/30',
  danger: 'bg-danger/15 text-danger border border-danger/30',
  success: 'bg-success/15 text-success border border-success/30',
  muted: 'bg-surfaceAlt text-ink-muted border border-line',
  accent: 'bg-accent/30 text-ink border border-line',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'muted', children, className }: BadgeProps) {
  return <span className={cn('badge', tones[tone], className)}>{children}</span>;
}

interface StarsProps {
  rating: number;
  size?: number;
  className?: string;
}

export function Stars({ rating, size = 13, className }: StarsProps) {
  const full = Math.round(rating);
  return (
    <span className={cn('stars inline-flex items-center', className)} style={{ fontSize: size }} aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i > full ? 'empty' : undefined}>
          ★
        </span>
      ))}
    </span>
  );
}
