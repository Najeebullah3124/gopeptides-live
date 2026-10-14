import { NavLink, Outlet } from 'react-router-dom';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { cn } from '@/utils/helpers';

export function AccountLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { t } = useT();

  const navItems: Array<{ to: string; label: string; icon: 'spark' | 'document' | 'truck' | 'user' | 'heart'; end?: boolean }> = [
    { to: '/account', label: t('nav.dashboard'), icon: 'spark', end: true },
    { to: '/account/orders', label: t('nav.orders'), icon: 'document' },
    { to: '/account/addresses', label: t('nav.addresses'), icon: 'truck' },
    { to: '/account/profile', label: t('nav.profile'), icon: 'user' },
    { to: '/wishlist', label: t('site.wishlist'), icon: 'heart' },
  ];

  return (
    <AuthGuard>
      <div className="container-app py-10" style={{ padding: 'clamp(24px,5vw,40px) clamp(16px,5vw,40px)' }}>
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold">
                  {user?.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-ink-muted truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <nav className="card p-2">
              {navItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-ink-muted hover:text-ink hover:bg-surfaceAlt',
                    )
                  }
                >
                  <Icon name={n.icon} size={15} />
                  {n.label}
                </NavLink>
              ))}
              <div className="h-px bg-line my-2" />
              <button
                onClick={() => logout.mutate()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
              >
                <Icon name="close" size={15} />
                {t('btn.logout')}
              </button>
            </nav>
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
