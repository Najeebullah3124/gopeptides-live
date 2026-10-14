import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminReviews, useApproveReview, useDeleteReview, useUnapproveReview } from '@/hooks/useReviews';
import { useT } from '@/hooks/useT';
import { Stars } from '@/components/ui/Badge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { timeAgo } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

type Filter = 'pending' | 'approved' | 'all';

export default function AdminReviews() {
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(1);
  const approved = filter === 'pending' ? false : filter === 'approved' ? true : null;
  const { data, isLoading } = useAdminReviews(approved, page);
  const approve = useApproveReview();
  const unapprove = useUnapproveReview();
  const remove = useDeleteReview();

  const filters: { id: Filter; label: string }[] = [
    { id: 'pending', label: t('admin.reviews.tab.pending') },
    { id: 'approved', label: t('admin.reviews.tab.approved') },
    { id: 'all', label: t('admin.reviews.tab.all') },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.reviews.title')}</h2>
      <p className="text-sm text-ink-muted mb-5">
        {data
          ? data.meta.totalCount === 1
            ? t('reviews.eyebrow') + ` (${data.meta.totalCount})`
            : t('reviews.eyebrow') + ` (${data.meta.totalCount})`
          : t('label.loading')}
      </p>

      <div className="flex gap-1 mb-5 border-b border-line">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              filter === f.id
                ? 'border-primary text-primary'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !data || data.data.length === 0 ? (
        <div className="card p-12 text-center text-ink-muted">
          {t('admin.reviews.empty', { filter })}
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((r) => (
            <article key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <Stars rating={r.rating} size={13} />
                    {r.verified && <Badge tone="success">{t('admin.reviews.verifiedBuyer')}</Badge>}
                    <Badge tone={r.approved ? 'primary' : 'gold'}>
                      {r.approved ? t('admin.reviews.tab.approved') : t('admin.reviews.tab.pending')}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-ink">{r.title}</h3>
                </div>
                <span className="text-xs text-ink-muted whitespace-nowrap">{timeAgo(r.createdAt)}</span>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed mb-4"><span>"{r.body}"</span></p>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-lineSoft">
                <p className="text-xs text-ink-muted">
                  <span>{t('admin.reviews.by')} </span>
                  <strong className="text-ink">
                    {r.user ? `${r.user.firstName} ${r.user.lastName.charAt(0)}.` : r.guestName || '—'}
                  </strong>
                  {r.product && (
                    <span>
                      <span> {t('admin.reviews.on')} </span>
                      <Link
                        to={`/${r.product.slug}`}
                        target="_blank"
                        className="text-primary hover:text-primary-light font-semibold"
                      >
                        {r.product.name}
                      </Link>
                    </span>
                  )}
                </p>
                <div className="ml-auto flex gap-2">
                  {!r.approved ? (
                    <Button
                      size="sm"
                      onClick={() => approve.mutate(r.id)}
                      loading={approve.isPending && approve.variables === r.id}
                    >
                      <Icon name="check" size={12} />
                      <span>{t('admin.reviews.approve')}</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unapprove.mutate(r.id)}
                      loading={unapprove.isPending && unapprove.variables === r.id}
                    >
                      <span>{t('admin.reviews.unapprove')}</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm(t('admin.reviews.confirmDelete'))) remove.mutate(r.id);
                    }}
                  >
                    <Icon name="trash" size={12} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-5">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <Icon name="arrowLeft" size={12} />
          </Button>
          <span className="text-xs text-ink-muted px-3">
            {page} / {data.meta.totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
            <Icon name="arrowRight" size={12} />
          </Button>
        </div>
      )}
    </div>
  );
}
