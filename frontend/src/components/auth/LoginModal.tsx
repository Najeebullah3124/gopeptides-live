import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useUiStore } from '@/stores/uiStore';
import { useForgotPassword, useLogin } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('email'),
  password: z.string().min(1, 'required'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof schema>;

export function LoginModal() {
  const { t } = useT();
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.closeModal);
  const open = useUiStore((s) => s.openModal);
  const login = useLogin();
  const forgot = useForgotPassword();
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
      return;
    }
    await login.mutateAsync({ email: data.email, password: data.password });
    close();
    reset();
  };

  const isOpen = modal === 'login';

  return (
    <Modal
      open={isOpen}
      onClose={() => {
        close();
        reset();
        setForgotMode(false);
      }}
      title={forgotMode ? t('auth.forgot.title') : t('auth.login.title')}
      subtitle={forgotMode ? t('auth.forgot.subtitle') : t('auth.login.subtitle')}
      size="sm"
    >
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
            className="w-full text-center text-xs text-ink-muted hover:text-ink"
          >
            {t('auth.forgot.back')}
          </button>
        ) : (
          <p className="text-center text-xs text-ink-muted">
            {t('auth.login.noAccount')}{' '}
            <button
              type="button"
              onClick={() => {
                close();
                open('register');
              }}
              className="text-primary hover:text-primary-light font-semibold"
            >
              {t('auth.login.create')}
            </button>
          </p>
        )}
      </form>
    </Modal>
  );
}
