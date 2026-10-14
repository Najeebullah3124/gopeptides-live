import { useEffect, useState, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { productService } from '@/services/productService';
import { useProduct, useProductVariants, useRelatedProducts } from '@/hooks/useProducts';
import { useProductReviews } from '@/hooks/useReviews';

import type { BreadcrumbList, Product, WithContext } from 'schema-dts';
import { JsonLd } from '@/components/seo/JsonLd';
import { AeoAnswer } from '@/components/seo/AeoAnswer';
import { AeoFaqList } from '@/components/seo/AeoFaqList';
import { aeoProductAnswer, aeoProductFaqs } from '@/content/aeoContent';
import type { AeoLang } from '@/content/aeoContent';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { useTranslatedProduct } from '@/hooks/useTranslatedProduct';
import { parseSeoData, labReportImagesFromSeo } from '@/utils/seoMeta';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Badge, Stars } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import { ProductImage } from '@/components/product/ProductImage';
import { ProductGrid } from '@/components/product/ProductGrid';
import { WriteReviewForm } from '@/components/product/WriteReviewForm';
import { useCartStore } from '@/stores/cartStore';
import { useUiStore } from '@/stores/uiStore';
import { useWishlistStatus, useToggleWishlist } from '@/hooks/useWishlist';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { categoryLabel } from '@/utils/categoryLabel';
import { cn, productImage, resolveImageUrl, stockStatus, timeAgo } from '@/utils/helpers';

type Tab = 'description' | 'benefits' | 'specs' | 'reviews';

/** Backend descriptionLinked marks internal links as labelhref (productController linkifyDescription). */
const LINK_MARKER = /([^]*)([^]*)/g;

function renderLinkedText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_MARKER)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <a key={`lnk${parts.length}`} href={match[2]} className="text-primary underline hover:no-underline">
        {match[1]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ProductDetailPage() {
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const aeoLang = (lang === 'de' || lang === 'en' ? lang : 'nl') as AeoLang;
  const { data: product, isLoading, error } = useProduct(urlSlug);
  const { data: related } = useRelatedProducts(product?.id);
  const { data: variants } = useProductVariants(product?.name, urlSlug);
  const { data: reviewsData } = useProductReviews(product?.id);
  const { name: translatedName, shortDesc: translatedShortDesc, description: translatedDescription } = useTranslatedProduct(
    product || { name: '', shortDesc: '', description: '', translations: '' }
  );
  const categoryName = product?.category?.name || '';

  const productInnerPath = product ? `/${product.slug}` : undefined;
  const pageSeo = usePageSeo(productInnerPath);
  const seoData = parseSeoData(product?.seoData);
  const labReportImages = labReportImagesFromSeo(product?.seoData);

  // seoData keeps nl in title/description/h1 and en/de in the *En/*De fields (one per domain).
  const localizedSeoTitle = (lang === 'en' && seoData.titleEn) || (lang === 'de' && seoData.titleDe) || seoData.title;
  const localizedSeoDescription =
    (lang === 'en' && seoData.descriptionEn) || (lang === 'de' && seoData.descriptionDe) || seoData.description;
  const localizedH1 = (lang === 'en' && seoData.h1En) || (lang === 'de' && seoData.h1De) || seoData.h1;

  useSEO({
    title: localizedSeoTitle || translatedName,
    description: localizedSeoDescription || translatedShortDesc,
    image: seoData.socialImage || product?.images?.[0]?.url,
    canonical: seoData.canonicalUrl || pageSeo.canonical,
    keywords: seoData.focusKeywords,
    alternates: pageSeo.alternates,
  });
  const add = useCartStore((s) => s.add);
  const toast = useUiStore((s) => s.toast);
  const flash = useUiStore((s) => s.flash);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const inWishlist = useWishlistStatus(product?.id || '');
  const toggleWishlist = useToggleWishlist();

  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  const [imageIdx, setImageIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const benefitItems = Array.isArray(product?.benefits)
    ? product.benefits
    : typeof product?.benefits === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(product.benefits);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  useEffect(() => {
    setImageIdx(0);
    setDirection(0);
  }, [product?.id]);

  // Auto-scroll product photos only — never auto-advance onto a CoA scan.
  useEffect(() => {
    if (!product || labReportImages.length > 0) return;
    if (!product.images || product.images.length <= 1) return;
    const interval = setInterval(() => {
      setDirection(1);
      setImageIdx((prev) => (prev + 1) % product.images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [product, imageIdx, labReportImages.length]);

  // Smooth scroll active thumbnail into view
  useEffect(() => {
    thumbnailRefs.current[imageIdx]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [imageIdx]);

  useEffect(() => {
    if (product?.id) {
      productService.trackView(product.id).catch(() => {});
    }
  }, [product?.id]);

  const [redirectChecked, setRedirectChecked] = useState(false);
  
  useEffect(() => {
    if (!error && product) return;
    if (!urlSlug) { setRedirectChecked(true); return; }
    fetch(`/api/seo/check-redirect?path=${encodeURIComponent('/' + urlSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.redirect) {
          window.location.replace(data.redirect);
        } else {
          setRedirectChecked(true);
        }
      })
      .catch(() => setRedirectChecked(true));
  }, [error, product, urlSlug]);

  if (isLoading) {
    return (
      <div className="container-app py-10">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    if (!redirectChecked) return null;
    return (
      <div className="container-app py-20 text-center">
        <h1 className="text-2xl font-bold text-ink mb-2">{t('product.notFound')}</h1>
        <p className="text-ink-muted mb-6">{t('product.notFoundDesc')}</p>
        <Link to="/shop" className="btn-cta">
          {t('product.backToShop')}
        </Link>
      </div>
    );
  }

  const status = stockStatus(product.stock);
  const images = product.images.length > 0 ? product.images : [];
  const slides = [
    ...images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt || translatedName,
      kind: 'product' as const,
    })),
    ...labReportImages.map((url, i) => ({
      id: `lab-${i}`,
      url,
      alt: `${translatedName} lab report`,
      kind: 'lab' as const,
    })),
  ];
  const safeIdx = slides.length ? imageIdx % slides.length : 0;
  const currentSlide = slides[safeIdx];

  const onAdd = () => {
    if (product.stock <= 0) {
      toast(t('product.outOfStock'), 'error');
      return;
    }
    add({
      productId: product.id,
      quantity: qty,
      snapshot: {
        name: translatedName,
        price: product.price,
        image: productImage(product),
        slug: product.slug,
        weight: product.weight,
        stock: product.stock,
      },
    });
    flash(product.id);
    toast(t('toast.addedToCart', { name: `${qty} × ${translatedName}` }), 'success');
    setCartOpen(true);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'description', label: t('product.tab.description') },
    { id: 'benefits', label: t('product.tab.benefits') },
    { id: 'specs', label: t('product.tab.specs') },
    { id: 'reviews', label: `${t('product.tab.reviews')} (${product.stats.reviewCount})` },
  ];

  const breadcrumbItems = [
    { label: t('nav.home') || 'Home', to: '/' },
    { label: t('nav.shop') || 'Shop', to: '/shop' },
    { label: 'Peptides', to: '/shop' },
    ...(product.category ? [{
      label: categoryLabel(t, product.category.slug, categoryName),
      to: `/shop/${product.category.slug}`
    }] : []),
    { label: translatedName },
  ];

  const breadcrumbJsonLd: WithContext<BreadcrumbList> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': item.label,
      ...(item.to ? { 'item': `https://gopeptides.nl${item.to}` } : {}),
    })),
  };

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': translatedName,
    'image': images.map((img) => img.url.startsWith('http') ? img.url : `https://gopeptides.nl${img.url}`),
    'description': translatedShortDesc || product.shortDesc,
    'sku': product.sku,
    'brand': {
      '@type': 'Brand',
      'name': 'GoPeptides',
    },
    'offers': {
      '@type': 'Offer',
      'url': `https://gopeptides.nl/${product.slug}`,
      'priceCurrency': 'EUR',
      'price': product.price,
      'priceValidUntil': '2027-12-31',
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.stats.reviewCount > 0 ? {
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': product.stats.averageRating || 5,
        'reviewCount': product.stats.reviewCount,
        'bestRating': 5,
        'worstRating': 1,
      }
    } : {}),
    ...(reviewsData?.data && reviewsData.data.length > 0 ? {
      'review': reviewsData.data.slice(0, 5).map((r) => ({
        '@type': 'Review',
        'author': {
          '@type': 'Person',
          'name': r.user ? `${r.user.firstName} ${r.user.lastName.charAt(0)}.` : r.guestName || 'Anonymous',
        },
        'datePublished': r.createdAt,
        'reviewBody': r.body,
        'name': r.title,
        'reviewRating': {
          '@type': 'Rating',
          'ratingValue': r.rating,
          'bestRating': 5,
          'worstRating': 1,
        }
      }))
    } : {}),
    'additionalProperty': [
      ...(product.casNumber ? [{ '@type': 'PropertyValue', 'name': 'CAS-nummer', 'value': product.casNumber }] : []),
      ...(product.purity ? [{ '@type': 'PropertyValue', 'name': 'Zuiverheid', 'value': product.purity }] : []),
      ...(product.weight ? [{ '@type': 'PropertyValue', 'name': 'Molecuulgewicht', 'value': product.weight }] : []),
      ...(product.sequence ? [{ '@type': 'PropertyValue', 'name': 'Sequence', 'value': product.sequence }] : []),
    ]
  };

  return (
    <div className="container-app py-10">
      <JsonLd data={[breadcrumbJsonLd, productJsonLd as WithContext<Product>]} />
      <Breadcrumb items={breadcrumbItems} />

      <div className="grid lg:grid-cols-2 gap-10 mt-6">
        {/* Gallery */}
        <div>
          <div className="aspect-square rounded-card bg-white border border-line overflow-hidden relative group cursor-grab active:cursor-grabbing touch-pan-y">
            {product.badge && (
              <div className="absolute top-4 left-4 z-10">
                <Badge tone="primary">{product.badge}</Badge>
              </div>
            )}
            
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={currentSlide?.id ?? safeIdx}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? '100%' : '-100%',
                      opacity: 0,
                    }),
                    center: {
                      x: 0,
                      opacity: 1,
                    },
                    exit: (dir: number) => ({
                      x: dir < 0 ? '100%' : '-100%',
                      opacity: 0,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (slides.length <= 1) return;
                    const swipeThreshold = 50;
                    if (info.offset.x < -swipeThreshold) {
                      setDirection(1);
                      setImageIdx((prev) => (prev + 1) % slides.length);
                    } else if (info.offset.x > swipeThreshold) {
                      setDirection(-1);
                      setImageIdx((prev) => (prev - 1 + slides.length) % slides.length);
                    }
                  }}
                  className="absolute inset-0 w-full h-full flex items-center justify-center bg-white"
                >
                  {currentSlide?.kind === 'lab' ? (
                    <img
                      src={resolveImageUrl(currentSlide.url)}
                      alt={currentSlide.alt}
                      className="w-full h-full object-contain p-4"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ProductImage product={product} src={currentSlide?.url} size={300} className="mix-blend-normal" />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {currentSlide?.kind === 'lab' && (
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/90 border border-line px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink shadow-sm">
                {t('labresults.scanTitle')}
              </p>
            )}

            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDirection(-1);
                    setImageIdx((prev) => (prev - 1 + slides.length) % slides.length);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white text-ink w-10 h-10 rounded-full flex items-center justify-center border border-line shadow-md z-10"
                >
                  <Icon name="arrowLeft" size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDirection(1);
                    setImageIdx((prev) => (prev + 1) % slides.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md z-10"
                >
                  <Icon name="arrowRight" size={16} />
                </button>
              </>
            )}
          </div>
          {slides.length > 1 && (
            <div className="flex gap-2.5 mt-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-line">
              {slides.map((img, i) => (
                <button
                  key={img.id}
                  ref={(el) => (thumbnailRefs.current[i] = el)}
                  onClick={() => {
                    setDirection(i > safeIdx ? 1 : -1);
                    setImageIdx(i);
                  }}
                  className={cn(
                    'relative w-20 h-20 rounded-lg border-2 overflow-hidden transition-colors shrink-0 bg-white',
                    i === safeIdx ? 'border-primary' : 'border-line hover:border-primary/40',
                  )}
                >
                  <img
                    src={resolveImageUrl(img.url)}
                    alt={img.alt || ''}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    width={900}
                    height={900}
                    className={cn('w-full h-full', img.kind === 'lab' ? 'object-contain p-1' : 'object-cover')}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Link
              to={`/shop/${product.category.slug}`}
              className="text-[11px] font-bold uppercase tracking-[2px] text-primary mb-3 inline-block hover:text-primary-light"
            >
              {categoryLabel(t, product.category.slug, categoryName)}
            </Link>
          )}
          <h1 className="text-3xl lg:text-4xl font-extrabold text-ink leading-tight mb-3">
            {localizedH1 || translatedName}
          </h1>

          <AeoAnswer
            text={aeoProductAnswer(translatedName, product.weight, product.purity, aeoLang)}
          />

          <div className="flex items-center gap-4 mb-5 mt-4">
            <Stars rating={product.stats.averageRating || 5} size={15} />
            <span className="text-xs text-ink-muted">
              {product.stats.reviewCount} verified review{product.stats.reviewCount !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-ink-muted">·</span>
            <span className="text-xs text-ink-muted">SKU {product.sku}</span>
          </div>

          <p className="text-base text-ink-muted leading-relaxed mb-6">{translatedShortDesc}</p>

          {/* Price */}
          <div className="card p-5 mb-5">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-3xl font-extrabold text-ink">{formatCompactCurrency(product.price)}</span>
              {product.comparePrice && product.comparePrice > product.price && (
                <>
                  <span className="text-base text-ink-dim line-through">{formatCompactCurrency(product.comparePrice)}</span>
                  <Badge tone="danger">
                    Save {formatCompactCurrency(product.comparePrice - product.price)}
                  </Badge>
                </>
              )}
            </div>
            <p className="text-xs text-ink-muted notranslate" translate="no">{t('product.includesCoA')}</p>
          </div>

          {/* Dosage variant selector */}
          {variants && variants.length > 1 && (
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                {t('product.selectDose')}
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      if (v.isCurrent) return;
                      navigate(`/${v.slug}`);
                    }}
                    className={cn(
                      'px-4 py-2 rounded-btn text-sm font-semibold border transition-colors',
                      v.isCurrent
                        ? 'bg-primary text-bg border-primary cursor-default'
                        : 'border-line text-ink-muted hover:border-primary hover:text-primary',
                    )}
                  >
                    {v.weight}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-sm font-semibold', status.color)}>{status.label}</span>
              {product.stock > 0 && (
                <span className="text-xs text-ink-muted">{t('product.unitsLeft', { n: product.stock })}</span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-surfaceHi overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  status.color === 'text-primary' ? 'bg-primary' : status.color === 'text-gold' ? 'bg-gold' : 'bg-danger',
                )}
                style={{ width: `${status.pct}%` }}
              />
            </div>
          </div>

          {/* Add to cart */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="inline-flex items-center bg-surface border border-line rounded-btn h-12">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-4 h-full text-ink-muted hover:text-primary"
                aria-label="Decrease quantity"
              >
                <Icon name="minus" size={14} />
              </button>
              <span className="px-3 text-sm font-bold text-ink min-w-[40px] text-center">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock || 99, qty + 1))}
                className="px-4 h-full text-ink-muted hover:text-primary"
                aria-label="Increase quantity"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
            <Button size="lg" onClick={onAdd} disabled={product.stock <= 0} className="flex-1">
              <Icon name="cart" size={16} />
              {t('product.toCart')} · {formatCompactCurrency(product.price * qty)}
            </Button>
            <button
              onClick={() => {
                toggleWishlist(product.id);
                toast(inWishlist ? t('product.removedWishlist') : t('product.addedWishlist'), 'info');
              }}
              aria-label={t('site.wishlist')}
              className={cn(
                'h-12 w-12 inline-flex items-center justify-center rounded-btn border transition-colors',
                inWishlist
                  ? 'border-danger/50 bg-danger/15 text-danger'
                  : 'border-line text-ink-muted hover:text-danger hover:border-danger/40',
              )}
            >
              <Icon name="heart" size={18} />
            </button>
          </div>

          {/* Trust mini bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { i: 'beaker' as const, label: t('trust.hplc') },
              { i: 'document' as const, label: t('trust.coa') },
              { i: 'truck' as const, label: t('trust.delivery') },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs text-ink-muted">
                <Icon name={b.i} size={14} className="text-primary" />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AeoFaqList
        title={t('aeo.faqTitle')}
        items={aeoProductFaqs(translatedName, product.weight, product.purity, aeoLang)}
      />

      {/* Tabs */}
      <div className="mt-16">
        <div className="border-b border-line">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-8 max-w-3xl">
          {tab === 'description' && (
            <div className="space-y-4">
              {(product.descriptionLinked || translatedDescription).split(/\n\n+/).map((block, idx) => {
                const text = block.trim();
                const plain = text.replace(LINK_MARKER, '$1');
                // Short single-line blocks without end punctuation are section headings.
                const isHeading = plain.length > 0 && plain.length <= 60 && !plain.includes('\n') && !/[.!?]$/.test(plain);
                if (isHeading) {
                  return <h2 key={idx} className="text-lg font-bold text-ink mt-6 first:mt-0">{plain}</h2>;
                }
                return (
                  <p key={idx} className="text-sm text-ink leading-relaxed whitespace-pre-line">
                    {renderLinkedText(text)}
                  </p>
                );
              })}
            </div>
          )}

          {tab === 'benefits' && (
            <ul className="space-y-3">
              {benefitItems.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary mt-1 flex-shrink-0">
                    <Icon name="check" size={14} />
                  </span>
                  <span className="text-sm text-ink leading-relaxed">{b}</span>
                </li>
              ))}
              {benefitItems.length === 0 && (
                <p className="text-sm text-ink-muted">{t('product.benefits.empty')}</p>
              )}
            </ul>
          )}

          {tab === 'specs' && (
            <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
              {[
                [t('product.spec.purity'), product.purity],
                [t('product.spec.weight'), product.weight],
                [t('product.spec.cas'), product.casNumber],
                [t('product.spec.sku'), product.sku],
                [t('product.spec.storage'), product.storage || '-20°C, gelyofiliseerd'],
                [t('product.spec.sequence'), product.sequence || '—'],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-lineSoft py-2.5">
                  <dt className="text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">{k}</dt>
                  <dd className="text-sm text-ink mt-1 break-all">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'reviews' && (
            <div className="space-y-5">
              <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="text-center sm:text-left">
                  <div className="text-4xl font-extrabold text-primary">
                    {(reviewsData?.meta.averageRating || product.stats.averageRating || 0).toFixed(1)}
                  </div>
                  <Stars rating={reviewsData?.meta.averageRating || product.stats.averageRating || 0} size={14} />
                  <p className="text-[11px] text-ink-muted mt-1">
                    {(reviewsData?.meta.reviewCount ?? product.stats.reviewCount)} {t('reviews.eyebrow').toLowerCase()}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-ink-muted">{t('product.reviews.verifiedNotice')}</p>
                </div>
                <WriteReviewForm productId={product.id} />
              </div>

              {(reviewsData?.data?.length ?? 0) === 0 && (
                <p className="text-sm text-ink-muted">{t('product.reviews.empty')}</p>
              )}
              {(reviewsData?.data || []).map((r) => (
                <article key={r.id} className="card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Stars rating={r.rating} size={13} />
                      {r.verified && (
                        <span className="badge bg-success/10 text-success border border-success/30">
                          {t('reviews.verified')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-ink-muted">{timeAgo(r.createdAt)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-ink mb-2">{r.title}</h4>
                  <p className="text-sm text-ink-muted leading-relaxed mb-3">{r.body}</p>
                  <p className="text-[11px] text-ink-dim">
                    — {r.user ? `${r.user.firstName} ${r.user.lastName.charAt(0)}.` : r.guestName || 'Anonymous'}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-extrabold text-ink mb-6">{seoData.h2?.[0] || t('product.related')}</h2>
          <ProductGrid products={related} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" />
        </section>
      )}

      <SeoContentBlock seo={seoData} />
    </div>
  );
}
