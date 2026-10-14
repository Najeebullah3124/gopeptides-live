import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApiService, type AuditLog } from '@/services/blogService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/helpers';
import { useT } from '@/hooks/useT';
import { useSettingsStore } from '@/stores/settingsStore';

const ORDER_STATUS_TONE: Record<string, 'primary' | 'muted' | 'gold'> = {
  PENDING: 'gold',
  PROCESSING: 'primary',
  SHIPPED: 'primary',
  DELIVERED: 'primary',
  CANCELLED: 'muted',
  REFUNDED: 'muted',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-ink">{value}</div>
      {sub && <div className="text-xs text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function GaPanel() {
  const { t } = useT();
  const gaId = useSettingsStore((s) => s.analytics.googleAnalyticsId);
  const configured = Boolean(gaId?.trim());

  return (
    <div className="card p-5 border border-primary/20 bg-primary/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-ink">{t('admin.analytics.gaTitle')}</h3>
          <p className="text-sm text-ink-muted mt-1">
            {configured
              ? `${t('admin.analytics.gaConfigured')}: ${gaId}`
              : t('admin.analytics.gaMissing')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/settings">
            <Button type="button" variant="secondary" className="text-sm">
              {t('admin.analytics.gaSettings')}
            </Button>
          </Link>
          {configured && (
            <a
              href="https://analytics.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button type="button" className="text-sm">
                {t('admin.analytics.gaOpen')}
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { t, lang } = useT();
  const [auditPage, setAuditPage] = useState(1);

  const stats = useQuery({
    queryKey: ['admin', 'analytics', 'stats'],
    queryFn: () => adminApiService.getStats(),
    staleTime: 60_000,
  });

  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const auditLogs = useQuery({
    queryKey: ['admin', 'analytics', 'audit-logs', auditPage, entityFilter, actionFilter, search],
    queryFn: () => adminApiService.getAuditLogs(auditPage, {
      entity: entityFilter || undefined,
      action: actionFilter || undefined,
      search: search || undefined,
    }),
  });

  const s = stats.data;
  const currentLang = (lang === 'nl' || lang === 'de') ? lang : 'en';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-1">{t('admin.analytics.title')}</h2>
        <p className="text-sm text-ink-muted">{t('admin.analytics.subtitle')}</p>
      </div>

      {stats.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : s ? (
        <>
          <GaPanel />
          {/* KPI Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t('admin.analytics.totalUsers')}
              value={s.users.total}
              sub={t('admin.analytics.last30', { n: s.users.newLast30 })}
            />
            <StatCard
              label={t('admin.analytics.totalOrders')}
              value={s.orders.total}
              sub={t('admin.analytics.last30', { n: s.orders.newLast30 })}
            />
            <StatCard
              label={t('admin.analytics.totalRevenue')}
              value={formatCurrency(s.revenue.total)}
              sub={t('admin.analytics.revenueLast30', { amount: formatCurrency(s.revenue.last30) })}
            />
            <StatCard
              label={t('admin.analytics.productViews')}
              value={s.productViews.last30}
              sub={t('admin.analytics.trackedViews')}
            />
            <StatCard
              label={t('admin.analytics.activeProducts')}
              value={s.products.active}
              sub={t('admin.analytics.totalCount', { n: s.products.total })}
            />
            <StatCard
              label={t('admin.analytics.blogPosts')}
              value={s.blog.published}
              sub={t('admin.analytics.blogTotal', { n: s.blog.total })}
            />
          </div>

          {/* Orders by status */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-4">
              <h3 className="font-bold text-ink mb-3 text-sm uppercase tracking-wide">{t('admin.analytics.ordersByStatus')}</h3>
              <div className="space-y-2">
                {s.orders.byStatus.map((row) => (
                  <div key={row.status} className="flex items-center justify-between">
                    <Badge tone={ORDER_STATUS_TONE[row.status] ?? 'muted'}>{row.status}</Badge>
                    <span className="font-bold text-ink">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top viewed products */}
            <div className="card p-4">
              <h3 className="font-bold text-ink mb-3 text-sm uppercase tracking-wide">
                {t('admin.analytics.topViewed')}
              </h3>
              {s.productViews.topProducts.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('admin.analytics.noViewData')}</p>
              ) : (
                <div className="space-y-2">
                  {s.productViews.topProducts.map((row) => (
                     <div key={row.productId} className="flex items-center justify-between">
                      <span className="text-sm text-ink line-clamp-1">
                        {row.product?.name ?? row.productId}
                      </span>
                      <span className="font-bold text-ink text-sm ml-2 shrink-0">{t('admin.analytics.viewsLabel', { n: row.views })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Most visited pages */}
          <div className="card p-4">
            <h3 className="font-bold text-ink mb-3 text-sm uppercase tracking-wide">
              {currentLang === 'nl' ? 'Meest bezochte pagina’s' : currentLang === 'de' ? 'Meistbesuchte Seiten' : 'Most Visited Pages'}
              {s.pageViews ? <span className="text-ink-muted font-normal normal-case ml-2">({s.pageViews.last30} {currentLang === 'nl' ? 'weergaven' : currentLang === 'de' ? 'Aufrufe' : 'views'} / 30d)</span> : null}
            </h3>
            {!s.pageViews || s.pageViews.topPages.length === 0 ? (
              <p className="text-sm text-ink-muted">{currentLang === 'nl' ? 'Nog geen paginabezoeken.' : currentLang === 'de' ? 'Noch keine Seitenaufrufe.' : 'No page visits yet.'}</p>
            ) : (
              <div className="space-y-2">
                {s.pageViews.topPages.map((row) => (
                  <div key={row.path ?? 'unknown'} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink font-mono line-clamp-1">{row.path || '/'}</span>
                    <span className="font-bold text-ink text-sm shrink-0">{row.views}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily activity chart (simple bar) */}
          <div className="card p-4">
            <h3 className="font-bold text-ink mb-4 text-sm uppercase tracking-wide">
              {t('admin.analytics.dailyOrders')}
            </h3>
            <div className="flex items-end gap-2 h-24">
              {s.dailyActivity.map((d) => {
                const maxOrders = Math.max(...s.dailyActivity.map((x) => x.orders), 1);
                const h = Math.max(4, (d.orders / maxOrders) * 96);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-ink-muted font-mono">{d.orders}</span>
                    <div
                      className="w-full rounded-t bg-primary/70 transition-all"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] text-ink-muted">
                      {new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {/* Audit Logs */}
      <div>
        <h3 className="font-bold text-ink mb-3">{t('admin.analytics.auditLog')}</h3>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setAuditPage(1); }}
            className="field text-sm"
            style={{ maxWidth: 180 }}
          >
            <option value="">{currentLang === 'nl' ? 'Alle types' : currentLang === 'de' ? 'Alle Typen' : 'All types'}</option>
            <option value="Page">{currentLang === 'nl' ? 'Pagina’s' : currentLang === 'de' ? 'Seiten' : 'Pages'}</option>
            <option value="Product">{currentLang === 'nl' ? 'Producten' : currentLang === 'de' ? 'Produkte' : 'Products'}</option>
            <option value="Event">{currentLang === 'nl' ? 'Klikken' : currentLang === 'de' ? 'Klicks' : 'Clicks'}</option>
            <option value="Order">{currentLang === 'nl' ? 'Bestellingen' : currentLang === 'de' ? 'Bestellungen' : 'Orders'}</option>
            <option value="User">{currentLang === 'nl' ? 'Gebruikers' : currentLang === 'de' ? 'Benutzer' : 'Users'}</option>
            <option value="BlogPost">Blog</option>
          </select>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setAuditPage(1); }}
            className="field text-sm"
            style={{ maxWidth: 200 }}
          >
            <option value="">{currentLang === 'nl' ? 'Alle activiteiten' : currentLang === 'de' ? 'Alle Aktivitäten' : 'All activities'}</option>
            <option value="VIEW_PAGE">{currentLang === 'nl' ? 'Paginabezoek' : currentLang === 'de' ? 'Seitenaufruf' : 'Page view'}</option>
            <option value="VIEW_PRODUCT">{currentLang === 'nl' ? 'Productweergave' : currentLang === 'de' ? 'Produktansicht' : 'Product view'}</option>
            <option value="ADD_TO_CART">{currentLang === 'nl' ? 'In winkelwagen' : currentLang === 'de' ? 'In den Warenkorb' : 'Add to cart'}</option>
            <option value="LOGIN">{currentLang === 'nl' ? 'Inloggen' : currentLang === 'de' ? 'Anmeldung' : 'Login'}</option>
            <option value="REGISTER">{currentLang === 'nl' ? 'Registratie' : currentLang === 'de' ? 'Registrierung' : 'Register'}</option>
            <option value="CREATE_ORDER">{currentLang === 'nl' ? 'Bestelling geplaatst' : currentLang === 'de' ? 'Bestellung' : 'Order placed'}</option>
          </select>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setAuditPage(1); }}
            placeholder={currentLang === 'nl' ? 'Zoek op pad / product…' : currentLang === 'de' ? 'Nach Pfad / Produkt suchen…' : 'Search path / product…'}
            className="field text-sm flex-1"
            style={{ minWidth: 160 }}
          />
          {(entityFilter || actionFilter || search) && (
            <button
              className="btn-out sm"
              onClick={() => { setEntityFilter(''); setActionFilter(''); setSearch(''); setAuditPage(1); }}
            >
              {currentLang === 'nl' ? 'Wissen' : currentLang === 'de' ? 'Zurücksetzen' : 'Clear'}
            </button>
          )}
        </div>

        {auditLogs.isLoading ? (
          <div className="space-y-1">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (auditLogs.data?.data ?? []).length === 0 ? (
          <div className="card p-6 text-center text-ink-muted text-sm">{t('admin.analytics.noAudit')}</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: '60vh' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-line text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">
                  <th className="text-left px-4 py-2 bg-surface">{currentLang === 'nl' ? 'Gebruiker' : currentLang === 'de' ? 'Benutzer' : 'User'}</th>
                  <th className="text-left px-4 py-2">{currentLang === 'nl' ? 'Activiteit' : currentLang === 'de' ? 'Aktivität' : 'Activity'}</th>
                  <th className="text-left px-4 py-2">{currentLang === 'nl' ? 'Details' : currentLang === 'de' ? 'Details' : 'Details'}</th>
                  <th className="text-left px-4 py-2">{currentLang === 'nl' ? 'IP-adres' : currentLang === 'de' ? 'IP-Adresse' : 'IP Address'}</th>
                  <th className="text-right px-4 py-2">{currentLang === 'nl' ? 'Tijd' : currentLang === 'de' ? 'Zeit' : 'Time'}</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogs.data?.data ?? []).map((log: AuditLog) => {
                  const auditTrans: Record<string, Record<string, string>> = {
                    en: {
                      visitor: 'Visitor',
                      guest: 'Guest',
                      loggedIn: 'logged in',
                      registered: 'registered new account',
                      placedOrder: 'placed order',
                      viewedProduct: 'viewed product',
                      viewedPage: 'viewed page',
                      updatedOrderStatus: 'updated order status',
                      statusTo: 'to',
                      performed: 'performed',
                      on: 'on',
                      uploadedImages: 'uploaded images for',
                      createdEntity: 'created',
                      updatedEntity: 'updated',
                      deletedEntity: 'deleted',
                      updatedRole: 'updated role of user',
                    },
                    nl: {
                      visitor: 'Bezoeker',
                      guest: 'Gast',
                      loggedIn: 'is ingelogd',
                      registered: 'heeft een nieuw account geregistreerd',
                      placedOrder: 'heeft bestelling geplaatst',
                      viewedProduct: 'bekeek product',
                      viewedPage: 'bekeek pagina',
                      updatedOrderStatus: 'heeft bestelling bijgewerkt',
                      statusTo: 'naar',
                      performed: 'voerde',
                      on: 'uit op',
                      uploadedImages: 'heeft afbeeldingen geüpload voor',
                      createdEntity: 'heeft aangemaakt:',
                      updatedEntity: 'heeft bijgewerkt:',
                      deletedEntity: 'heeft verwijderd:',
                      updatedRole: 'heeft de rol van gebruiker bijgewerkt:',
                    },
                    de: {
                      visitor: 'Besucher',
                      guest: 'Gast',
                      loggedIn: 'hat sich eingeloggt',
                      registered: 'hat ein neues Konto registriert',
                      placedOrder: 'hat eine Bestellung aufgegeben',
                      viewedProduct: 'hat das Produkt angesehen',
                      viewedPage: 'hat die Seite angesehen',
                      updatedOrderStatus: 'hat den Bestellstatus aktualisiert',
                      statusTo: 'auf',
                      performed: 'führte',
                      on: 'aus auf',
                      uploadedImages: 'hat Bilder hochgeladen für',
                      createdEntity: 'hat erstellt:',
                      updatedEntity: 'hat aktualisiert:',
                      deletedEntity: 'hat gelöscht:',
                      updatedRole: 'hat die Rolle des Benutzers aktualisiert:',
                    }
                  };

                  const entityTrans: Record<string, Record<string, string>> = {
                    en: {
                      Product: 'Product',
                      BlogPost: 'Blog Post',
                      User: 'User',
                      Order: 'Order',
                    },
                    nl: {
                      Product: 'Product',
                      BlogPost: 'Blogbericht',
                      User: 'Gebruiker',
                      Order: 'Bestelling',
                    },
                    de: {
                      Product: 'Produkt',
                      BlogPost: 'Blogbeitrag',
                      User: 'Benutzer',
                      Order: 'Bestellung',
                    }
                  };

                  const labels = auditTrans[currentLang];
                  const translatedEntity = entityTrans[currentLang]?.[log.entity] || log.entity;
                  const meta = log.metadata as any;

                  const actor = log.user 
                    ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` 
                    : (meta?.guestEmail ? `${labels.guest} (${meta.guestEmail})` : labels.visitor);
                  
                  const ip = log.ipAddress || '-';
                  let activity = '';
                  let details = '';

                  switch (log.action) {
                    case 'LOGIN':
                      activity = labels.loggedIn;
                      details = '';
                      break;
                    case 'REGISTER':
                      activity = labels.registered;
                      details = '';
                      break;
                    case 'CREATE_ORDER':
                      activity = labels.placedOrder;
                      details = `#${meta?.orderNumber || log.entityId} (${formatCurrency(Number(meta?.total || 0))})`;
                      break;
                    case 'CREATE_ORDER_GUEST':
                      activity = `${labels.guest} ${labels.placedOrder}`;
                      details = `#${meta?.orderNumber || log.entityId} (${formatCurrency(Number(meta?.total || 0))})`;
                      break;
                    case 'VIEW_PRODUCT':
                      activity = labels.viewedProduct;
                      details = meta?.productName || log.entityId || '';
                      break;
                    case 'VIEW_PAGE':
                      activity = labels.viewedPage;
                      details = meta?.path || log.entityId || '';
                      break;
                    case 'UPDATE_STATUS':
                      activity = labels.updatedOrderStatus;
                      details = `#${meta?.orderNumber || log.entityId} ${labels.statusTo} ${meta?.status}`;
                      break;
                    case 'UPLOAD_IMAGES':
                      activity = `${labels.uploadedImages} ${translatedEntity}`;
                      details = `"${meta?.name || log.entityId}"`;
                      break;
                    case 'CREATE':
                      activity = `${labels.createdEntity} ${translatedEntity}`;
                      details = `"${meta?.name || meta?.title || log.entityId}"`;
                      break;
                    case 'UPDATE':
                      activity = `${labels.updatedEntity} ${translatedEntity}`;
                      details = `"${meta?.name || meta?.title || log.entityId}"`;
                      break;
                    case 'DELETE':
                      activity = `${labels.deletedEntity} ${translatedEntity}`;
                      details = `"${meta?.name || meta?.title || log.entityId}"`;
                      break;
                    case 'UPDATE_ROLE':
                      activity = labels.updatedRole;
                      details = `${meta?.targetEmail || log.entityId} ${labels.statusTo} ${meta?.role || ''}`;
                      break;
                    default:
                      activity = `${labels.performed} ${log.action}`;
                      details = `${labels.on} ${translatedEntity}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}`;
                  }

                  return (
                    <tr key={log.id} className="border-b border-lineSoft last:border-0 hover:bg-surfaceAlt">
                      <td className="px-4 py-3 text-ink font-semibold">{actor}</td>
                      <td className="px-4 py-3 text-ink font-medium capitalize-first">{activity}</td>
                      <td className="px-4 py-3 text-ink-muted">{details || '-'}</td>
                      <td className="px-4 py-3 text-ink-muted font-mono text-xs">{ip}</td>
                      <td className="px-4 py-3 text-right text-ink-muted text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {auditLogs.data && auditLogs.data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-ink-muted">
              {t('admin.common.pageOf', { page: auditLogs.data.meta.page, total: auditLogs.data.meta.totalPages })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={auditPage === 1}
                onClick={() => setAuditPage((p) => p - 1)}
              >
                {t('admin.common.previous')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={auditPage >= auditLogs.data.meta.totalPages}
                onClick={() => setAuditPage((p) => p + 1)}
              >
                {t('admin.common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
