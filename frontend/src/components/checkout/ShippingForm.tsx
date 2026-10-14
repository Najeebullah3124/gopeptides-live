import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import { useAddresses, useCreateAddress } from '@/hooks/useUser';
import { useT } from '@/hooks/useT';
import { COUNTRIES } from '@/constants';
import { EXPRESS_EU_FEE, quoteExpressEu } from '@/utils/expressEu';
import { setShippingCountry } from '@/utils/shipping';
import { cn } from '@/utils/helpers';
import type { OrderAddress } from '@/types/order';

const schema = z.object({
  firstName: z.string().min(1, 'required').max(50),
  lastName: z.string().min(1, 'required').max(50),
  email: z.string().email('email'),
  phone: z.string().optional(),
  street: z.string().min(1, 'required').max(200),
  city: z.string().min(1, 'required').max(80),
  postalCode: z.string().min(1, 'required').max(20),
  country: z.string().min(2, 'required'),
  saveAddress: z.boolean().optional(),
  consentResearch: z.literal(true, { errorMap: () => ({ message: 'consent' }) }),
  consentRole: z.literal(true, { errorMap: () => ({ message: 'consent' }) }),
  expressDelivery: z.boolean().optional(),
});

export type ShippingFormValues = z.infer<typeof schema>;

interface ShippingFormProps {
  defaultEmail?: string;
  defaultValues?: Partial<ShippingFormValues>;
  afterDiscount?: number;
  onQuoteChange?: (quote: { surcharge: number; included: boolean; eligible: boolean; country: string }) => void;
  onSubmit: (values: ShippingFormValues) => void;
}

export function ShippingForm({
  defaultEmail,
  defaultValues,
  afterDiscount = 0,
  onQuoteChange,
  onSubmit,
}: ShippingFormProps) {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const { data: addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>(COUNTRIES);

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const list = data.map((c: any) => c.name.common).sort((a: string, b: string) => a.localeCompare(b));
          setCountries(list);
        }
      })
      .catch(() => setCountries(COUNTRIES));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: 'Netherlands',
      email: defaultEmail || user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      saveAddress: false,
      expressDelivery: false,
      ...defaultValues,
    },
  });

  const country = watch('country');
  const expressOptIn = !!watch('expressDelivery');
  const expressQuote = quoteExpressEu(country, afterDiscount, expressOptIn);

  useEffect(() => {
    setShippingCountry(country);
    onQuoteChange?.({
      surcharge: expressQuote.surcharge,
      included: expressQuote.included,
      eligible: expressQuote.eligible,
      country,
    });
  }, [expressQuote.surcharge, expressQuote.included, expressQuote.eligible, country, onQuoteChange]);

  useEffect(() => {
    if (!expressQuote.eligible && expressOptIn) setValue('expressDelivery', false);
  }, [expressQuote.eligible, expressOptIn, setValue]);

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'required') return t('auth.validation.required');
    if (raw === 'email') return t('auth.validation.email');
    if (raw === 'consent') return t('checkout.consentError');
    return raw;
  };

  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
      reset({
        ...watch(),
        firstName: def.firstName,
        lastName: def.lastName,
        street: def.street,
        city: def.city,
        postalCode: def.postalCode,
        country: def.country,
        phone: def.phone || '',
        saveAddress: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const useAddress = (id: string) => {
    const a = addresses?.find((x) => x.id === id);
    if (!a) return;
    setSelectedAddressId(id);
    setValue('firstName', a.firstName);
    setValue('lastName', a.lastName);
    setValue('street', a.street);
    setValue('city', a.city);
    setValue('postalCode', a.postalCode);
    setValue('country', a.country);
    setValue('phone', a.phone || '');
  };

  const submit = async (values: ShippingFormValues) => {
    if (user && values.saveAddress) {
      const exists = (addresses || []).some(
        (a) =>
          a.firstName.toLowerCase().trim() === values.firstName.toLowerCase().trim() &&
          a.lastName.toLowerCase().trim() === values.lastName.toLowerCase().trim() &&
          a.street.toLowerCase().trim() === values.street.toLowerCase().trim() &&
          a.city.toLowerCase().trim() === values.city.toLowerCase().trim() &&
          a.postalCode.toLowerCase().trim() === values.postalCode.toLowerCase().trim() &&
          a.country.toLowerCase().trim() === values.country.toLowerCase().trim()
      );
      if (!exists) {
        await createAddress.mutateAsync({
          firstName: values.firstName,
          lastName: values.lastName,
          street: values.street,
          city: values.city,
          postalCode: values.postalCode,
          country: values.country,
          phone: values.phone || undefined,
        });
      }
    }
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      {user && addresses && addresses.length > 0 && (
        <div>
          <h3 className="label">{t('checkout.savedAddresses')}</h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {addresses.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => useAddress(a.id)}
                className={cn(
                  'p-3 text-left border rounded-card transition-colors',
                  selectedAddressId === a.id
                    ? 'border-primary/60 bg-primary/[0.06]'
                    : 'border-line hover:border-primary/30',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-ink">
                    {a.firstName} {a.lastName}
                  </span>
                  {a.isDefault && (
                    <span className="badge bg-primary/15 text-primary border-primary/30">
                      {t('checkout.default')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted">{a.street}</p>
                <p className="text-xs text-ink-muted">
                  {a.postalCode} {a.city}, {a.country}
                </p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedAddressId(null);
              reset({
                country: 'Netherlands',
                email: user.email,
                firstName: '',
                lastName: '',
                street: '',
                city: '',
                postalCode: '',
                phone: '',
              });
            }}
            className="text-xs text-primary hover:text-primary-light mt-2 inline-flex items-center gap-1"
          >
            <Icon name="plus" size={11} />
            {t('checkout.useNewAddress')}
          </button>
        </div>
      )}

      <h3 className="label">{t('checkout.contact')}</h3>
      <Input
        label={t('label.email')}
        type="email"
        placeholder={t('auth.placeholder.email')}
        leftIcon={<Icon name="mail" size={16} />}
        {...register('email')}
        error={errMsg(errors.email?.message)}
        disabled={!!user}
      />
      <Input
        label={t('checkout.phoneOptional')}
        type="tel"
        placeholder="+31 ..."
        {...register('phone')}
      />

      <h3 className="label">{t('checkout.shipping')}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label={t('label.firstName')} {...register('firstName')} error={errMsg(errors.firstName?.message)} />
        <Input label={t('label.lastName')} {...register('lastName')} error={errMsg(errors.lastName?.message)} />
      </div>
      <Input
        label={t('label.street')}
        placeholder="Researcherslaan 12"
        {...register('street')}
        error={errMsg(errors.street?.message)}
      />
      <div className="grid sm:grid-cols-3 gap-4">
        <Input label={t('label.postalCode')} {...register('postalCode')} error={errMsg(errors.postalCode?.message)} />
        <Input
          label={t('label.city')}
          className="sm:col-span-2"
          {...register('city')}
          error={errMsg(errors.city?.message)}
        />
      </div>
      <Select
        label={t('label.country')}
        {...register('country')}
        options={(countries.includes(watch('country')) ? countries : [watch('country'), ...countries.filter(c => c !== watch('country'))]).map((c) => ({ value: c, label: c }))}
        error={errMsg(errors.country?.message)}
      />

      {expressQuote.eligible && (
        <div className="rounded-xl border border-line p-4 bg-surfaceHi">
          {expressQuote.included ? (
            <p className="text-sm text-ink">
              <Icon name="truck" size={16} className="inline mr-1.5 -mt-0.5 text-primary" />
              {t('checkout.express.includedHint')}
            </p>
          ) : (
            <label className="flex items-start gap-3 cursor-pointer text-sm text-ink">
              <input
                type="checkbox"
                {...register('expressDelivery')}
                className="mt-0.5 rounded border-line bg-surfaceHi text-primary focus:ring-primary/30"
              />
              <span>
                <span className="font-semibold">{t('checkout.express.title')}</span>
                <span className="block text-ink-muted mt-0.5">{t('checkout.express.hint')}</span>
              </span>
              <span className="ml-auto shrink-0 font-semibold whitespace-nowrap">
                +€{EXPRESS_EU_FEE.toFixed(2)}
              </span>
            </label>
          )}
        </div>
      )}

      {user && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
          <input
            type="checkbox"
            {...register('saveAddress')}
            className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30"
          />
          {t('checkout.saveAddress')}
        </label>
      )}

      {/* Mandatory research-use / role permission — the green confirmation box */}
      <div
        className={cn(
          'checkout-consent',
          (errors.consentResearch || errors.consentRole) && 'checkout-consent-error',
        )}
      >
        <h4 className="checkout-consent-title">{t('checkout.consentTitle')}</h4>
        <label className="checkout-consent-label">
          <input type="checkbox" {...register('consentResearch')} className="checkout-consent-check" />
          <span>{t('checkout.consent1')}</span>
        </label>
        <label className="checkout-consent-label">
          <input type="checkbox" {...register('consentRole')} className="checkout-consent-check" />
          <span>{t('checkout.consent2')}</span>
        </label>
        {(errors.consentResearch || errors.consentRole) && (
          <p className="checkout-consent-msg">{t('checkout.consentError')}</p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={createAddress.isPending}
        rightIcon={<Icon name="arrowRight" size={14} />}
      >
        {t('checkout.continueToPayment')}
      </Button>
    </form>
  );
}

export function toOrderAddress(v: ShippingFormValues): OrderAddress {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    street: v.street,
    city: v.city,
    postalCode: v.postalCode,
    country: v.country,
    phone: v.phone || undefined,
    expressDelivery: v.expressDelivery,
  };
}
