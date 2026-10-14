import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { t } = useT();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const toast = useUiStore((s) => s.toast);
  const location = useLocation();

  useEffect(() => {
    if (!token || !user) {
      toast(t('toast.adminPlease'), 'info');
    }
  }, [token, user, toast, t]);

  if (!token || !user) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} state={{ from: location }} replace />;
  }

  if (user && !user.emailVerified) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/verify-email?redirect=${redirectParam}`} replace />;
  }

  return <>{children}</>;
}
