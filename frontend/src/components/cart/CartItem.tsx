import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useCartStore } from '@/stores/cartStore';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { useUiStore } from '@/stores/uiStore';
import type { LocalCartItem } from '@/types/cart';

interface CartItemProps {
  item: LocalCartItem;
  compact?: boolean;
}

export function CartItem({ item, compact }: CartItemProps) {
  const update = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.remove);
  const closeCart = useUiStore((s) => s.setCartOpen);

  return (
    <div className="flex gap-3.5 py-4 border-b border-lineSoft last:border-0">
      <Link
        to={`/${item.snapshot.slug}`}
        onClick={() => closeCart(false)}
        className="w-16 h-16 rounded-lg bg-bg border border-line overflow-hidden flex-shrink-0"
      >
        {item.snapshot.image ? (
          <img
            src={item.snapshot.image}
            alt={item.snapshot.name}
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary text-xs">
            <Icon name="flask" size={20} />
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/${item.snapshot.slug}`}
            onClick={() => closeCart(false)}
            className="text-sm font-semibold text-ink hover:text-primary truncate"
          >
            {item.snapshot.name}
          </Link>
          <button
            aria-label="Remove"
            onClick={() => remove(item.productId)}
            className="text-ink-muted hover:text-danger p-0.5"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">{item.snapshot.weight}</p>
        <div className={`flex items-center justify-between mt-${compact ? '2' : '3'}`}>
          <div className="inline-flex items-center bg-surfaceHi border border-line rounded-md">
            <button
              onClick={() => update(item.productId, item.quantity - 1)}
              className="px-2 py-1 text-ink-muted hover:text-primary disabled:opacity-50"
              disabled={item.quantity <= 1}
              aria-label="Decrease"
            >
              <Icon name="minus" size={12} />
            </button>
            <span className="px-2 text-xs font-bold text-ink min-w-[24px] text-center">{item.quantity}</span>
            <button
              onClick={() => update(item.productId, item.quantity + 1)}
              className="px-2 py-1 text-ink-muted hover:text-primary disabled:opacity-50"
              disabled={item.quantity >= item.snapshot.stock}
              aria-label="Increase"
            >
              <Icon name="plus" size={12} />
            </button>
          </div>
          <span className="text-sm font-bold text-ink">
            {formatCompactCurrency(item.quantity * item.snapshot.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
