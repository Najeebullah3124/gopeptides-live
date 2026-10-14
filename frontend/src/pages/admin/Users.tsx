import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApiService, type AdminUser } from '@/services/blogService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUiStore } from '@/stores/uiStore';
import { extractErrorMessage } from '@/services/api';
import { formatDate } from '@/utils/helpers';
import { useT } from '@/hooks/useT';

export default function AdminUsers() {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleModal, setRoleModal] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState('USER');

  const users = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter],
    queryFn: () => adminApiService.getUsers(page, search || undefined, roleFilter || undefined),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApiService.updateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast(t('admin.users.roleUpdated'), 'success');
      setRoleModal(null);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApiService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast(t('admin.users.deleted'), 'info');
      setDeleteConfirm(null);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const data = users.data?.data ?? [];
  const meta = users.data?.meta;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.users.title')}</h2>
          <p className="text-sm text-ink-muted">{meta ? t('admin.users.totalUsers', { n: meta.total }) : ''}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            label=""
            placeholder={t('admin.users.search')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" size="sm">
            <Icon name="search" size={14} />
          </Button>
        </form>
        <Select
          label=""
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          options={[
            { value: '', label: t('admin.users.roleAll') },
            { value: 'USER', label: t('admin.users.roleUsers') },
            { value: 'ADMIN', label: t('admin.users.roleAdmins') },
          ]}
        />
      </div>

      {users.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="card p-10 text-center text-ink-muted">{t('admin.users.none')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                <th className="text-left px-4 py-3">{t('admin.users.col.user')}</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">{t('admin.users.col.email')}</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">{t('admin.users.col.orders')}</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">{t('admin.users.col.joined')}</th>
                <th className="text-left px-4 py-3">{t('admin.users.col.role')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-lineSoft last:border-0 hover:bg-surfaceAlt/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="text-xs text-ink-muted flex items-center gap-1">
                      {u.emailVerified ? (
                        <span className="text-green-600">✓ {t('admin.users.verified')}</span>
                      ) : (
                        <span className="text-amber-500">{t('admin.users.unverified')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-ink-muted text-xs">{u.email}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-ink-muted">{u._count.orders}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-ink-muted text-xs">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === 'ADMIN' ? 'primary' : 'muted'}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => { setRoleModal(u); setNewRole(u.role); }}
                      className="text-xs font-semibold text-primary hover:text-primary-light mr-3"
                    >
                      {t('admin.users.action.role')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(u)}
                      className="text-xs font-semibold text-ink-muted hover:text-danger"
                    >
                      {t('admin.users.action.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-ink-muted">
            {t('admin.common.pageOf', { page: meta.page, total: meta.totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t('admin.common.previous')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('admin.common.next')}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={!!roleModal}
        onClose={() => setRoleModal(null)}
        title={t('admin.users.roleModalTitle', { name: `${roleModal?.firstName} ${roleModal?.lastName}` })}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label={t('admin.users.roleLabel')}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'USER', label: t('admin.users.roleUserOpt') },
              { value: 'ADMIN', label: t('admin.users.roleAdminOpt') },
            ]}
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRoleModal(null)} className="flex-1">
              {t('admin.common.cancel')}
            </Button>
            <Button
              loading={updateRole.isPending}
              onClick={() => roleModal && updateRole.mutate({ id: roleModal.id, role: newRole })}
              className="flex-1"
            >
              {t('admin.users.updateRole')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t('admin.users.deleteTitle')}
        size="sm"
      >
        <p className="text-sm text-ink-muted mb-4">
          {t('admin.users.deleteDesc', { name: `${deleteConfirm?.firstName} ${deleteConfirm?.lastName}`, email: deleteConfirm?.email ?? '' })}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">
            {t('admin.common.cancel')}
          </Button>
          <Button
            loading={remove.isPending}
            onClick={() => deleteConfirm && remove.mutate(deleteConfirm.id)}
            className="flex-1 bg-danger hover:bg-danger/90"
          >
            {t('admin.common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
