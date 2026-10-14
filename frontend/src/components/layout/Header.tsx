import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { LangToggle } from './LangToggle';
import { Icon } from '@/components/ui/Icon';
import { NAV_LINKS } from '@/constants';
import { useUiStore } from '@/stores/uiStore';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';
import { useWishlistCount } from '@/hooks/useWishlist';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/helpers';
import { GoogleReviewBadge } from '@/components/ui/GoogleReviewBadge';

const SearchDropdown = lazy(() => import('./SearchDropdown').then((m) => ({ default: m.SearchDropdown })));

export function Header() {
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const searchOpen = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const openModal = useUiStore((s) => s.openModal);
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const cartCount = useCartStore((s) => s.count());
  const wishlistCount = useWishlistCount();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useT();

  useEffect(() => {
    if (!accountOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-account-menu]')) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [accountOpen]);

  const announcements = [
    { key: 'promo.waterNaalden', isHtml: true, isCombinedBadge: false },
    { key: 'promo.freeShipping', isHtml: true, isCombinedBadge: false },
    { key: 'promo.delivery', isHtml: false, isCombinedBadge: false },
    { key: '', isHtml: false, isCombinedBadge: true },
  ];

  const [activeAnnounceIdx, setActiveAnnounceIdx] = useState(0);
  const activeAnnouncement = announcements[activeAnnounceIdx];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAnnounceIdx((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-[100]">
      <div className="header-announce relative">
        {/* Desktop view: show all */}
        <div className="hidden md:flex items-center justify-center gap-4 flex-wrap w-full">
          <span className="promo-gratis" dangerouslySetInnerHTML={{ __html: t('promo.waterNaalden') }} />
          <span className="header-announce-sep">|</span>
          <span dangerouslySetInnerHTML={{ __html: t('promo.freeShipping') }} />
          <span className="header-announce-sep">|</span>
          <span>{t('promo.delivery')}</span>
          <span className="header-announce-sep">|</span>
          <GoogleReviewBadge compact aggregate labelType="combined" className="inline-flex shrink-0" />
          <span className="header-announce-sep">|</span>
          <GoogleReviewBadge compact aggregate={false} labelType="google" className="inline-flex shrink-0" />
        </div>

        {/* Mobile view: rotate/cycle with horizontal translation-friendly transitions */}
        <div className="md:hidden flex items-center gap-2 w-full">
          <div className="relative flex-1 flex items-center justify-center min-h-[16px] text-center overflow-hidden">
            <div
              key={activeAnnounceIdx}
              className="mobile-announce-item w-full text-center flex justify-center items-center text-[10px] font-medium tracking-wide"
            >
              {activeAnnouncement.isCombinedBadge ? (
                <GoogleReviewBadge compact aggregate labelType="combined" className="!bg-transparent !border-0 !p-0" />
              ) : activeAnnouncement.isHtml ? (
                <span dangerouslySetInnerHTML={{ __html: t(activeAnnouncement.key) }} />
              ) : (
                <span>{t(activeAnnouncement.key)}</span>
              )}
            </div>
          </div>
          <GoogleReviewBadge compact aggregate={false} labelType="google" className="flex shrink-0" />
        </div>
      </div>

      {/* Main nav */}
      <nav className="header-nav">
        <div className="flex items-center header-nav-left">
          <Logo />
          <div className="hidden lg:flex items-center header-nav-links">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => cn('nav-link', isActive && 'active')}
              >
                {t(l.key)}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex items-center header-nav-actions">
          <button aria-label="Search" onClick={() => setSearchOpen(!searchOpen)} className="btn-ghost">
            <Icon name="search" size={15} />
          </button>

          <button
            aria-label="Wishlist"
            onClick={() => navigate('/wishlist')}
            className="btn-ghost relative hidden sm:inline-flex"
          >
            <Icon name="heart" size={15} />
            {wishlistCount > 0 && <Counter value={wishlistCount} />}
          </button>

          {user ? (
            <div className="relative" data-account-menu>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="btn-ghost header-account-btn"
                aria-label="Account menu"
              >
                <span className="header-account-initial">
                  {user.firstName.charAt(0).toUpperCase()}
                </span>
              </button>
              {accountOpen && (
                  <div className="account-dropdown">
                    <div className="account-dropdown-header">
                      <p className="text-sm font-bold text-ink truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-ink-muted truncate">{user.email}</p>
                    </div>
                    <div className="account-dropdown-body">
                      {[
                        { to: '/account', label: t('nav.dashboard') || 'Dashboard' },
                        { to: '/account/orders', label: t('nav.orders') || 'Orders' },
                        { to: '/wishlist', label: t('site.wishlist') || 'Wishlist' },
                        { to: '/account/addresses', label: t('nav.addresses') || 'Addresses' },
                        ...(user.role === 'ADMIN' ? [{ to: '/admin', label: t('nav.adminPanel') || 'Admin panel' }] : []),
                      ].map((l) => (
                        <button
                          key={l.to}
                          onClick={() => {
                            setAccountOpen(false);
                            navigate(l.to);
                          }}
                          className="account-dropdown-item"
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        logout.mutate();
                      }}
                      className="account-dropdown-logout"
                    >
                      {t('btn.logout') || 'Log out'}
                    </button>
                  </div>
                )}
            </div>
          ) : (
            <button aria-label="Account" onClick={() => openModal('login')} className="btn-ghost">
              <Icon name="user" size={15} />
            </button>
          )}

          <button aria-label="Cart" onClick={() => setCartOpen(true)} className="btn-ghost relative">
            <Icon name="cart" size={15} />
            {cartCount > 0 && <Counter value={cartCount} />}
          </button>

          <button aria-label="Menu" onClick={() => setMobileMenuOpen(true)} className="btn-ghost lg:hidden">
            <Icon name="menu" size={15} />
          </button>
        </div>
      </nav>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDropdown />
        </Suspense>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden mobile-menu-overlay">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mobile-menu-top">
                <Logo />
                <button aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="btn-ghost sm">
                  <Icon name="close" size={16} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto mobile-menu-nav">
                {NAV_LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => cn('mobile-menu-link', isActive ? 'mobile-menu-link-active' : '')}
                  >
                    {t(l.key)}
                  </NavLink>
                ))}
                <div className="mobile-menu-lang">
                  <span className="label mobile-menu-lang-label">{t('lang.toggle')}</span>
                  <LangToggle />
                </div>
              </nav>
              <div className="mobile-menu-footer">
                {user ? (
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout.mutate(); }}
                    className="btn-out mobile-menu-btn-full"
                  >
                    {t('btn.logout')}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setMobileMenuOpen(false); openModal('login'); }}
                      className="btn-out mobile-menu-btn-center"
                    >
                      {t('btn.login')}
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); openModal('register'); }}
                      className="btn-cta mobile-menu-btn-center"
                    >
                      {t('btn.signup')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </header>
  );
}

function Counter({ value }: { value: number }) {
  return (
    <span className="header-counter">
      {value}
    </span>
  );
}
