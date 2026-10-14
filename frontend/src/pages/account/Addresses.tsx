import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddressFormModal } from '@/components/account/AddressFormModal';
import { useAddresses, useDeleteAddress, useUpdateAddress } from '@/hooks/useUser';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import type { Address } from '@/types/address';

export default function AddressesPage() {
  const { t } = useT();
  const { data: addresses, isLoading } = useAddresses();
  const deleteAddr = useDeleteAddress();
  const updateAddr = useUpdateAddress();
  const toast = useUiStore((s) => s.toast);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const onEdit = (a: Address) => {
    setEditing(a);
    setModalOpen(true);
  };
  const onAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onDelete = async (a: Address) => {
    if (!confirm(t('addresses.confirmDelete', { name: `${a.firstName} ${a.lastName}` }))) return;
    await deleteAddr.mutateAsync(a.id);
  };
  const onMakeDefault = async (a: Address) => {
    await updateAddr.mutateAsync({
      id: a.id,
      payload: {
        firstName: a.firstName,
        lastName: a.lastName,
        street: a.street,
        city: a.city,
        postalCode: a.postalCode,
        country: a.country,
        phone: a.phone || undefined,
        isDefault: true,
      },
    });
    toast(t('addresses.defaultUpdated'), 'success');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-ink mb-1">{t('addresses.title')}</h1>
          <p className="text-sm text-ink-muted">{t('addresses.subtitle')}</p>
        </div>
        <Button onClick={onAdd}>
          <Icon name="plus" size={14} />
          {t('addresses.add')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !addresses || addresses.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center mb-4">
            <Icon name="truck" size={22} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold text-ink mb-2">{t('addresses.empty.title')}</h3>
          <p className="text-sm text-ink-muted mb-5">{t('addresses.empty.desc')}</p>
          <Button onClick={onAdd}>
            <Icon name="plus" size={14} />
            {t('addresses.empty.cta')}
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <article key={a.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold text-ink">
                  {a.firstName} {a.lastName}
                </h3>
                {a.isDefault && (
                  <span className="badge bg-primary/15 text-primary border border-primary/30">
                    {t('addresses.default')}
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-muted leading-relaxed flex-1">
                {a.street}
                <br />
                {a.postalCode} {a.city}
                <br />
                {a.country}
                {a.phone && (
                  <>
                    <br />
                    <span className="text-xs">{a.phone}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-lineSoft">
                <button
                  onClick={() => onEdit(a)}
                  className="text-xs font-semibold text-primary hover:text-primary-light inline-flex items-center gap-1"
                >
                  <Icon name="document" size={11} />
                  {t('addresses.action.edit')}
                </button>
                {!a.isDefault && (
                  <button
                    onClick={() => onMakeDefault(a)}
                    className="text-xs font-semibold text-ink-muted hover:text-ink inline-flex items-center gap-1"
                  >
                    <Icon name="check" size={11} />
                    {t('addresses.action.makeDefault')}
                  </button>
                )}
                <button
                  onClick={() => onDelete(a)}
                  className="text-xs font-semibold text-ink-muted hover:text-danger inline-flex items-center gap-1 ml-auto"
                >
                  <Icon name="trash" size={11} />
                  {t('addresses.action.delete')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AddressFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
