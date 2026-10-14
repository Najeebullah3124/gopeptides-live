import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { COUNTRIES } from '@/constants';
import { useCreateAddress, useUpdateAddress } from '@/hooks/useUser';
import { useT } from '@/hooks/useT';
import type { Address, AddressInput } from '@/types/address';

const schema = z.object({
  firstName: z.string().min(1, 'required').max(50),
  lastName: z.string().min(1, 'required').max(50),
  street: z.string().min(1, 'required').max(200),
  city: z.string().min(1, 'required').max(80),
  postalCode: z.string().min(1, 'required').max(20),
  country: z.string().min(2, 'required'),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});
type AddressForm = z.infer<typeof schema>;

interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Address | null;
}

export function AddressFormModal({ open, onClose, editing }: AddressFormModalProps) {
  const { t } = useT();
  const create = useCreateAddress();
  const update = useUpdateAddress();

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'required') return t('auth.validation.required');
    return raw;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Netherlands' },
  });

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              firstName: editing.firstName,
              lastName: editing.lastName,
              street: editing.street,
              city: editing.city,
              postalCode: editing.postalCode,
              country: editing.country,
              phone: editing.phone || '',
              isDefault: editing.isDefault,
            }
          : { country: 'Netherlands', isDefault: false },
      );
    }
  }, [open, editing, reset]);

  const submit = async (data: AddressForm) => {
    const payload: AddressInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone || undefined,
      isDefault: data.isDefault,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('addresses.modal.edit') : t('addresses.modal.new')}
      size="md"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label={t('label.firstName')} {...register('firstName')} error={errMsg(errors.firstName?.message)} />
          <Input label={t('label.lastName')} {...register('lastName')} error={errMsg(errors.lastName?.message)} />
        </div>
        <Input label={t('label.street')} {...register('street')} error={errMsg(errors.street?.message)} />
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label={t('label.postalCode')} {...register('postalCode')} error={errMsg(errors.postalCode?.message)} />
          <Input label={t('label.city')} className="sm:col-span-2" {...register('city')} error={errMsg(errors.city?.message)} />
        </div>
        <Select
          label={t('label.country')}
          {...register('country')}
          options={COUNTRIES.map((c) => ({ value: c, label: c }))}
          error={errMsg(errors.country?.message)}
        />
        <Input label={t('checkout.phoneOptional')} type="tel" {...register('phone')} />

        <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
          <input
            type="checkbox"
            {...register('isDefault')}
            className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30"
          />
          {t('addresses.setDefault')}
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('btn.cancel')}
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending} className="flex-1">
            {editing ? t('btn.save') : t('addresses.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
