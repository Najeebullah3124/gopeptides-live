import { useEffect, lazy, Suspense, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AgeGate } from './AgeGate';
import { MaintenanceGuard } from './MaintenanceGuard';
import { ToastViewport } from '@/components/ui/Toast';
import { trackingService } from '@/services/trackingService';
import { trackGAPageView, initGoogleAnalytics } from '@/utils/googleAnalytics';
import { LangRouteSync } from './LangRouteSync';
import { CookieConsent, getCookieConsent, type CookieConsentValue } from './CookieConsent';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';

const LoginModal = lazy(() => import('@/components/auth/LoginModal').then((m) => ({ default: m.LoginModal })));
const RegisterModal = lazy(() => import('@/components/auth/RegisterModal').then((m) => ({ default: m.RegisterModal })));
const CartDrawer = lazy(() => import('@/components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer })));
const FloatingWidgets = lazy(() => import('./FloatingWidgets').then((m) => ({ default: m.FloatingWidgets })));
const WelcomePopup = lazy(() => import('./WelcomePopup').then((m) => ({ default: m.WelcomePopup })));

export function Layout() {
  const location = useLocation();
  const modal = useUiStore((s) => s.modal);
  const cartOpen = useUiStore((s) => s.cartOpen);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const analyticsId = useSettingsStore((s) => s.analytics.googleAnalyticsId);
  const [extrasReady, setExtrasReady] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<CookieConsentValue | null>(() => getCookieConsent());

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const ready = () => window.setTimeout(() => setExtrasReady(true), 6000);
    if (document.readyState === 'complete') {
      ready();
      return;
    }
    window.addEventListener('load', ready, { once: true });
    return () => window.removeEventListener('load', ready);
  }, []);

  // GA only after cookie consent (GDPR). Necessary cookies still work without GA.
  useEffect(() => {
    if (!analyticsId || cookieConsent !== 'accepted') return;
    let loaded = false;
    let timer: number | undefined;
    const load = () => {
      if (loaded) return;
      loaded = true;
      initGoogleAnalytics(analyticsId);
    };
    const afterLoad = () => {
      timer = window.setTimeout(load, 12000);
    };
    const onInteract = () => load();
    const events = ['pointerdown', 'keydown', 'scroll'];
    events.forEach((event) => window.addEventListener(event, onInteract, { once: true, passive: true }));
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return () => {
      window.removeEventListener('load', afterLoad);
      events.forEach((event) => window.removeEventListener(event, onInteract));
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [analyticsId, cookieConsent]);

  useEffect(() => {
    if (cookieConsent !== 'accepted') return;
    const path = location.pathname + location.search;
    const track = () => {
      trackingService.pageView(path);
      trackGAPageView(path);
    };
    let idleId: number | undefined;
    const scheduleIdle = () => {
      if (typeof requestIdleCallback === 'function') {
        idleId = requestIdleCallback(track);
      } else {
        idleId = window.setTimeout(track, 2000) as unknown as number;
      }
    };
    if (document.readyState === 'complete') {
      scheduleIdle();
      return () => {
        if (idleId !== undefined) {
          if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
          else clearTimeout(idleId);
        }
      };
    }
    window.addEventListener('load', scheduleIdle, { once: true });
    return () => {
      window.removeEventListener('load', scheduleIdle);
      if (idleId !== undefined) {
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
        else clearTimeout(idleId);
      }
    };
  }, [location.pathname, location.search, cookieConsent]);

  useEffect(() => {
    document.getElementById('seo-fallback-heading')?.remove();
    document.getElementById('seo-managed-content')?.remove();
  }, [location.pathname, location.search]);

  return (
    <>
      <LangRouteSync />
      <Header />
      <main className="min-h-[calc(100vh-64px)] animate-fadeIn">
        <MaintenanceGuard>
          <Outlet />
        </MaintenanceGuard>
      </main>
      <Footer />
      {(cartOpen || extrasReady) && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}
      {extrasReady && (
        <Suspense fallback={null}>
          <FloatingWidgets />
          <WelcomePopup />
        </Suspense>
      )}
      {modal === 'login' && (
        <Suspense fallback={null}>
          <LoginModal />
        </Suspense>
      )}
      {modal === 'register' && (
        <Suspense fallback={null}>
          <RegisterModal />
        </Suspense>
      )}
      <ToastViewport />
      <AgeGate />
      <CookieConsent onChange={setCookieConsent} />
      <ScrollRestoration />
    </>
  );
}


