import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Stars } from '@/components/ui/Badge';
import { Vial } from './Vial';
import { useCartStore } from '@/stores/cartStore';
import { useUiStore } from '@/stores/uiStore';
import { useWishlistStatus, useToggleWishlist } from '@/hooks/useWishlist';
import { useT } from '@/hooks/useT';
import { useTranslatedProduct } from '@/hooks/useTranslatedProduct';
import { productImage } from '@/utils/helpers';
import { categoryLabel } from '@/utils/categoryLabel';
import { trackingService } from '@/services/trackingService';
import type { Product } from '@/types/product';


const ACCENTS = ['#5CC0BE', '#7BD3D1', '#4FAFAD', '#A8E6E4', '#0D7377'];
function accentFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % ACCENTS.length;
  return ACCENTS[h];
}

interface ProductCardProps {
  product: Product;
  rating?: number;
  reviewCount?: number;
  /** First visible card — eager load for LCP */
  priority?: boolean;
}

export function ProductCard({ product, rating = 0, reviewCount = 0, priority = false }: ProductCardProps) {
  const navigate = useNavigate();
  const { t } = useT();
  const add = useCartStore((s) => s.add);
  const toast = useUiStore((s) => s.toast);
  const flash = useUiStore((s) => s.flash);
  const flashing = useUiStore((s) => s.flashProductId === product.id);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const inWishlist = useWishlistStatus(product.id);
  const toggleWishlist = useToggleWishlist();

  const { name: translatedName, shortDesc: translatedShortDesc } = useTranslatedProduct(product);

  const accent = accentFor(translatedName);
  const url = productImage(product);
  const [imgFailed, setImgFailed] = useState(false);
  const [prevUrl, setPrevUrl] = useState(url);
  // Reset fallback when product/image URL changes (shop filter / pagination).
  if (url !== prevUrl) {
    setPrevUrl(url);
    setImgFailed(false);
  }
  const showPhoto = Boolean(url) && !imgFailed;
  const save = product.comparePrice && product.comparePrice > product.price
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0;

  const onAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      toast(t('product.outOfStock'), 'error');
      return;
    }
    add({
      productId: product.id,
      quantity: 1,
      snapshot: {
        name: translatedName,
        price: product.price,
        image: url,
        slug: product.slug,
        weight: product.weight,
        stock: product.stock,
      },
    });
    flash(product.id);
    trackingService.event('ADD_TO_CART', { entityId: product.id, label: product.name });
    toast(t('toast.addedToCart', { name: `1 × ${translatedName}` }), 'success');
    setCartOpen(true);
  };

  return (
    <div
      className={`card product-card${flashing ? ' product-card-flash' : ''}`}
      onClick={() => {
        navigate(`/${product.slug}`);
      }}
    >
      {/* Image area */}
      <div
        className="product-image-area"
        style={{ background: `radial-gradient(circle at 50% 60%, ${accent}10 0%, transparent 70%)` }}
      >
        {showPhoto ? (
          <img
            src={url!}
            alt={translatedName}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            width={240}
            height={240}
            fetchPriority={priority ? 'high' : 'low'}
            className="product-image"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Vial color={accent} size={90} />
        )}

        {/* Top-left badges */}
        <div className="product-badges">
          {product.badge && (
            <span className="product-badge-gold">
              {product.badge}
            </span>
          )}
          {save > 0 && (
            <span className="product-badge-sale">
              −{save}%
            </span>
          )}
        </div>

        {/* Top-right wishlist */}
        <button
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
            toast(inWishlist ? 'Removed from wishlist' : 'Added to wishlist', 'info');
          }}
          className={`product-wishlist-btn${inWishlist ? ' product-wishlist-btn-active' : ''}`}
        >
          {inWishlist ? '♥' : '♡'}
        </button>
      </div>

      {/* Body */}
      <div className="product-body">
        <div className="product-category">
          {categoryLabel(t, product.category?.slug, product.category?.name)}
        </div>
        <h3 className="product-name">{translatedName}</h3>
        <div className="product-meta">{product.purity} · {product.weight}</div>
        <div className="product-desc">
          {translatedShortDesc}
        </div>
        {reviewCount > 0 && (
          <div className="product-rating-row">
            <Stars rating={Math.round(rating)} size={12} />
            <span className="product-rating-text">
              {rating.toFixed(1)} ({reviewCount})
            </span>
          </div>
        )}
        {product.stock > 0 && product.stock < 15 && (
          <div className="product-low-stock">
            ● {t('product.onlyLeft', { n: product.stock })}
          </div>
        )}
        {product.stock <= 0 && (
          <div className="product-low-stock">● {t('product.outOfStock')}</div>
        )}

        <div className="product-price-row">
          <div>
            {product.comparePrice && product.comparePrice > product.price && (
              <div className="product-compare-price">
                €{product.comparePrice.toFixed(2)}
              </div>
            )}
            <div className="product-price">€{product.price.toFixed(2)}</div>
          </div>
          <button
            className="btn-cta product-add-btn"
            onClick={onAdd}
            disabled={product.stock <= 0}
          >
            {flashing ? `✓ ${t('btn.added')}` : t('product.toCart')}
          </button>
        </div>
      </div>
    </div>
  );
}
