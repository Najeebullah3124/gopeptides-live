import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { useChangePassword, useUpdateProfile } from '@/hooks/useUser';
import { useT } from '@/hooks/useT';

const profileSchema = z.object({
  firstName: z.string().min(1, 'required').max(50),
  lastName: z.string().min(1, 'required').max(50),
  email: z.string().email('email'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'required'),
    newPassword: z
      .string()
      .min(8, 'pw.min')
      .regex(/[A-Z]/, 'pw.upper')
      .regex(/[0-9]/, 'pw.num'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { path: ['confirm'], message: 'pw.match' });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function AccountProfile() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'required') return t('auth.validation.required');
    if (raw === 'email') return t('auth.validation.email');
    if (raw === 'pw.min') return t('auth.validation.passwordMin');
    if (raw === 'pw.upper') return t('auth.validation.passwordUpper');
    if (raw === 'pw.num') return t('auth.validation.passwordNumber');
    if (raw === 'pw.match') return t('auth.validation.passwordMatch');
    return raw;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
      });
    }
  }, [user, reset]);

  const {
    register: pwRegister,
    handleSubmit: pwHandleSubmit,
    reset: pwReset,
    formState: { errors: pwErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onProfileSubmit = async (data: ProfileForm) => {
    await updateProfile.mutateAsync(data);
  };
  const onPwSubmit = async (data: PasswordForm) => {
    await changePassword.mutateAsync({ currentPassword: data.currentPassword, newPassword: data.newPassword });
    pwReset();
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink mb-2">{t('profile.title')}</h1>
      <p className="text-sm text-ink-muted mb-8">{t('profile.subtitle')}</p>

      <div className="space-y-5">
        <form onSubmit={handleSubmit(onProfileSubmit)} className="card p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-ink">{t('profile.personal')}</h2>
            {user && !user.emailVerified && (
              <span className="badge bg-gold/15 text-gold border border-gold/30">{t('profile.emailUnverified')}</span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('label.firstName')} {...register('firstName')} error={errMsg(errors.firstName?.message)} />
            <Input label={t('label.lastName')} {...register('lastName')} error={errMsg(errors.lastName?.message)} />
          </div>
          <Input
            label={t('label.email')}
            type="email"
            leftIcon={<Icon name="mail" size={16} />}
            {...register('email')}
            error={errMsg(errors.email?.message)}
            hint={t('profile.emailHint')}
          />
          <Input
            label={t('label.phone')}
            type="tel"
            placeholder="+31 ..."
            {...register('phone')}
            error={errMsg(errors.phone?.message)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
              {t('profile.saveChanges')}
            </Button>
          </div>
        </form>

        <form onSubmit={pwHandleSubmit(onPwSubmit)} className="card p-6 space-y-4">
          <h2 className="text-lg font-bold text-ink mb-2">{t('profile.changePassword')}</h2>
          <Input
            label={t('profile.currentPassword')}
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            leftIcon={<Icon name="lock" size={16} />}
            rightSlot={
              <button type="button" onClick={() => setShowCurrent((v) => !v)} className="text-ink-muted hover:text-ink">
                <Icon name={showCurrent ? 'eyeOff' : 'eye'} size={16} />
              </button>
            }
            {...pwRegister('currentPassword')}
            error={errMsg(pwErrors.currentPassword?.message)}
          />
          <Input
            label={t('profile.newPassword')}
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            leftIcon={<Icon name="lock" size={16} />}
            rightSlot={
              <button type="button" onClick={() => setShowNew((v) => !v)} className="text-ink-muted hover:text-ink">
                <Icon name={showNew ? 'eyeOff' : 'eye'} size={16} />
              </button>
            }
            {...pwRegister('newPassword')}
            error={errMsg(pwErrors.newPassword?.message)}
            hint={t('profile.pwHint')}
          />
          <Input
            label={t('profile.confirmPassword')}
            type="password"
            autoComplete="new-password"
            leftIcon={<Icon name="lock" size={16} />}
            {...pwRegister('confirm')}
            error={errMsg(pwErrors.confirm?.message)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={changePassword.isPending}>
              {t('profile.updatePassword')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
