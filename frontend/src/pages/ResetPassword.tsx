import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useResetPassword } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';

const schema = z.object({
  code: z.string().length(6, 'Valid 6-digit code required'),
  password: z
    .string()
    .min(8, 'passwordMin')
    .regex(/[A-Z]/, 'passwordUpper')
    .regex(/[0-9]/, 'passwordNumber'),
});

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const { t } = useT();
  useSEO({ title: 'Reset Password' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetMut = useResetPassword();
  
  const emailParam = searchParams.get('email') || '';
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'passwordMin') return t('auth.validation.passwordMin');
    if (raw === 'passwordUpper') return t('auth.validation.passwordUpper');
    if (raw === 'passwordNumber') return t('auth.validation.passwordNumber');
    return raw;
  };

  const onSubmit = async (data: ResetForm) => {
    if (!emailParam) return;
    await resetMut.mutateAsync({ email: emailParam, code: data.code, password: data.password });
    navigate('/login');
  };

  if (!emailParam) {
    return (
      <div className="container-app py-16 text-center">
        <p className="text-ink-muted">No email specified. Please start the password reset process again.</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="container-app py-16 flex justify-center items-center min-h-[70vh]">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-4">
            <Icon name="lock" size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Reset Password</h1>
          <p className="text-ink-muted text-sm">
            Enter the 6-digit code sent to <strong className="text-ink">{emailParam}</strong> and your new password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Verification Code"
            type="text"
            placeholder="000000"
            className="font-mono tracking-[4px] font-bold text-center"
            {...register('code')}
            error={errors.code?.message}
          />
          <Input
            label={t('label.password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('auth.placeholder.password')}
            leftIcon={<Icon name="lock" size={16} />}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-ink-muted hover:text-ink"
                aria-label={showPassword ? 'Hide' : 'Show'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
              </button>
            }
            {...register('password')}
            error={errMsg(errors.password?.message)}
          />

          <Button type="submit" fullWidth size="lg" loading={resetMut.isPending} className="mt-2">
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
}
