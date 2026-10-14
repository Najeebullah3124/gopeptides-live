declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

// Immediately initialize the Google Analytics dataLayer and gtag queue on the client side.
// This allows tracking calls to be queued immediately, even before the script finishes loading.
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/**
 * Dynamically loads Google Analytics (gtag.js) script.
 */
export function initGoogleAnalytics(measurementId: string): void {
  if (typeof window === 'undefined') return;
  // Called once the visitor accepts cookies: lift the Consent Mode v2 defaults (denied) that the
  // server renders into every page (backend seoHtmlService buildAnalyticsScript).
  try {
    window.gtag?.('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  } catch {
    // never block the page on analytics
  }
  if (!measurementId) return;

  const scriptId = 'google-analytics-script';

  // If already loaded, do not load again
  if (document.getElementById(scriptId)) return;

  try {
    // 1. Configure default tracking config
    if (window.gtag) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        page_path: window.location.pathname,
      });
      window.gtag('config', 'AW-18369431565'); // Google Ads
    }

    // 2. Create and inject script tag for gtag.js
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  } catch (error) {
    console.error('Failed to load Google Analytics script:', error);
  }
}

/**
 * Tracks a page view event.
 */
export function trackGAPageView(path: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
    });
  }
}

/**
 * Tracks a custom event.
 */
export function trackGAEvent(action: string, category: string, label?: string, value?: number): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}
