import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useVerifyEmail, useResendVerification } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';

export default function VerifyEmailPage() {
  const { t } = useT();
  useSEO({ title: 'Verify Email' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const verifyMut = useVerifyEmail();
  const resendMut = useResendVerification();
  const user = useAuthStore((s) => s.user);
  
  const emailParam = searchParams.get('email') || user?.email || '';
  const redirect = searchParams.get('redirect') || '/';

  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const onVerify = async () => {
    if (code.length !== 6) return;
    try {
      await verifyMut.mutateAsync({ email: emailParam, code });
      // update local user state
      if (user) {
        useAuthStore.getState().setUser({ ...user, emailVerified: true });
      }
      navigate(redirect);
    } catch {}
  };

  const onResend = async () => {
    if (cooldown > 0 || !emailParam) return;
    try {
      await resendMut.mutateAsync(emailParam);
      setCooldown(60);
    } catch {}
  };

  return (
    <div className="container-app py-16 flex justify-center items-center min-h-[70vh]">
      <div className="card p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-6">
          <Icon name="mail" size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Verify your email</h1>
        <p className="text-ink-muted text-sm mb-6">
          We sent a 6-digit verification code to <strong className="text-ink">{emailParam}</strong>. Please enter it below to activate your account.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="field text-center text-3xl tracking-[8px] font-mono h-16 w-full font-bold"
          />
          <Button fullWidth size="lg" onClick={onVerify} loading={verifyMut.isPending} disabled={code.length !== 6}>
            Verify Email
          </Button>

          <p className="text-xs text-ink-muted pt-4">
            Didn't receive the code?{' '}
            <button
              onClick={onResend}
              disabled={cooldown > 0 || resendMut.isPending}
              className="text-primary hover:text-primary-light font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
