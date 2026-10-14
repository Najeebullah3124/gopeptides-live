import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { couponService } from '@/services/couponService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/hooks/useT';
import { extractErrorMessage } from '@/services/api';
import { formatCompactCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/helpers';
import type { Coupon, CouponInput } from '@/types/coupon';

const schema = z.object({
  code: z.string().min(1).max(40).regex(/^[A-Z0-9_-]+$/i, 'Letters, numbers, dashes, underscores only'),
  discount: z.coerce.number().min(0),
  type: z.enum(['percent', 'fixed']),
  minOrder: z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), z.number().min(0).optional()),
  maxUses: z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), z.number().int().min(1).optional()),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
  oncePerUser: z.boolean().optional(),
});
type CouponForm = z.infer<typeof schema>;

export default function AdminCoupons() {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => couponService.adminList() });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const create = useMutation({
    mutationFn: (p: CouponInput) => couponService.adminCreate(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast('Coupon created', 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const update = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<CouponInput> }) => couponService.adminUpdate(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast('Coupon updated', 'success');
      setModalOpen(false);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => couponService.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast('Coupon removed', 'info');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const onAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (c: Coupon) => {
    setEditing(c);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.coupons.title')}</h2>
          <p className="text-sm text-ink-muted">{list.data ? t('admin.coupons.total', { n: list.data.length }) : ''}</p>
        </div>
        <Button onClick={onAdd}>
          <Icon name="plus" size={14} />
          {t('admin.coupons.new')}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !list.data || list.data.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">{t('admin.coupons.empty')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                <th className="text-left px-4 py-3">{t('admin.coupons.col.code')}</th>
                <th className="text-left px-4 py-3">{t('admin.coupons.col.discount')}</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">{t('admin.coupons.col.minOrder')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.coupons.col.usage')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.coupons.col.expires')}</th>
                <th className="text-left px-4 py-3">{t('label.status')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.data.map((c) => (
                <tr key={c.id} className="border-b border-lineSoft last:border-0">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                  <td className="px-4 py-3 text-ink">
                    {c.type === 'percent' ? `${c.discount}%` : formatCompactCurrency(c.discount)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-ink-muted">
                    {c.minOrder ? formatCompactCurrency(c.minOrder) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-ink-muted">
                    {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-ink-muted">
                    {c.expiresAt ? formatDate(c.expiresAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={c.isActive ? 'primary' : 'muted'}>
                      {c.isActive ? t('admin.coupons.status.active') : t('admin.coupons.status.disabled')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onEdit(c)} className="text-xs font-semibold text-primary hover:text-primary-light mr-3">
                      {t('btn.edit')}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t('admin.coupons.confirmDelete', { code: c.code }))) remove.mutate(c.id);
                      }}
                      className="text-xs font-semibold text-ink-muted hover:text-danger"
                    >
                      {t('btn.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CouponFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        submitting={create.isPending || update.isPending}
        onSubmit={(v) => {
          const payload: CouponInput = {
            code: v.code.toUpperCase(),
            discount: v.discount,
            type: v.type,
            minOrder: v.minOrder ?? null,
            maxUses: v.maxUses ?? null,
            expiresAt: v.expiresAt || null,
            isActive: v.isActive,
            oncePerUser: v.oncePerUser,
          };
          if (editing) update.mutate({ id: editing.id, p: payload });
          else create.mutate(payload);
        }}
      />
    </div>
  );
}

interface CouponFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Coupon | null;
  submitting: boolean;
  onSubmit: (v: CouponForm) => void;
}

function CouponFormModal({ open, onClose, editing, submitting, onSubmit }: CouponFormModalProps) {
  const { t } = useT();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CouponForm>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'percent', isActive: true, oncePerUser: false },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        code: editing.code,
        discount: editing.discount,
        type: editing.type,
        minOrder: editing.minOrder ?? undefined,
        maxUses: editing.maxUses ?? undefined,
        expiresAt: editing.expiresAt ? editing.expiresAt.slice(0, 10) : '',
        isActive: editing.isActive,
        oncePerUser: editing.oncePerUser,
      });
    } else {
      reset({ code: '', discount: 10, type: 'percent', isActive: true, oncePerUser: false });
    }
  }, [open, editing, reset]);

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('admin.coupons.editTitle') : t('admin.coupons.new')} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label={t('admin.coupons.codeLabel')} placeholder="WELCOME15" {...register('code')} error={errors.code?.message} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label={t('admin.coupons.f.type')} {...register('type')} options={[
            { value: 'percent', label: t('admin.coupons.f.percent') },
            { value: 'fixed', label: t('admin.coupons.f.fixed') },
          ]} />
          <Input type="number" step="0.01" label={t('admin.coupons.f.discount')} {...register('discount')} error={errors.discount?.message} hint={t('admin.coupons.f.discountHint')} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input type="number" step="0.01" label={t('admin.coupons.f.minOrder')} {...register('minOrder')} />
          <Input type="number" label={t('admin.coupons.f.maxUses')} {...register('maxUses')} />
        </div>
        <Input type="date" label={t('admin.coupons.f.expires')} {...register('expiresAt')} />
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" {...register('isActive')} className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30" />
            {t('admin.coupons.f.active')}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" {...register('oncePerUser')} className="rounded border-line bg-surfaceHi text-primary focus:ring-primary/30" />
            {t('admin.coupons.f.oncePerUser')}
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t('admin.common.cancel')}
          </Button>
          <Button type="submit" loading={submitting} className="flex-1">
            {editing ? t('admin.common.save') : t('admin.coupons.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
