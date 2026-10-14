import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';
import { formatDate } from '@/utils/helpers';

const LAST_SEEN_KEY = 'admin.subscriberNotifs.lastSeen';

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  subscribedAt: string;
};

function readLastSeen(): number {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  if (!raw) {
    // First visit: don't flood with historical subscribers — only new ones after this.
    const now = Date.now();
    localStorage.setItem(LAST_SEEN_KEY, String(now));
    return now;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : Date.now();
}

function writeLastSeen(ts: number) {
  localStorage.setItem(LAST_SEEN_KEY, String(ts));
}

export function AdminSubscriberBell() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(readLastSeen);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'subscribers', 'bell'],
    queryFn: async () => {
      const r = await api.get('/admin/subscribers', { params: { page: 1 } });
      return ((r.data as { data: { data: Subscriber[] } }).data?.data ?? []) as Subscriber[];
    },
    refetchInterval: 60_000,
  });

  const subscribers = data ?? [];
  const unread = subscribers.filter((s) => new Date(s.subscribedAt).getTime() > lastSeen);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markAllRead = () => {
    const now = Date.now();
    writeLastSeen(now);
    setLastSeen(now);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-md border border-border bg-surface text-ink hover:bg-surfaceAlt transition-colors"
        aria-label={t('admin.notif.subscribers')}
        aria-expanded={open}
      >
        <Icon name="bell" size={16} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] z-50 card p-0 shadow-lg overflow-hidden"
          role="menu"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
            <p className="text-sm font-bold text-ink">{t('admin.notif.subscribers')}</p>
            {unread.length > 0 && (
              <button type="button" onClick={markAllRead} className="text-[11px] font-semibold text-primary hover:underline">
                {t('admin.notif.markRead')}
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {subscribers.length === 0 ? (
              <li className="px-3 py-4 text-sm text-ink-muted">{t('admin.notif.empty')}</li>
            ) : (
              subscribers.slice(0, 8).map((s) => {
                const isNew = new Date(s.subscribedAt).getTime() > lastSeen;
                return (
                  <li
                    key={s.id}
                    className={`px-3 py-2.5 border-b border-border last:border-0 ${isNew ? 'bg-primary/5' : ''}`}
                  >
                    <p className="text-sm font-semibold text-ink truncate">{s.email}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      {s.name ? `${s.name} · ` : ''}
                      {formatDate(s.subscribedAt)}
                      {isNew ? ` · ${t('admin.notif.new')}` : ''}
                    </p>
                  </li>
                );
              })
            )}
          </ul>

          <div className="px-3 py-2 border-t border-border bg-surfaceAlt/50">
            <Link
              to="/admin/subscribers"
              onClick={() => {
                markAllRead();
                setOpen(false);
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('admin.notif.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
