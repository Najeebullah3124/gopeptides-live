import { api } from './api';

/**
 * Lightweight, fire-and-forget activity tracking. Failures are swallowed so
 * tracking never disrupts the user experience. Each call hits the public
 * (optionalAuth) analytics endpoints, so both logged-in and anonymous users
 * are recorded.
 */

function fire(promise: Promise<unknown>): void {
  promise.catch(() => {/* tracking must never throw */});
}

let lastPage = '';

export const trackingService = {
  /** Log a page visit. De-duplicates consecutive identical paths. */
  pageView(path: string): void {
    if (!path || path === lastPage) return;
    lastPage = path;
    fire(api.post('/analytics/page-view', { path }));
  },

  /** Log a product detail view (also increments ProductView for top-products). */
  productView(productId: string): void {
    if (!productId) return;
    fire(api.post(`/products/${productId}/view`, {}));
  },

  /** Log a custom interaction, e.g. ADD_TO_CART, CLICK_CTA, ADD_TO_WISHLIST. */
  event(action: string, opts: { label?: string; entityId?: string; path?: string } = {}): void {
    if (!action) return;
    fire(api.post('/analytics/event', {
      action,
      label: opts.label,
      entityId: opts.entityId,
      path: opts.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    }));
  },
};
