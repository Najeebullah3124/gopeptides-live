import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/stores/uiStore';
import { extractErrorMessage } from '@/services/api';
import { api } from '@/services/api';
import { useT } from '@/hooks/useT';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  subscribedAt: string;
}

interface SubscribersResponse {
  data: Subscriber[];
  meta: { total: number; page: number; pages: number };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const letter = (name ?? email).charAt(0).toUpperCase();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg,#5CC0BE,#0D7377)',
      color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
    }}>
      {letter}
    </span>
  );
}

export default function AdminSubscribers() {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<Subscriber | null>(null);

  const { data, isLoading, error } = useQuery<SubscribersResponse>({
    queryKey: ['admin', 'subscribers', page, search],
    queryFn: async () => {
      const r = await api.get('/admin/subscribers', { params: { page, search } });
      return (r.data as { data: SubscribersResponse }).data;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/subscribers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'subscribers'] });
      toast(t('admin.subscribers.removed'), 'info');
      setDeleteId(null);
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const allSubs = data?.data ?? [];
  const meta = data?.meta;

  const filtered = allSubs;

  function downloadCSV() {
    const rows = [['Name', 'Email', 'Subscribed'], ...allSubs.map(s => [s.name ?? '', s.email, formatDate(s.subscribedAt)])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'subscribers.csv';
    a.click();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">{t('admin.subscribers.title')}</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            {isLoading ? '...' : t('admin.subscribers.total', { n: meta?.total ?? allSubs.length })}
          </p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={allSubs.length === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'linear-gradient(135deg,#5CC0BE,#0D7377)', color: '#fff',
            border: 'none', cursor: 'pointer', opacity: allSubs.length === 0 ? 0.5 : 1,
          }}
        >
          ↓ {t('admin.subscribers.export')}
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={t('admin.subscribers.search')}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="field mb-4"
        style={{ maxWidth: 360 }}
      />

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', color: '#b91c1c', fontSize: 14, marginBottom: 16 }}>
          {t('admin.subscribers.loadFailed')}: {(error as Error).message}
        </div>
      )}

      {/* Table card */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: 14 }}>
            {t('admin.subscribers.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <p style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>
              {search ? t('admin.subscribers.noResults') : t('admin.subscribers.empty')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
              {search ? t('admin.subscribers.noMatch', { q: search }) : t('admin.subscribers.emptyHint')}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-line)' }}>
                {[t('admin.subscribers.col.subscriber'), t('admin.subscribers.col.email'), t('admin.subscribers.col.subscribed'), ''].map((h, hi) => (
                  <th key={hi} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-ink-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--color-line)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(92,192,190,0.03)',
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={s.name} email={s.email} />
                      <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: 14 }}>
                        {s.name ?? <span style={{ color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>{t('admin.subscribers.noName')}</span>}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: 'var(--color-ink-muted)' }}>
                    <a href={`mailto:${s.email}`} style={{ color: '#0D7377', textDecoration: 'none' }}>
                      {s.email}
                    </a>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-ink-muted)' }}>
                    {formatDate(s.subscribedAt)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => setDeleteId(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}
                      title={t('admin.common.remove')}
                    >
                      {t('admin.common.remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn-out sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← {t('admin.common.previous')}</button>
          <span style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>{t('admin.common.pageOf', { page, total: meta.pages })}</span>
          <button className="btn-out sm" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>{t('admin.common.next')} →</button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div className="card" style={{ padding: 28, maxWidth: 400, width: '100%', margin: '0 16px' }}>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t('admin.subscribers.removeTitle')}</p>
            <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', marginBottom: 20 }}>{t('admin.subscribers.removeDesc', { email: deleteId.email })}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-out sm" onClick={() => setDeleteId(null)}>{t('admin.common.cancel')}</button>
              <button
                onClick={() => remove.mutate(deleteId.id)}
                disabled={remove.isPending}
                style={{ padding: '6px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                {remove.isPending ? t('admin.subscribers.removing') : t('admin.common.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
