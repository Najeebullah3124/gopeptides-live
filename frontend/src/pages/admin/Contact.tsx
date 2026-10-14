import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/uiStore';
import { extractErrorMessage, api } from '@/services/api';
import { useT } from '@/hooks/useT';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

interface ContactMessagesResponse {
  data: ContactMessage[];
  meta: { total: number; page: number; pages: number; unread: number };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminContact() {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteId, setDeleteId] = useState<ContactMessage | null>(null);

  const { data, isLoading, error } = useQuery<ContactMessagesResponse>({
    queryKey: ['admin', 'contact-messages', page, search],
    queryFn: async () => {
      const r = await api.get('/admin/contact-messages', { params: { page, search } });
      return (r.data as { data: ContactMessagesResponse }).data;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/contact-messages/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
      toast(t('admin.contact.removed'), 'info');
      setDeleteId(null);
      setSelected(null);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  function openMessage(m: ContactMessage) {
    setSelected(m);
    if (!m.isRead) markRead.mutate(m.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">{t('admin.contact.title')}</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            {isLoading
              ? '...'
              : t('admin.contact.total', {
                  n: meta?.total ?? rows.length,
                  u: meta?.unread ?? 0,
                })}
          </p>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder={t('admin.contact.search')}
        className="input w-full mb-4"
      />

      {error && (
        <p className="text-sm text-red-600 mb-4">
          {t('admin.contact.loadFailed')}: {(error as Error).message}
        </p>
      )}

      {isLoading ? (
        <p className="text-ink-muted text-sm">{t('admin.contact.loading')}</p>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-bold text-ink mb-1">
            {search ? t('admin.contact.noResults') : t('admin.contact.empty')}
          </p>
          <p className="text-sm text-ink-muted">
            {search ? t('admin.contact.noMatch', { q: search }) : t('admin.contact.emptyHint')}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted text-xs uppercase tracking-wide">
                {[
                  t('admin.contact.col.from'),
                  t('admin.contact.col.subject'),
                  t('admin.contact.col.date'),
                  '',
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-border/60 hover:bg-surfaceAlt/60 cursor-pointer ${
                    m.isRead ? '' : 'bg-primary/5'
                  }`}
                  onClick={() => openMessage(m)}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink flex items-center gap-2">
                      {!m.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-hidden />
                      )}
                      {m.name}
                    </div>
                    <div className="text-ink-muted text-xs">{m.email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink max-w-[280px] truncate">{m.subject}</td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-600 font-semibold hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(m);
                      }}
                    >
                      {t('admin.common.remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.pages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          <span className="text-sm text-ink-muted self-center">
            {page} / {meta.pages}
          </span>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={page >= meta.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="card max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-wide text-ink-muted mb-1">{t('admin.contact.detail')}</p>
            <h3 className="text-lg font-extrabold text-ink mb-2">{selected.subject}</h3>
            <p className="text-sm text-ink-muted mb-4">
              {selected.name} &lt;{selected.email}&gt; · {formatDate(selected.createdAt)}
            </p>
            <pre className="text-sm text-ink whitespace-pre-wrap font-sans bg-surfaceAlt rounded-lg p-4 mb-5">
              {selected.message}
            </pre>
            <div className="flex gap-2 justify-end">
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + selected.subject)}`}
                className="btn-cta text-sm"
              >
                {t('admin.contact.reply')}
              </a>
              <button type="button" className="btn-ghost text-sm" onClick={() => setSelected(null)}>
                {t('admin.common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)' }}
          onClick={() => setDeleteId(null)}
        >
          <div className="card max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-ink mb-2">{t('admin.contact.removeTitle')}</p>
            <p className="text-sm text-ink-muted mb-5">
              {t('admin.contact.removeDesc', { subject: deleteId.subject })}
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-ghost text-sm" onClick={() => setDeleteId(null)}>
                {t('admin.common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                className="btn-cta text-sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleteId.id)}
              >
                {remove.isPending ? t('admin.contact.removing') : t('admin.common.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
