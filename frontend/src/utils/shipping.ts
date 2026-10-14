import { countryToIso2 } from './expressEu';

// Mirrors backend orderController shippingFeeFor / freeShippingThresholdFor — keep both in sync.
// NL/BE: €4.95 below €50, rest of Europe: €7.95 below €150 (express rules live in expressEu).
export const SHIPPING_NL_BE = { fee: 4.95, freeFrom: 50 };
export const SHIPPING_OTHER_EUROPE = { fee: 7.95, freeFrom: 150 };

let checkoutCountry: string | undefined;

/** Remember the country chosen in the checkout form so the cart views quote the same rate. */
export function setShippingCountry(country?: string): void {
  checkoutCountry = country;
}

function isNlOrBe(country?: string): boolean {
  const iso = countryToIso2(country);
  if (iso) return iso === 'NL' || iso === 'BE';
  if (country?.trim()) return false;
  // No country known yet: follow the domain (.nl/.be → NL/BE rates, .de/.eu → rest of Europe).
  return typeof window !== 'undefined' && /(^|\.)gopeptides\.(nl|be)$/.test(window.location.hostname);
}

export interface ShippingQuote {
  /** Order value from which shipping is free. */
  threshold: number;
  fee: number;
  /** Fee charged for this order value (0 once over the threshold or for an empty cart). */
  shipping: number;
}

export function shippingQuote(afterDiscount: number, country: string | undefined = checkoutCountry): ShippingQuote {
  const rule = isNlOrBe(country) ? SHIPPING_NL_BE : SHIPPING_OTHER_EUROPE;
  const shipping = afterDiscount <= 0 || afterDiscount >= rule.freeFrom ? 0 : rule.fee;
  return { threshold: rule.freeFrom, fee: rule.fee, shipping };
}
