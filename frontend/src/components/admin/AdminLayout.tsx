import { useEffect } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/helpers';
import { AdminSubscriberBell } from '@/components/admin/AdminSubscriberBell';

export function AdminLayout() {
  const { t } = useT();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const openModal = useUiStore((s) => s.openModal);
  const location = useLocation();

  const adminNav: Array<{ to: string; label: string; icon: 'spark' | 'document' | 'flask' | 'star' | 'globe'; end?: boolean }> = [
    { to: '/admin', label: t('nav.dashboard'), icon: 'spark', end: true },
    { to: '/admin/orders', label: t('admin.orders.title'), icon: 'document' },
    { to: '/admin/products', label: t('admin.products.title'), icon: 'flask' },
    { to: '/admin/categories', label: t('admin.categories.title') || 'Categories', icon: 'flask' },
    { to: '/admin/reviews', label: t('admin.reviews.title'), icon: 'star' },
    { to: '/admin/coupons', label: t('admin.coupons.title'), icon: 'spark' },
    { to: '/admin/blog', label: t('admin.nav.blog'), icon: 'document' },
    { to: '/admin/users', label: t('admin.nav.users'), icon: 'star' },
    { to: '/admin/analytics', label: t('admin.nav.analytics'), icon: 'spark' },
    { to: '/admin/subscribers', label: t('admin.nav.subscribers'), icon: 'document' },
    { to: '/admin/contact', label: t('admin.nav.contact'), icon: 'document' },
    { to: '/admin/labels', label: t('admin.nav.labels') || 'Labels', icon: 'document' },
    { to: '/admin/seo', label: 'SEO Center', icon: 'globe' },
    { to: '/admin/settings', label: t('admin.nav.settings') || 'Settings', icon: 'spark' },
  ];

  useEffect(() => {
    if (!token || !user) {
      toast(t('admin.access.required'), 'info');
      openModal('login');
    } else if (user.role !== 'ADMIN') {
      toast(t('admin.access.denied'), 'error');
    }
  }, [token, user, openModal, toast, t]);

  if (!token || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container-app py-10" style={{ padding: 'clamp(24px,5vw,40px) clamp(16px,5vw,40px)' }}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span className="badge bg-gold/15 text-gold border border-gold/30">{t('admin.tag')}</span>
          <h1 className="text-2xl font-extrabold text-ink truncate">{t('admin.controlPanel')}</h1>
        </div>
        <AdminSubscriberBell />
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="lg:sticky lg:top-24 self-start">
          <nav className="card p-2">
            {adminNav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-ink-muted hover:text-ink hover:bg-surfaceAlt',
                  )
                }
              >
                <Icon name={n.icon} size={14} />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
