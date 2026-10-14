import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { useUiStore } from '@/stores/uiStore';
import { useRegister } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';

const schema = z
  .object({
    firstName: z.string().min(1, 'required').max(50),
    lastName: z.string().min(1, 'required').max(50),
    email: z.string().email('email'),
    password: z
      .string()
      .min(8, 'pw.min')
      .regex(/[A-Z]/, 'pw.upper')
      .regex(/[0-9]/, 'pw.num'),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, { message: 'terms' }),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'pw.match' });

type RegisterForm = z.infer<typeof schema>;

export function RegisterModal() {
  const { t } = useT();
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.closeModal);
  const open = useUiStore((s) => s.openModal);
  const register = useRegister();

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'required') return t('auth.validation.required');
    if (raw === 'email') return t('auth.validation.email');
    if (raw === 'pw.min') return t('auth.validation.passwordMin');
    if (raw === 'pw.upper') return t('auth.validation.passwordUpper');
    if (raw === 'pw.num') return t('auth.validation.passwordNumber');
    if (raw === 'pw.match') return t('auth.validation.passwordMatch');
    if (raw === 'terms') return t('auth.validation.terms');
    return raw;
  };

  const {
    register: r,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: RegisterForm) => {
    await register.mutateAsync({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
    });
    close();
    reset();
  };

  return (
    <Modal
      open={modal === 'register'}
      onClose={() => {
        close();
        reset();
      }}
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('label.firstName')} placeholder="Alex" {...r('firstName')} error={errMsg(errors.firstName?.message)} />
          <Input label={t('label.lastName')} placeholder="Chen" {...r('lastName')} error={errMsg(errors.lastName?.message)} />
        </div>
        <Input
          label={t('label.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.placeholder.email')}
          leftIcon={<Icon name="mail" size={16} />}
          {...r('email')}
          error={errMsg(errors.email?.message)}
        />
        <Input
          label={t('label.password')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.placeholder.passwordMin')}
          leftIcon={<Icon name="lock" size={16} />}
          {...r('password')}
          error={errMsg(errors.password?.message)}
          hint={t('profile.pwHint')}
        />
        <Input
          label={t('profile.confirmPassword')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.placeholder.repeat')}
          leftIcon={<Icon name="lock" size={16} />}
          {...r('confirm')}
          error={errMsg(errors.confirm?.message)}
        />

        <label className="flex items-start gap-2.5 text-xs text-ink-muted cursor-pointer">
          <input
            type="checkbox"
            {...r('terms')}
            className="mt-0.5 rounded border-line bg-surfaceHi text-primary focus:ring-primary/30"
          />
          <span>
            {t('auth.register.terms.prefix')}{' '}
            <strong className="text-ink">{t('auth.register.terms.bold')}</strong>{' '}
            {t('auth.register.terms.suffix')}
          </span>
        </label>
        {errors.terms?.message && <p className="text-xs text-danger -mt-2">{errMsg(errors.terms.message)}</p>}

        <Button type="submit" fullWidth size="lg" loading={register.isPending}>
          {t('auth.register.submit')}
        </Button>

        <p className="text-center text-xs text-ink-muted">
          {t('auth.register.haveAccount')}{' '}
          <button
            type="button"
            onClick={() => {
              close();
              open('login');
            }}
            className="text-primary hover:text-primary-light font-semibold"
          >
            {t('btn.login')}
          </button>
        </p>
      </form>
    </Modal>
  );
}
