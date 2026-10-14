import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useForgotPassword, useLogin } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('email'),
  password: z.string().min(1, 'required'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useT();
  useSEO({ title: t('auth.login.title') });
  const login = useLogin();
  const forgot = useForgotPassword();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '/';

  const [forgotMode, setForgotMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'email') return t('auth.validation.email');
    if (raw === 'required') return t('auth.validation.passwordRequired');
    return raw;
  };

  const onSubmit = async (data: LoginForm) => {
    if (forgotMode) {
      await forgot.mutateAsync(data.email);
      setForgotMode(false);
      reset();
      navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
      return;
    }
    await login.mutateAsync({ email: data.email, password: data.password });
    navigate(redirect);
  };

  return (
    <div className="container-app py-16 flex justify-center items-center min-h-[70vh]">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-4">
            <Icon name={forgotMode ? 'mail' : 'lock'} size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">
            {forgotMode ? t('auth.forgot.title') : t('auth.login.title')}
          </h1>
          <p className="text-ink-muted text-sm">
            {forgotMode ? t('auth.forgot.subtitle') : t('auth.login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('label.email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.placeholder.email')}
            leftIcon={<Icon name="mail" size={16} />}
            {...register('email')}
            error={errMsg(errors.email?.message)}
          />
          {!forgotMode && (
            <Input
              label={t('label.password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
          )}
          {!forgotMode && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  {...register('remember')}
                  className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30"
                />
                {t('auth.login.remember')}
              </label>
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-xs text-primary hover:text-primary-light"
              >
                {t('auth.login.forgot')}
              </button>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={login.isPending || forgot.isPending}>
            {forgotMode ? t('auth.forgot.submit') : t('auth.login.submit')}
          </Button>

          {forgotMode ? (
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-center text-xs text-ink-muted hover:text-ink mt-4"
            >
              {t('auth.forgot.back')}
            </button>
          ) : (
            <p className="text-center text-xs text-ink-muted mt-4">
              {t('auth.login.noAccount')}{' '}
              <Link
                to={`/register?redirect=${encodeURIComponent(redirect)}`}
                className="text-primary hover:text-primary-light font-semibold"
              >
                {t('auth.login.create')}
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
