import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types/product';

interface ProductGridProps {
  products?: Product[];
  loading?: boolean;
  skeletonCount?: number;
  empty?: React.ReactNode;
  className?: string;
}

export function ProductGrid({
  products = [],
  loading,
  skeletonCount = 8,
  empty,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
}: ProductGridProps) {
  if (loading) {
    return (
      <div className={className}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (!products.length) {
    return (
      empty || (
        <div className="card p-12 text-center">
          <p className="text-ink-muted">No products match your filters.</p>
        </div>
      )
    );
  }
  return (
    <div className={className}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
