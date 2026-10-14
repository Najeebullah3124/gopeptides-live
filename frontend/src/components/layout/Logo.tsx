import { Link } from 'react-router-dom';
import { cn } from '@/utils/helpers';

interface LogoProps {
  compact?: boolean;
  /** Larger rendering for the footer brand block. */
  large?: boolean;
}

/** Cropped logo.jpeg is ~2000×825 (~2.42:1). */
const LOGO_ASPECT = 2000 / 825;

export function Logo({ compact, large }: LogoProps) {
  const src = compact ? '/logo-168.webp' : '/logo-336.webp';
  // Client request: larger brand mark in header/footer
  const h = compact ? 40 : large ? 88 : 80;
  const w = Math.round(h * LOGO_ASPECT);

  return (
    <Link to="/" className="inline-flex items-center group notranslate" translate="no" aria-label="GoPeptides home">
      <img
        src={src}
        srcSet={compact ? '/logo-168.webp 168w' : '/logo-168.webp 168w, /logo-336.webp 336w'}
        sizes={compact ? `${w}px` : `(max-width: 640px) 180px, ${w}px`}
        alt="GoPeptides"
        width={w}
        height={h}
        fetchPriority="high"
        decoding="async"
        className={cn(
          'w-auto object-contain notranslate',
          compact ? 'h-10' : large ? 'h-[80px] sm:h-[88px]' : 'h-16 sm:h-20',
        )}
        translate="no"
      />
    </Link>
  );
}
