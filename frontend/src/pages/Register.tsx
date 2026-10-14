import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useRegister } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { useSEO } from '@/hooks/useSEO';
import { useState } from 'react';

const schema = z.object({
  firstName: z.string().min(1, 'required').max(50),
  lastName: z.string().min(1, 'required').max(50),
  email: z.string().email('email'),
  password: z
    .string()
    .min(8, 'passwordMin')
    .regex(/[A-Z]/, 'passwordUpper')
    .regex(/[0-9]/, 'passwordNumber'),
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const { t } = useT();
  useSEO({ title: t('auth.register.title') });
  const registerMut = useRegister();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect') || '/';

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'required') return t('auth.validation.required');
    if (raw === 'email') return t('auth.validation.email');
    if (raw === 'passwordMin') return t('auth.validation.passwordMin');
    if (raw === 'passwordUpper') return t('auth.validation.passwordUpper');
    if (raw === 'passwordNumber') return t('auth.validation.passwordNumber');
    return raw;
  };

  const onSubmit = async (data: RegisterForm) => {
    await registerMut.mutateAsync(data);
    navigate(`/verify-email?redirect=${encodeURIComponent(redirect)}&email=${encodeURIComponent(data.email)}`);
  };

  return (
    <div className="container-app py-16 flex justify-center items-center min-h-[70vh]">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-4">
            <Icon name="user" size={24} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">{t('auth.register.title')}</h1>
          <p className="text-ink-muted text-sm">{t('auth.register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('label.firstName')}
              placeholder="John"
              {...register('firstName')}
              error={errMsg(errors.firstName?.message)}
            />
            <Input
              label={t('label.lastName')}
              placeholder="Doe"
              {...register('lastName')}
              error={errMsg(errors.lastName?.message)}
            />
          </div>
          <Input
            label={t('label.email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.placeholder.email')}
            leftIcon={<Icon name="mail" size={16} />}
            {...register('email')}
            error={errMsg(errors.email?.message)}
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

          <Button type="submit" fullWidth size="lg" loading={registerMut.isPending} className="mt-2">
            {t('auth.register.submit')}
          </Button>

          <p className="text-center text-xs text-ink-muted mt-4">
            {t('auth.register.hasAccount')}{' '}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary hover:text-primary-light font-semibold"
            >
              {t('auth.register.login')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
