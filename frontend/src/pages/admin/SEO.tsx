import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { seoService, type SeoImageMetadataAudit, type SeoKeyword, type SeoMeta } from '@/services/seoService';
import { translateService } from '@/services/blogService';
import { extractErrorMessage } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { useUiStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useT } from '@/hooks/useT';

type SeoLang = 'nl' | 'en' | 'de';
const SEO_LANGS: { code: SeoLang; label: string; flag: string }[] = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

// We move tabs and CATEGORY_CARDS into the component to use the t() function.
// For backwards compatibility with logic, we keep a base structure or just generate them.
const getTabs = (t: any) => [
  ['overview', t('admin.seo.tabs.overview')],
  ['on-page', `🟦 ${t('admin.seo.tabs.onPage')}`],
  ['technical', `🟩 ${t('admin.seo.tabs.technical')}`],
  ['off-page', `🟨 ${t('admin.seo.tabs.offPage')}`],
  ['content-i18n', `🟪 ${t('admin.seo.tabs.content')}`],
  ['performance', `🟥 ${t('admin.seo.tabs.performance')}`],
];

const getCategoryCards = (t: any) => [
  { id: 'on-page', label: `🟦 ${t('admin.seo.cards.onPage')}`, desc: t('admin.seo.cards.onPageDesc') },
  { id: 'technical', label: `🟩 ${t('admin.seo.cards.technical')}`, desc: t('admin.seo.cards.technicalDesc') },
  { id: 'off-page', label: `🟨 ${t('admin.seo.cards.offPage')}`, desc: t('admin.seo.cards.offPageDesc') },
  { id: 'content-i18n', label: `🟪 ${t('admin.seo.cards.content')}`, desc: t('admin.seo.cards.contentDesc') },
  { id: 'performance', label: `🟥 ${t('admin.seo.cards.performance')}`, desc: t('admin.seo.cards.performanceDesc') },
];

const getSeoModules = (t: any) => [
  { id: 'on-page', label: t('admin.seo.modules.metaTags.title'), desc: t('admin.seo.modules.metaTags.desc'), target: '/admin/seo/on-page', badge: 'Meta' },
  { id: 'technical', label: t('admin.seo.modules.sitemap.title'), desc: t('admin.seo.modules.sitemap.desc'), target: '/admin/seo/technical', badge: 'XML' },
  { id: 'technical-redirects', label: t('admin.seo.modules.redirects.title'), desc: t('admin.seo.modules.redirects.desc'), target: '/admin/seo/technical', badge: '301' },
  { id: 'technical-robots', label: t('admin.seo.modules.robots.title'), desc: t('admin.seo.modules.robots.desc'), target: '/admin/seo/technical', badge: 'txt' },
  { id: 'off-page', label: t('admin.seo.modules.gsc.title'), desc: t('admin.seo.modules.gsc.desc'), target: '/admin/seo/off-page', badge: 'GSC' },
  { id: 'performance', label: t('admin.seo.modules.cwv.title'), desc: t('admin.seo.modules.cwv.desc'), target: '/admin/seo/performance', badge: 'CWV' },
];

type ContentType = 'product' | 'category' | 'post' | 'page';

interface ContentItem {
  id: string;
  contentType: ContentType;
  name?: string;
  title?: string;
  slug: string;
  path?: string;
  excerpt?: string;
  content?: string;
  shortDesc?: string;
  description?: string;
  seo?: SeoMeta;
  seoTitle?: string;
  status?: string;
  pageKey?: string;
  supportsLangs?: Array<'en' | 'nl' | 'de'>;
}

type FindingStatus = 'pass' | 'warn' | 'fail' | 'info';

function contentPath(item: ContentItem): string {
  if (item.path) return item.path;
  return item.slug === 'home' ? '/' : `/${item.slug}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));
}

function stripHtml(value?: string): string {
  if (!value) return '';
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePageSeoValue(seo: ContentItem['seo'], lang: SeoLang): SeoMeta {
  if (!seo) return {};
  if ('title' in seo || 'description' in seo || 'canonicalUrl' in seo || 'focusKeywords' in seo) {
    return seo as SeoMeta;
  }
  return ((seo as Record<string, SeoMeta>)[lang]) || {};
}

function seoPreviewDocument({
  title,
  description,
  bodyContent,
}: {
  title: string;
  description: string;
  bodyContent: string;
}): string {
  const safeTitle = escapeHtml(title || 'Page title');
  const safeDescription = description ? `<p class="excerpt">${escapeHtml(description)}</p>` : '';
  return `<!doctype html><html><head><style>body{font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.65;margin:0;padding:24px}article{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 10px 35px rgba(15,23,42,.06)}.wrap{padding:28px}h1{font-size:32px;line-height:1.15;margin:0 0 16px}.excerpt{font-size:17px;color:#475569;margin:0 0 24px}.meta{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 10px}h2{font-size:24px;margin-top:32px}h3{font-size:20px;margin-top:24px}h4{font-size:17px;margin-top:20px}a{color:#008080}img{display:block;max-width:100%;height:auto;border-radius:8px;margin:20px 0}blockquote{border-left:4px solid #008080;margin:20px 0;padding-left:16px;color:#475569}pre{background:#f1f5f9;padding:14px;overflow:auto;border-radius:10px}code{background:#f1f5f9;padding:2px 4px;border-radius:4px}ul,ol{padding-left:22px}</style></head><body><article><div class="wrap"><p class="meta">Inline preview</p><h1>${safeTitle}</h1>${safeDescription}${bodyContent || '<p>Start writing to preview the page layout.</p>'}</div></article></body></html>`;
}

function LibraryBadge({ name }: { name: string }) {
  return <code className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{name}</code>;
}

function FindingCard({ status, title, detail, fix, library, extra }: {
  status: FindingStatus;
  title: string;
  detail?: string;
  fix?: string;
  library?: string;
  extra?: string;
}) {
  const icon = status === 'fail' ? '❌' : status === 'warn' ? '⚠️' : status === 'pass' ? '✅' : 'ℹ️';
  const box = status === 'fail' ? 'border-danger/30 bg-danger/5' : status === 'warn' ? 'border-gold/30 bg-gold/5' : status === 'pass' ? 'border-success/20 bg-success/5' : 'border-line bg-surfaceAlt';
  return (
    <div className={`rounded-lg border p-3 text-sm ${box}`}>
      <div className="flex items-start gap-2">
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">{title}</p>
            {library && <LibraryBadge name={library} />}
            {extra && <span className="text-xs text-ink-muted">{extra}</span>}
          </div>
          {detail && (
            <div 
              className="text-xs text-ink-muted prose-sm prose-a:text-primary hover:prose-a:underline [&>p]:mb-0 inline-block" 
              dangerouslySetInnerHTML={{ __html: detail }} 
            />
          )}
          {fix && status !== 'pass' && (
            <p className="text-xs font-semibold text-ink bg-white/60 rounded px-2 py-1 border border-line">How to fix: {fix}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function LighthouseFindingsPanel({ results }: { results: { findings?: any[]; metrics?: Record<string, string> } }) {
  const findings = (results.findings || []).filter((f: any) => f.status !== 'pass');
  const passed = (results.findings || []).filter((f: any) => f.status === 'pass').length;
  const metrics = results.metrics || {};
  return (
    <div className="space-y-3">
      {Object.keys(metrics).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          {Object.entries(metrics).map(([k, v]) => v && (
            <div key={k} className="rounded border border-line p-2 text-center">
              <p className="font-bold text-ink uppercase">{k}</p>
              <p className="text-ink-muted">{v}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-ink-muted">
        <LibraryBadge name="lighthouse" /> {findings.length} issue(s) · {passed} passed checks (showing failures & warnings only)
      </p>
      <div className="space-y-2 max-h-96 overflow-auto">
        {findings.length === 0 ? (
          <p className="text-success text-sm">All Lighthouse audits passed for this run.</p>
        ) : (
          findings.map((f: any) => (
            <FindingCard
              key={f.id}
              status={f.status}
              title={f.title}
              library="lighthouse"
              extra={`${f.category}${f.score != null ? ` · ${f.score}%` : ''}${f.displayValue ? ` · ${f.displayValue}` : ''}`}
              detail={[f.description, f.explanation].filter(Boolean).join(' ')}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface SeoPackageInfo {
  name: string;
  category: string;
  description: string;
  license: string;
  active: boolean;
  note?: string;
}

function Score({ value }: { value: number }) {
  return (
    <span className={value >= 90 ? 'text-success font-bold' : value >= 70 ? 'text-gold font-bold' : 'text-danger font-bold'}>
      {value}%
    </span>
  );
}

function ScoreBar({ value, label }: { value: number | null | undefined; label: string }) {
  const v = value ?? 0;
  const color = v >= 90 ? 'bg-success' : v >= 70 ? 'bg-gold' : 'bg-danger';
  const textColor = v >= 90 ? 'text-success' : v >= 70 ? 'text-gold' : 'text-danger';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-2xl font-bold ${textColor}`}>{v}</span>
      <div className="w-16 h-2 bg-line rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-ink-muted text-center">{label}</span>
    </div>
  );
}

function LighthouseScoreCards({ summary }: { summary: Record<string, number> }) {
  const items = [
    { key: 'performance', label: 'Performance', hint: 'LCP, TBT, CLS, FID' },
    { key: 'seo', label: 'SEO', hint: 'Meta, canonical, robots' },
    { key: 'accessibility', label: 'Accessibility', hint: 'ARIA, contrast, labels' },
    { key: 'best-practices', label: 'Best Practices', hint: 'HTTPS, JS errors, images' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-2">
      {items.map(({ key, label, hint }) => (
        <div key={key} className="rounded-lg border border-line p-3 flex flex-col items-center gap-1">
          <ScoreBar value={summary[key]} label={label} />
          <p className="text-[10px] text-ink-muted text-center">{hint}</p>
        </div>
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-md p-3">{message}</p>;
}

function TaskProgress({
  title,
  detail,
  percent,
}: {
  title: string;
  detail: string;
  percent: number;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <span className="text-xs font-semibold text-primary">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-surfaceAlt overflow-hidden">
        <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-ink-muted">{detail}</p>
    </div>
  );
}

function PackageStack({ packages, title }: { packages: SeoPackageInfo[]; title: string }) {
  if (!packages.length) return null;
  return (
    <section className="card p-5 space-y-3">
      <h3 className="font-bold text-ink">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg) => (
          <div key={`${pkg.category}-${pkg.name}`} className="rounded-md border border-line p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-semibold text-primary">{pkg.name}</code>
              <span className={`text-xs font-bold ${pkg.active ? 'text-success' : 'text-ink-muted'}`}>{pkg.active ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">{pkg.description}</p>
            <p className="text-xs text-ink-muted mt-1">License: {pkg.license}</p>
            {pkg.note && <p className="text-xs text-gold mt-1">{pkg.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function KeywordChips({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (next: string[]) => void;
}) {
  const safeKeywords = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? [keywords] : []);
  const [draft, setDraft] = useState('');
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!safeKeywords.includes(value)) {
      onChange([...safeKeywords, value]);
    }
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {safeKeywords.map((kw) => (
          <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            {kw}
            <button type="button" className="hover:text-danger" onClick={() => onChange(safeKeywords.filter((k) => k !== kw))}>×</button>
          </span>
        ))}
        {!safeKeywords.length && <span className="text-xs text-ink-muted">No keywords yet</span>}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Add keyword" className="input flex-1" />
        <Button type="button" variant="secondary" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

function LinkListEditor({
  label,
  links,
  onChange,
}: {
  label: string;
  links: Array<{ label: string; href: string }>;
  onChange: (next: Array<{ label: string; href: string }>) => void;
}) {
  const safeLinks = Array.isArray(links) ? links : (typeof links === 'string' ? [{ label: links, href: '' }] : []);
  const update = (index: number, key: 'label' | 'href', value: string) => {
    onChange(safeLinks.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-muted mb-1">{label}</p>
      {safeLinks.map((link, index) => (
        <div key={`${label}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={link.label} onChange={(e) => update(index, 'label', e.target.value)} placeholder="Link label" className="input" />
          <input value={link.href} onChange={(e) => update(index, 'href', e.target.value)} placeholder="/shop or https://example.com" className="input" />
          <Button type="button" variant="ghost" onClick={() => onChange(safeLinks.filter((_, i) => i !== index))}>Remove</Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...safeLinks, { label: '', href: '' }])}>Add link</Button>
    </div>
  );
}

function HeadingStack({
  label,
  items,
  tone = 'default',
}: {
  label: string;
  items: string[];
  tone?: 'default' | 'primary';
}) {
  const toneClass = tone === 'primary'
    ? 'border-primary/20 bg-primary/5 text-ink'
    : 'border-line bg-surfaceAlt text-ink';
  const safeItems = Array.isArray(items) ? items : (typeof items === 'string' ? [items] : []);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      {safeItems.length ? (
        <div className="space-y-1.5">
          {safeItems.map((item, index) => (
            <div key={`${label}-${index}`} className={`rounded-md border px-2.5 py-2 text-xs ${toneClass}`}>
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">None</p>
      )}
    </div>
  );
}

function H2ListEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const update = (index: number, value: string) => {
    const arr = Array.isArray(items) ? items : (typeof items === 'string' ? [items] : []);
    onChange(arr.map((item, i) => (i === index ? value : item)));
  };
  const safeItems = Array.isArray(items) ? items : (typeof items === 'string' ? [items] : []);
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">On-page H2 headings</label>
      {safeItems.length > 0 ? (
        <div className="space-y-2">
          {safeItems.map((item, index) => (
            <div key={`h2-${index}`} className="flex gap-2">
              <input
                value={item}
                onChange={(e) => update(index, e.target.value)}
                placeholder={`H2 heading ${index + 1}`}
                className="input flex-1"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">No H2 headings yet</p>
      )}
    </div>
  );
}

export default function SEO() {
  const { t } = useT();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const rawSection = location.pathname.split('/').filter(Boolean).pop() || 'seo';
  const LEGACY_TAB_MAP: Record<string, string> = {
    content: 'on-page', schema: 'on-page', indexing: 'technical',
    redirects: 'technical', search: 'off-page', media: 'performance',
  };
  const active = rawSection === 'seo' ? 'overview' : (LEGACY_TAB_MAP[rawSection] || rawSection);
  
  const tabs = getTabs(t);
  const CATEGORY_CARDS = getCategoryCards(t);

  // Show GSC connected toast when returning from OAuth callback
  const gscConnected = searchParams.get('gsc') === 'connected';

  const [seoLang, setSeoLang] = useState<SeoLang>('nl');

  const onPage = active === 'on-page';
  const technical = active === 'technical';
  const offPage = active === 'off-page';
  const contentI18n = active === 'content-i18n';
  const performance = active === 'performance';

  const dashboard = useQuery({ queryKey: ['seo-dashboard'], queryFn: seoService.dashboard });
  const toolkit = useQuery({ queryKey: ['seo-toolkit'], queryFn: seoService.toolkit });
  const content = useQuery({ queryKey: ['seo-content'], queryFn: seoService.content, enabled: onPage || contentI18n || active === 'overview' });
  const schema = useQuery({ queryKey: ['seo-schema'], queryFn: seoService.schema, enabled: onPage });
  const indexing = useQuery({ queryKey: ['seo-indexing'], queryFn: seoService.indexing, enabled: technical || active === 'overview' });
  const media = useQuery({ queryKey: ['seo-media'], queryFn: seoService.media, enabled: performance });
  const [geoDraft, setGeoDraft] = useState({ latitude: '52.3138', longitude: '4.9415', altitude: '' });
  const [metaExpanded, setMetaExpanded] = useState<Record<string, boolean>>({});
  const mediaMetadata = useQuery({
    queryKey: ['seo-media-metadata', geoDraft.latitude, geoDraft.longitude],
    queryFn: () => seoService.mediaMetadata(Number(geoDraft.latitude), Number(geoDraft.longitude)),
    enabled: performance,
  });
  const redirects = useQuery({ queryKey: ['seo-redirects'], queryFn: seoService.redirects, enabled: technical || active === 'overview' });
  const audits = useQuery({ queryKey: ['seo-audits'], queryFn: seoService.audits, enabled: technical || performance || active === 'overview' });
  const keywords = useQuery({ queryKey: ['seo-keywords'], queryFn: seoService.keywords, enabled: offPage || contentI18n });
  const searchConsole = useQuery({ queryKey: ['seo-search-console'], queryFn: seoService.searchConsole, enabled: offPage || active === 'overview' });
  const merchant = useQuery({ queryKey: ['seo-merchant'], queryFn: seoService.merchant, enabled: offPage || active === 'overview' });

  const [contentFilter, setContentFilter] = useState<'all' | ContentType>('all');
  const [contentSearch, setContentSearch] = useState('');
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [editSeo, setEditSeo] = useState<SeoMeta>({});
  const [seoEditorTab, setSeoEditorTab] = useState<'editor' | 'html' | 'preview' | 'snapshot'>('editor');
  const [translatingSeo, setTranslatingSeo] = useState(false);
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [htmlAudit, setHtmlAudit] = useState<any>(null);
  const [linkAuditResult, setLinkAuditResult] = useState<any>(null);
  const [lighthouseResult, setLighthouseResult] = useState<any>(null);
  const [auditPage, setAuditPage] = useState('/');

  const [sourcePath, setSourcePath] = useState('');
  const [destination, setDestination] = useState('');
  const [redirectCode, setRedirectCode] = useState<'301' | '302'>('301');

  const [mediaEdits, setMediaEdits] = useState<Record<string, string>>({});
  const [selectedSchema, setSelectedSchema] = useState('Organization');
  const [selectedPage, setSelectedPage] = useState(0);

  const [kwDraft, setKwDraft] = useState({ keyword: '', targetPath: '', notes: '', priority: '0' });
  const [merchantDraft, setMerchantDraft] = useState({ accountId: '', dataSourceId: '10681156555', feedLabel: 'NL', contentLanguage: 'nl', developerEmail: 'gopeptides1@gmail.com' });
  const [redirectEditing, setRedirectEditing] = useState<any>(null);
  const [kwEditing, setKwEditing] = useState<SeoKeyword | null>(null);

  const [slugInput, setSlugInput] = useState('');
  const [slugPreview, setSlugPreview] = useState('');
  const [readingInput, setReadingInput] = useState('');
  const [readingPreview, setReadingPreview] = useState<{ text: string; minutes: number; words: number } | null>(null);

  const [robotsModalOpen, setRobotsModalOpen] = useState(false);
  const [robotsContent, setRobotsContent] = useState('');

  const robotsQuery = useQuery({
    queryKey: ['robots-txt'],
    queryFn: seoService.getRobotsTxt,
    enabled: robotsModalOpen,
  });

  useEffect(() => {
    if (robotsQuery.data?.content) {
      setRobotsContent(robotsQuery.data.content);
    }
  }, [robotsQuery.data?.content]);

  const updateRobotsMutation = useMutation({
    mutationFn: () => seoService.updateRobotsTxt(robotsContent),
    onSuccess: () => {
      toast('robots.txt updated successfully', 'success');
      setRobotsModalOpen(false);
      qc.invalidateQueries({ queryKey: ['robots-txt'] });
    },
    onError: (err: any) => toast(extractErrorMessage(err), 'error'),
  });

  const webpMutation = useMutation({
    mutationFn: () => seoService.convertToWebp(),
    onSuccess: () => {
      toast('Images successfully converted to WebP', 'success');
      qc.invalidateQueries({ queryKey: ['seo-media'] });
    },
    onError: (err: any) => toast(extractErrorMessage(err), 'error'),
  });

  const packagesByCategory = toolkit.data?.byCategory || {};
  const baseSiteUrl: string = toolkit.data?.siteUrl || '';
  const metadataAudit = mediaMetadata.data as SeoImageMetadataAudit | undefined;
  const contentDetail = useQuery({
    queryKey: ['seo-content-detail', editing?.contentType, editing?.id, seoLang],
    queryFn: () => seoService.contentDetail(editing!.contentType, editing!.id, seoLang),
    enabled: Boolean(editing),
  });

  /** Build the audit target URL for the currently selected language. */
  function auditUrl(path = '/'): string | undefined {
    if (!baseSiteUrl) return undefined;
    const q = seoLang === 'nl' ? '' : path.includes('?') ? `&lang=${seoLang}` : `?lang=${seoLang}`;
    return `${baseSiteUrl}${path}${q}`;
  }

  const audit = useMutation({
    mutationFn: () => seoService.runLinkAudit(auditUrl('/')),
    onSuccess: (data) => { setLinkAuditResult(data); qc.invalidateQueries({ queryKey: ['seo-dashboard'] }); qc.invalidateQueries({ queryKey: ['seo-audits'] }); toast('Link audit completed', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const lighthouseAudit = useMutation({
    mutationFn: () => seoService.runLighthouseAudit(auditUrl('/')),
    onSuccess: (data) => { setLighthouseResult(data); qc.invalidateQueries({ queryKey: ['seo-dashboard'] }); qc.invalidateQueries({ queryKey: ['seo-audits'] }); toast('Lighthouse audit completed', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const htmlAuditMutation = useMutation({
    mutationFn: () => seoService.runHtmlAudit(auditUrl(auditPage)),
    onSuccess: (data) => { setHtmlAudit(data); toast('HTML audit completed', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const slugMutation = useMutation({
    mutationFn: () => seoService.previewSlug(slugInput),
    onSuccess: (data) => setSlugPreview(data.slug),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const scanAnomaliesMutation = useMutation({
    mutationFn: () => seoService.scanAnomalies(),
    onSuccess: (data) => setAnomalies(data),
    onError: (err: any) => toast(extractErrorMessage(err), 'error'),
  });

  const autoFixMutation = useMutation({
    mutationFn: () => seoService.autoFixAnomalies(),
    onSuccess: (res: any) => {
      toast('Auto-Fix Complete', 'success');
      scanAnomaliesMutation.mutate();
    },
    onError: (err: any) => toast(extractErrorMessage(err), 'error'),
  });

  const pingSitemapsMutation = useMutation({
    mutationFn: () => seoService.pingSitemaps(),
    onSuccess: (res: any) => toast('Sitemaps Pinged', 'success'),
    onError: (err: any) => toast(extractErrorMessage(err), 'error'),
  });

  const [anomalies, setAnomalies] = useState<any[]>([]);
  const readingMutation = useMutation({
    mutationFn: () => seoService.previewReadingTime(readingInput),
    onSuccess: (data) => setReadingPreview(data),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const createRedirect = useMutation({
    mutationFn: () => seoService.createRedirect({ sourcePath, destination, statusCode: Number(redirectCode) as 301 | 302 }),
    onSuccess: () => { setSourcePath(''); setDestination(''); qc.invalidateQueries({ queryKey: ['seo-redirects'] }); qc.invalidateQueries({ queryKey: ['seo-dashboard'] }); toast('Redirect created', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const removeRedirect = useMutation({
    mutationFn: seoService.deleteRedirect,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seo-redirects'] }); toast('Redirect deleted', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const updateRedirectMutation = useMutation({
    mutationFn: () => seoService.updateRedirect(redirectEditing!.id, { destination: redirectEditing!.destination, statusCode: Number(redirectEditing!.statusCode) as 301 | 302, isActive: redirectEditing!.isActive }),
    onSuccess: () => { setRedirectEditing(null); qc.invalidateQueries({ queryKey: ['seo-redirects'] }); toast('Redirect updated', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const saveContent = useMutation({
    mutationFn: () => {
      const item = editing!;
      return seoService.updateContent(item.contentType, item.id, editSeo, item.contentType === 'page' ? seoLang : undefined).then(() => item);
    },
    onSuccess: (item) => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['seo-content'] });
      qc.invalidateQueries({ queryKey: ['seo-content-detail'] });
      qc.invalidateQueries({ queryKey: ['seo-keywords'] });
      if (item.contentType === 'product') {
        qc.invalidateQueries({ queryKey: ['admin', 'products'] });
        qc.invalidateQueries({ queryKey: ['products'] });
        if (item.slug) qc.invalidateQueries({ queryKey: ['product', item.slug] });
      } else if (item.contentType === 'category') {
        qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
        qc.invalidateQueries({ queryKey: ['products'] });
      } else if (item.contentType === 'post') {
        qc.invalidateQueries({ queryKey: ['admin', 'blog'] });
        qc.invalidateQueries({ queryKey: ['blog'] });
        if (item.slug) qc.invalidateQueries({ queryKey: ['blog', 'post', item.slug] });
      } else if (item.contentType === 'page') {
        useSettingsStore.getState().refreshSettings();
      }
      toast('SEO metadata saved', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const saveMediaAlt = useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) => seoService.updateMediaAlt(id, alt),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seo-media'] }); qc.invalidateQueries({ queryKey: ['seo-dashboard'] }); toast('Alt text updated', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const convertWebp = useMutation({
    mutationFn: () => seoService.convertToWebp(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['seo-media'] });
      qc.invalidateQueries({ queryKey: ['seo-media-metadata'] });
      toast(`WebP: ${data.converted} converted, ${data.skipped} already done${data.errors.length ? `, ${data.errors.length} errors` : ''}`, 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const geotagMedia = useMutation({
    mutationFn: () => seoService.geotagImages({
      latitude: Number(geoDraft.latitude),
      longitude: Number(geoDraft.longitude),
      altitude: geoDraft.altitude.trim() ? Number(geoDraft.altitude) : null,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['seo-media-metadata'] });
      toast(`Geotagged ${data.updated} of ${data.total} images`, 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const perfTasks = [
    mediaMetadata.isFetching ? {
      key: 'scan-meta',
      title: 'Scanning image metadata',
      detail: 'Reading EXIF/XMP tags from frontend public images and backend uploads.',
      percent: 25,
    } : null,
    (media.isLoading || media.isFetching) ? {
      key: 'load-media',
      title: 'Loading image records',
      detail: 'Fetching product image rows and current alt text from the database.',
      percent: 40,
    } : null,
    convertWebp.isPending ? {
      key: 'webp',
      title: 'Converting images to WebP',
      detail: 'Checking each file, converting non-WebP images, and updating stored references to the preferred WebP copy.',
      percent: 70,
    } : null,
    geotagMedia.isPending ? {
      key: 'geotag',
      title: 'Applying geotag metadata',
      detail: 'Cleaning old metadata and writing fresh XMP GPS latitude, longitude, and optional altitude tags.',
      percent: 85,
    } : null,
  ].filter(Boolean) as Array<{ key: string; title: string; detail: string; percent: number }>;
  const createKeyword = useMutation({
    mutationFn: () => seoService.createKeyword({ keyword: kwDraft.keyword, targetPath: kwDraft.targetPath || undefined, notes: kwDraft.notes || undefined, priority: Number(kwDraft.priority) || 0 }),
    onSuccess: () => { setKwDraft({ keyword: '', targetPath: '', notes: '', priority: '0' }); qc.invalidateQueries({ queryKey: ['seo-keywords'] }); toast('Keyword added', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const updateKeyword = useMutation({
    mutationFn: () => seoService.updateKeyword(kwEditing!.id, { keyword: kwEditing!.keyword, targetPath: kwEditing!.targetPath || undefined, notes: kwEditing!.notes || undefined, priority: kwEditing!.priority }),
    onSuccess: () => { setKwEditing(null); qc.invalidateQueries({ queryKey: ['seo-keywords'] }); toast('Keyword updated', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const deleteKeyword = useMutation({
    mutationFn: seoService.deleteKeyword,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seo-keywords'] }); toast('Keyword deleted', 'success'); },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const analyzeContent = useMutation({
    mutationFn: () => {
      const bodyText = stripHtml(editSeo.bodyContent) || (editSeo.h2 || []).join(' ') || (
        editing?.contentType === 'post'
          ? (editing.content || editing.excerpt || '')
          : (editing?.shortDesc || editing?.description || editing?.excerpt || '')
      );
      const keyword = editSeo.focusKeywords?.[0] || contentDetail.data?.keywordPlan?.primary || '';
      return seoService.analyzeContent({
        title: editSeo.title || editSeo.h1,
        description: editSeo.description,
        text: bodyText,
        keyword,
        url: editing ? `/${editing.slug}` : undefined,
        language: seoLang,
        wordCount: contentDetail.data?.contentWords,
        h2Count: contentDetail.data?.h2?.length,
        imageCount: contentDetail.data?.images?.total,
        internalLinkCount: contentDetail.data?.internalLinks,
        externalLinkCount: contentDetail.data?.externalLinks,
      });
    },
    onSuccess: (data) => setContentAnalysis(data),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const autoTranslateSeo = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('Select a page first');
      if (seoLang === 'en') throw new Error('English is the source language');
      const source = editing.contentType === 'page'
        ? await seoService.contentDetail(editing.contentType, editing.id, 'en')
        : contentDetail.data || await seoService.contentDetail(editing.contentType, editing.id, 'en');
      const sourceTitle = source.editable?.h1 || source.pageTitle || editing.name || editing.title || '';
      const sourceDescription = source.editable?.description || source.metaDescription || '';
      const sourceBody = source.editable?.bodyContent || source.contentPreview || '';
      return translateService.autoTranslate(sourceTitle, sourceDescription, sourceBody, seoLang, source.pageTitle || sourceTitle, source.metaDescription || sourceDescription);
    },
    onMutate: () => setTranslatingSeo(true),
    onSuccess: (data) => {
      setEditSeo((prev) => ({
        ...prev,
        title: data.seoTitle || prev.title || '',
        description: data.seoDescription || data.excerpt || prev.description || '',
        h1: data.title || prev.h1 || '',
        bodyContent: data.content || prev.bodyContent || '',
      }));
      toast('SEO content translated', 'success');
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
    onSettled: () => setTranslatingSeo(false),
  });
  const indexNow = useMutation({
    mutationFn: () => seoService.pingIndexNow(),
    onSuccess: (data) => toast(data.note ? `IndexNow: ${data.note}` : `Submitted ${data.submitted} URL(s) to ${data.engines?.join(', ')}`, data.note ? 'info' : 'success'),
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const saveMerchant = useMutation({
    mutationFn: () => seoService.updateMerchant(merchantDraft),
    onSuccess: () => {
      toast('Merchant settings saved', 'success');
      qc.invalidateQueries({ queryKey: ['seo-merchant'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const syncMerchant = useMutation({
    mutationFn: () => seoService.syncMerchant(),
    onSuccess: (data) => {
      toast(`Merchant sync: ${data.submitted} ok, ${data.failed} failed`, data.failed ? 'info' : 'success');
      qc.invalidateQueries({ queryKey: ['seo-merchant'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });
  const registerMerchantProject = useMutation({
    mutationFn: () => seoService.registerMerchantProject(merchantDraft.developerEmail),
    onSuccess: (data) => {
      toast(data?.developerEmail ? `Merchant project registered for ${data.developerEmail}` : 'Merchant project registered', 'success');
      qc.invalidateQueries({ queryKey: ['seo-merchant'] });
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  });

  const contentItems = useMemo<ContentItem[]>(() => [
    ...(content.data?.pages || []).map((item: any) => ({
      ...item,
      id: item.key,
      contentType: 'page' as const,
      pageKey: item.key,
      name: item.label,
      slug: item.path.replace(/^\//, '') || 'home',
      path: item.path,
      seo: resolvePageSeoValue(item.seo, seoLang),
      supportsLangs: item.supportsLangs,
    })),
    ...(content.data?.products || []).map((item: any) => ({ ...item, contentType: 'product' as const })),
    ...(content.data?.categories || []).map((item: any) => ({ ...item, contentType: 'category' as const })),
    ...(content.data?.posts || []).map((item: any) => ({ ...item, contentType: 'post' as const })),
  ], [content.data, seoLang]);

  const filteredContent = contentItems.filter((item) => {
    if (contentFilter !== 'all' && item.contentType !== contentFilter) return false;
    const label = (item.name || item.title || '').toLowerCase();
    return !contentSearch || label.includes(contentSearch.toLowerCase()) || item.slug.includes(contentSearch.toLowerCase());
  });

  const blogPosts = contentItems.filter((item) => item.contentType === 'post');

  const openEditor = (item: ContentItem) => {
    setEditing(item);
    setEditorInitialized(true);
    setSeoEditorTab('editor');
    setEditSeo({
      title: item.seo?.title || item.seoTitle || '',
      description: item.seo?.description || '',
      focusKeywords: [...(item.seo?.focusKeywords || [])],
      canonicalUrl: item.seo?.canonicalUrl || '',
      robots: item.seo?.robots || 'index,follow',
      socialImage: item.seo?.socialImage || '',
      h1: item.seo?.h1 || '',
      h2: [...(item.seo?.h2 || [])],
      bodyContent: item.seo?.bodyContent || '',
      internalLinks: [...(item.seo?.internalLinks || [])],
      externalLinks: [...(item.seo?.externalLinks || [])],
    });
  };

  useEffect(() => {
    if (!merchant.data?.settings) return;
    setMerchantDraft({
      accountId: merchant.data.settings.accountId || '',
      dataSourceId: merchant.data.settings.dataSourceId || '10681156555',
      feedLabel: merchant.data.settings.feedLabel || 'NL',
      contentLanguage: merchant.data.settings.contentLanguage || 'nl',
      developerEmail: merchantDraft.developerEmail || 'gopeptides1@gmail.com',
    });
  }, [merchant.data?.settings, merchantDraft.developerEmail]);

  useEffect(() => {
    if (!onPage || editorInitialized || editing || !contentItems.length) return;
    openEditor(contentItems.find((item) => item.contentType === 'page') || contentItems[0]);
  }, [onPage, editorInitialized, editing, contentItems]);

  useEffect(() => {
    if (!contentDetail.data) return;
    setEditSeo((prev) => {
      const currentTitle = contentDetail.data.editable?.title || contentDetail.data.pageTitle || '';
      const currentDescription = contentDetail.data.editable?.description || contentDetail.data.metaDescription || '';
      const currentCanonical = contentDetail.data.editable?.canonicalUrl || contentDetail.data.canonical || '';
      const currentRobots = (contentDetail.data.editable?.robots || contentDetail.data.robots || 'index,follow') as SeoMeta['robots'];
      const currentSocialImage = contentDetail.data.editable?.socialImage || '';
      const currentH1 = contentDetail.data.editable?.h1 || '';
      const savedH2 = contentDetail.data.editable?.h2 || [];
      const liveH2 = contentDetail.data.h2 || [];
      const currentH2 = savedH2.length > 0 ? savedH2 : liveH2;
      const currentBody = contentDetail.data.editable?.bodyContent || '';
      return {
        ...prev,
        title: currentTitle,
        description: currentDescription,
        canonicalUrl: currentCanonical,
        robots: currentRobots,
        socialImage: currentSocialImage,
        h1: currentH1,
        h2: currentH2,
        bodyContent: currentBody,
        internalLinks: prev.internalLinks?.length ? prev.internalLinks : [],
        externalLinks: prev.externalLinks?.length ? prev.externalLinks : [],
      };
    });
  }, [contentDetail.data]);

  const schemaTypes = schema.data?.supported || [];
  const schemaSample = schema.data?.samples?.[selectedSchema];
  const pageSchemas = schema.data?.byPage?.[selectedPage];
  const lighthouseRuns = (audits.data || []).filter((run: any) => run.type === 'LIGHTHOUSE');
  const latestLighthouse = lighthouseRuns[0];
  const seoModules = getSeoModules(t);
  const overviewModules = [
    {
      ...seoModules[0],
      lines: [
        `${content.data?.pages?.length || 0} ${t('admin.seo.modules.records')}`,
        editing ? `${t('admin.seo.modules.editing')}: ${editing.name || editing.title}` : t('admin.seo.modules.ready'),
      ],
    },
    {
      ...seoModules[1],
      lines: [
        `${toolkit.data?.technical?.sitemapUrlCount || 0} ${t('admin.seo.modules.urls')}`,
        indexing.data?.robotsAnalysis?.sitemapUrl ? t('admin.seo.modules.sitemapDetected') : t('admin.seo.modules.sitemapPending'),
      ],
    },
    {
      ...seoModules[2],
      lines: [
        `${redirects.data?.length || 0} ${t('admin.seo.modules.redirectCount')}`,
        redirects.data?.length ? t('admin.seo.modules.redirectReady') : t('admin.seo.modules.redirectEmpty'),
      ],
    },
    {
      ...seoModules[3],
      lines: [
        indexing.data?.robotsAnalysis?.sitemapUrl || t('admin.seo.modules.noRobotsSitemap'),
        indexing.data?.robotsAnalysis?.disallowRules?.length ? `${indexing.data.robotsAnalysis.disallowRules.length} ${t('admin.seo.modules.rules')}` : t('admin.seo.modules.noRules'),
      ],
    },
    {
      ...seoModules[4],
      lines: [
        searchConsole.data?.configured ? t('admin.seo.offPage.gscConnected') : t('admin.seo.modules.notConnected'),
        `${searchConsole.data?.sites?.length || 0} ${t('admin.seo.modules.properties')}`,
      ],
    },
    {
      ...seoModules[5],
      lines: [
        latestLighthouse?.summary?.performance != null ? `${t('admin.seo.modules.performanceScore')}: ${latestLighthouse.summary.performance}%` : t('admin.seo.modules.noAuditYet'),
        latestLighthouse?.summary?.seo != null ? `${t('admin.seo.modules.seoScore')}: ${latestLighthouse.summary.seo}%` : t('admin.seo.dash.runAudits'),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-ink">{t('admin.seo.title')}</h1>
          <p className="text-sm text-ink-muted">{t('admin.seo.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted w-full sm:w-auto">Audit language:</span>
          {SEO_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setSeoLang(l.code)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${seoLang === l.code ? 'bg-primary text-white border-primary' : 'border-line text-ink-muted hover:bg-surfaceAlt'}`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      </div>

      {gscConnected && (
        <div className="rounded-md bg-success/10 border border-success/20 p-3 text-sm text-success font-semibold">
          Google Search Console connected successfully.
        </div>
      )}

      <nav className="flex gap-1 border-b border-line pb-3 overflow-x-auto scrollbar-none -mx-1 px-1">
        {tabs.map(([id, label]) => (
          <NavLink
            key={id}
            to={id === 'overview' ? '/admin/seo' : `/admin/seo/${id}`}
            className={({ isActive }) => `px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-md whitespace-nowrap shrink-0 ${isActive || (id === 'overview' && active === 'overview') ? 'bg-primary/10 text-primary' : 'text-ink-muted hover:bg-surfaceAlt'}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {active === 'overview' && (
        <div className="space-y-4">
          {dashboard.error && <ErrorBox message={extractErrorMessage(dashboard.error)} />}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.isLoading ? <p className="text-sm text-ink-muted">Loading SEO health...</p> : (
              <>
                <article className="card p-5"><p className="text-xs text-ink-muted">{t('admin.seo.dash.indexed')}</p><p className="text-2xl font-bold text-ink">{(dashboard.data?.products || 0) + (dashboard.data?.posts || 0)}</p><p className="text-xs text-ink-muted">{dashboard.data?.products || 0} {t('admin.seo.dash.products')}, {dashboard.data?.posts || 0} {t('admin.seo.dash.posts')}</p></article>
                <article className="card p-5"><p className="text-xs text-ink-muted">{t('admin.seo.dash.imageAlt')}</p><p className="text-2xl font-bold text-ink">{dashboard.data?.missingAlt || 0}</p><p className="text-xs text-ink-muted">{t('admin.seo.dash.of')} {dashboard.data?.images || 0} {t('admin.seo.dash.productImages')}</p></article>
                <article className="card p-5"><p className="text-xs text-ink-muted">{t('admin.seo.dash.redirects')}</p><p className="text-2xl font-bold text-ink">{dashboard.data?.redirects || 0}</p><p className="text-xs text-ink-muted">{t('admin.seo.dash.notFoundTracked')}: {dashboard.data?.notFound || 0}</p></article>
                <article className="card p-5"><p className="text-xs text-ink-muted">{t('admin.seo.dash.latestAudit')}</p><p className="text-2xl font-bold text-ink">{dashboard.data?.latestAudits?.[0]?.score == null ? t('admin.seo.dash.notRun') : <Score value={dashboard.data.latestAudits[0].score} />}</p><p className="text-xs text-ink-muted">{t('admin.seo.dash.runAudits')}</p></article>
              </>
            )}
          </div>

          <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_CARDS.map((card) => (
              <NavLink key={card.id} to={`/admin/seo/${card.id}`} className="card p-5 hover:border-primary/40 transition-colors">
                <p className="font-bold text-ink">{card.label}</p>
                <p className="text-sm text-ink-muted mt-1">{card.desc}</p>
                <p className="text-xs text-primary mt-2 font-semibold">{t('admin.seo.dash.openCategory')} →</p>
              </NavLink>
            ))}
          </section>

          <section className="card p-5 space-y-4">
            <div>
              <h3 className="font-bold text-ink">{t('admin.seo.modules.title')}</h3>
              <p className="text-sm text-ink-muted">{t('admin.seo.modules.desc')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {overviewModules.map((module) => (
                <NavLink key={module.id} to={module.target} className="rounded-md border border-line p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{module.label}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-1 rounded">{module.badge}</span>
                  </div>
                  <p className="text-sm text-ink-muted mt-1">{module.desc}</p>
                  <div className="mt-3 space-y-1 text-xs text-ink-muted">
                    {module.lines.map((line: string) => <p key={line}>{line}</p>)}
                  </div>
                  <p className="text-xs text-primary mt-2 font-semibold">{t('admin.seo.dash.openCategory')} →</p>
                </NavLink>
              ))}
            </div>
          </section>

          {toolkit.data?.technical && (
            <section className="card p-5">
              <h3 className="font-bold text-ink mb-2">{t('admin.seo.dash.stackStatus')}</h3>
              <p className="text-sm text-ink-muted">
                {t('admin.seo.dash.sitemapUrls')}: {toolkit.data.technical.sitemapUrlCount} · {t('admin.seo.dash.compression')}: on · {t('admin.seo.dash.helmet')}: on
              </p>
            </section>
          )}

          {audits.data && audits.data.length > 0 && (
            <section className="card p-5">
              <h3 className="font-bold text-ink mb-3">{t('admin.seo.dash.recentAudits')}</h3>
              <div className="divide-y divide-line text-sm">
                {audits.data.slice(0, 6).map((run: any) => (
                  <div key={run.id} className="py-3">
                    <div className="flex justify-between gap-4 mb-1">
                      <div>
                        <span className="font-semibold text-ink">{run.type}</span>
                        <span className="text-xs text-ink-muted ml-2">{new Date(run.createdAt).toLocaleString()}</span>
                      </div>
                      <span>{run.score != null ? <Score value={run.score} /> : '—'}</span>
                    </div>
                    <p className="text-xs text-ink-muted truncate">{run.targetUrl}</p>
                    {run.type === 'LIGHTHOUSE' && run.summary && typeof run.summary === 'object' && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {(['performance', 'seo', 'accessibility', 'best-practices'] as const).map((k) => (
                          run.summary[k] != null && (
                            <span key={k} className={run.summary[k] >= 90 ? 'text-success' : run.summary[k] >= 70 ? 'text-gold' : 'text-danger'}>
                              {k}: {run.summary[k]}%
                            </span>
                          )
                        ))}
                      </div>
                    )}
                    {run.type === 'LINKS' && run.summary && (
                      <p className="text-xs text-ink-muted mt-1">{run.summary.scanned} links · {run.summary.broken} broken</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {onPage && (
        <div className="space-y-4">
          <PackageStack packages={packagesByCategory['on-page'] || []} title={t('admin.seo.onPage.packages')} />

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.onPage.auditTitle')} <LibraryBadge name="cheerio" /></h3>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.onPage.auditDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              <select value={auditPage} onChange={(e) => setAuditPage(e.target.value)} className="input max-w-xs text-sm">
                <option value="/">Home (/)</option>
                <option value="/shop">Shop (/shop)</option>
                <option value="/blog">Blog (/blog)</option>
                <option value="/faq">FAQ (/faq)</option>
                <option value="/contact">Contact (/contact)</option>
              </select>
              <Button onClick={() => htmlAuditMutation.mutate()} loading={htmlAuditMutation.isPending}>
                {t('admin.seo.onPage.runAuditBtn')}
              </Button>
            </div>

            {htmlAudit && (
              <div className="space-y-3">
                {/* Overall score */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-surfaceAlt border border-line">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${htmlAudit.score >= 80 ? 'text-success' : htmlAudit.score >= 60 ? 'text-gold' : 'text-danger'}`}>{htmlAudit.score ?? '—'}%</div>
                    <div className="text-xs text-ink-muted">SEO score</div>
                  </div>
                  <div className="flex-1 text-sm text-ink-muted">
                    <span className="text-success font-semibold">{(htmlAudit.checks || []).filter((c: any) => c.status === 'pass').length} passed</span>
                    {' · '}
                    <span className="text-gold font-semibold">{(htmlAudit.checks || []).filter((c: any) => c.status === 'warn').length} warnings</span>
                    {' · '}
                    <span className="text-danger font-semibold">{(htmlAudit.checks || []).filter((c: any) => c.status === 'fail').length} issues</span>
                    <p className="text-xs mt-1">Audited: <a href={htmlAudit.url} target="_blank" rel="noreferrer" className="text-primary underline">{htmlAudit.url}</a></p>
                  </div>
                </div>

                {/* Structured check cards */}
                <div className="space-y-2">
                  {(['fail', 'warn', 'pass'] as const).map((status) =>
                    (htmlAudit.checks || [])
                      .filter((c: any) => c.status === status)
                      .map((check: any) => (
                        <FindingCard
                          key={check.id}
                          status={check.status}
                          title={check.label}
                          library={check.library || 'cheerio'}
                          detail={`Found: ${check.found}${check.status !== 'pass' ? ` · Expected: ${check.expected}` : ''}`}
                          fix={check.fix}
                        />
                      ))
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="p-5 border-b border-line space-y-3">
              <h3 className="font-bold text-ink">{t('admin.seo.onPage.metaTagsTitle')}</h3>
              <p className="text-sm text-ink-muted">{t('admin.seo.onPage.metaTagsDesc')}</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {(content.data?.pages || []).map((page: any) => {
                  const seo = resolvePageSeoValue(page.seo, seoLang);
                  return (
                    <button
                      key={page.key}
                      type="button"
                      onClick={() => openEditor({ ...page, id: page.key, contentType: 'page', name: page.label, slug: page.path.replace(/^\//, '') || 'home', seo })}
                      className="rounded-md border border-line p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <p className="font-semibold text-sm text-ink">{page.label}</p>
                      <p className="text-xs text-ink-muted">{page.path}</p>
                      <p className="text-xs text-ink-muted mt-1">{seo.title ? t('admin.seo.onPage.titleSet') : t('admin.seo.onPage.missingTitle')}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-5 border-b border-line space-y-3">
              <h3 className="font-bold text-ink">{t('admin.seo.onPage.inventoryTitle')}</h3>
              <p className="text-sm text-ink-muted">{t('admin.seo.onPage.inventoryDesc')}</p>
              <div className="hidden md:grid gap-2 text-[11px] text-ink-muted md:grid-cols-[1.8fr_1.4fr_1fr_1fr_1.2fr_0.7fr]">
                <p>{t('admin.seo.auditCols.page')}</p>
                <p>{t('admin.seo.auditCols.titleMeta')}</p>
                <p>{t('admin.seo.auditCols.headings')}</p>
                <p>{t('admin.seo.auditCols.content')}</p>
                <p>{t('admin.seo.auditCols.canonical')}</p>
                <p>{t('admin.seo.auditCols.validation')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'page', 'product', 'category', 'post'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setContentFilter(f)} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${contentFilter === f ? 'bg-primary text-white' : 'bg-surfaceAlt text-ink-muted'}`}>{f === 'all' ? t('admin.seo.onPage.filterAll') : t(`admin.seo.onPage.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}</button>
                ))}
                <input value={contentSearch} onChange={(e) => setContentSearch(e.target.value)} placeholder={t('admin.seo.onPage.searchPh')} className="input max-w-xs ml-auto" />
              </div>
            </div>
            {content.error && <div className="p-5"><ErrorBox message={extractErrorMessage(content.error)} /></div>}
            <Modal
              open={Boolean(editing)}
              onClose={() => { setEditing(null); setContentAnalysis(null); }}
              title={editing ? `Editing: ${editing.name || editing.title}` : ''}
              subtitle={editing ? `${editing.contentType}${editing.status ? ` · ${editing.status}` : ''}` : ''}
              size="xl"
            >
            {editing && (
              <div className="grid gap-3">
                <p className="text-sm font-semibold text-ink">Editing: {editing.name || editing.title} <span className="text-ink-muted font-normal">({editing.contentType})</span></p>
                {editing.contentType === 'page' && (
                  <div className="grid gap-1">
                    <label className="text-xs font-semibold text-ink-muted">Language</label>
                    <Select
                      value={seoLang}
                      onChange={(e) => setSeoLang(e.target.value as SeoLang)}
                      options={SEO_LANGS.map((l) => ({ value: l.code, label: l.label }))}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {/*
                  <button type="button" onClick={() => setSeoEditorTab('editor')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${seoEditorTab === 'editor' ? 'bg-primary text-white' : 'bg-surface text-ink-muted border border-line'}`}>Content editor</button>
                  <button type="button" onClick={() => setSeoEditorTab('html')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${seoEditorTab === 'html' ? 'bg-primary text-white' : 'bg-surface text-ink-muted border border-line'}`}>Managed HTML</button>
                  <button type="button" onClick={() => setSeoEditorTab('preview')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${seoEditorTab === 'preview' ? 'bg-primary text-white' : 'bg-surface text-ink-muted border border-line'}`}>Preview</button>
                  <button type="button" onClick={() => setSeoEditorTab('snapshot')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${seoEditorTab === 'snapshot' ? 'bg-primary text-white' : 'bg-surface text-ink-muted border border-line'}`}>Live page snapshot</button>
                  */}
                  {seoLang !== 'en' && (
                    <Button type="button" variant="secondary" onClick={() => autoTranslateSeo.mutate()} loading={translatingSeo}>
                      Auto-translate from EN
                    </Button>
                  )}
                </div>
                {/*
                <p className="text-xs text-ink-muted">{t('admin.seo.modules.metaEditorHint')}</p>
                <div className="rounded-md border border-gold/30 bg-gold/5 p-3 text-xs text-ink-muted">
                  <p className="font-semibold text-ink mb-1">How this editor works</p>
                  <p><strong>Content editor</strong> and <strong>Managed HTML</strong> are the parts you can edit like a WordPress content area.</p>
                  <p><strong>Live page snapshot</strong> is read-only and shows what the real React page currently renders, including theme parts like headers, product grids, reviews, or video sections.</p>
                  <p><strong>Important:</strong> the editable field does not try to copy the whole homepage layout anymore. It only stores the SEO-managed HTML block for this page.</p>
                </div>
                */}
                <div className="rounded-md border border-line bg-white p-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-xs">
                  <div>
                    <p className="font-semibold text-ink">SEO title</p>
                    <p className="text-ink-muted">Browser title tag, not the visible page heading.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Meta description</p>
                    <p className="text-ink-muted">Short search-result summary below the title.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">H1</p>
                    <p className="text-ink-muted">One main visible page heading only.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">H2</p>
                    <p className="text-ink-muted">Section headings already on the page. Edits update those headings in place — nothing is added before the footer.</p>
                  </div>
                  <div className="sm:col-span-2 xl:col-span-2">
                    <p className="font-semibold text-ink">Page content</p>
                    <p className="text-ink-muted">Normal paragraphs, lists, quotes, code, links, and images for the page body.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Internal links</p>
                    <p className="text-ink-muted">Links to your own site like <code>/shop</code> or <code>/blog</code>.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">External links</p>
                    <p className="text-ink-muted">Links to other sites like research papers or partner pages.</p>
                  </div>
                </div>
                <input value={editSeo.title || ''} onChange={(e) => setEditSeo({ ...editSeo, title: e.target.value })} placeholder="SEO title" className="input" />
                <textarea value={editSeo.description || ''} onChange={(e) => setEditSeo({ ...editSeo, description: e.target.value })} placeholder="Meta description" rows={3} className="input" />
                <div>
                  <Input label="H1 (main page heading)" value={editSeo.h1 || ''} onChange={(e) => setEditSeo({ ...editSeo, h1: e.target.value })} placeholder="Enter an override H1, or leave blank to use the default" />
                  {contentDetail.data?.h1?.[0] && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-ink-muted"><strong>Current page H1:</strong> {contentDetail.data.h1[0]}</p>
                      <button type="button" onClick={() => setEditSeo({ ...editSeo, h1: contentDetail.data.h1?.[0] || '' })} className="text-[10px] uppercase font-bold text-primary hover:underline">Copy to editor</button>
                    </div>
                  )}
                </div>
                <div>
                  <H2ListEditor items={editSeo.h2 || []} onChange={(h2) => setEditSeo({ ...editSeo, h2 })} />
                  {contentDetail.data?.h2 && contentDetail.data.h2.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-ink-muted"><strong>Live page H2 order:</strong></p>
                      <ul className="text-xs text-ink-muted list-disc list-inside">
                        {contentDetail.data.h2.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                {/*
                {seoEditorTab === 'editor' ? (
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Page content (editable WordPress-style block)</label>
                    <p className="mb-2 text-xs text-ink-muted">Edit only the SEO-managed content block here: paragraphs, lists, links, images, and section text you want to control from SEO Center.</p>
                    <RichTextEditor
                      value={editSeo.bodyContent || ''}
                      onChange={(bodyContent) => setEditSeo({ ...editSeo, bodyContent })}
                      placeholder="Write the editable content block here. This should not include the full React layout, sliders, product grids, reviews, or videos."
                      minHeight="260px"
                    />
                  </div>
                ) : seoEditorTab === 'html' ? (
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Managed HTML source</label>
                    <p className="mb-2 text-xs text-ink-muted">Raw HTML for the same editable content block. This is the closest mode to a classic WordPress HTML editor.</p>
                    <textarea
                      value={editSeo.bodyContent || ''}
                      onChange={(e) => setEditSeo({ ...editSeo, bodyContent: e.target.value })}
                      placeholder="<p>This is editable page HTML content.</p>"
                      rows={12}
                      className="input font-mono text-xs"
                    />
                  </div>
                ) : seoEditorTab === 'preview' ? (
                  <iframe
                    title="SEO page preview"
                    sandbox=""
                    srcDoc={seoPreviewDocument({
                      title: editSeo.h1 || editSeo.title || editing.name || editing.title || '',
                      description: editSeo.description || '',
                      bodyContent: editSeo.bodyContent || '',
                    })}
                    className="w-full h-[420px] border border-line rounded-md bg-white"
                  />
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border border-line p-3 space-y-2 text-sm">
                      <p className="font-semibold text-ink">Live page output</p>
                      <p className="text-xs text-ink-muted"><strong>URL:</strong> {contentDetail.data?.url || 'Loading…'}</p>
                      <HeadingStack label="Visible H1" items={contentDetail.data?.h1 || []} tone="primary" />
                      <HeadingStack label="Visible H2" items={(contentDetail.data?.h2 || []).slice(0, 6)} />
                      <p className="text-xs text-ink-muted">This includes real page components that are not part of the editable content block.</p>
                    </div>
                    <div className="rounded-md border border-line p-3 space-y-2 text-sm">
                      <p className="font-semibold text-ink">Rendered HTML source (read-only)</p>
                      <pre className="overflow-auto bg-surfaceAlt p-3 text-[11px] rounded max-h-64 whitespace-pre-wrap break-all">{contentDetail.data?.sourcePreview || 'Loading…'}</pre>
                    </div>
                  </div>
                )}
                */}
                <div>
                  <p className="text-xs font-semibold text-ink-muted mb-1">Focus keywords</p>
                  <KeywordChips keywords={editSeo.focusKeywords || []} onChange={(focusKeywords) => setEditSeo((prev: any) => ({ ...prev, focusKeywords }))} />
                </div>
                <input value={editSeo.canonicalUrl || ''} onChange={(e) => setEditSeo({ ...editSeo, canonicalUrl: e.target.value })} placeholder="Canonical URL (optional)" className="input" />
                <Select
                  value={editSeo.robots || 'index,follow'}
                  onChange={(e) => setEditSeo({ ...editSeo, robots: e.target.value as SeoMeta['robots'] })}
                  options={[
                    { value: 'index,follow', label: 'index, follow' },
                    { value: 'noindex,follow', label: 'noindex, follow' },
                    { value: 'noindex,nofollow', label: 'noindex, nofollow' },
                  ]}
                />
                <LinkListEditor label="Internal links" links={editSeo.internalLinks || []} onChange={(internalLinks) => setEditSeo({ ...editSeo, internalLinks })} />
                <LinkListEditor label="External links" links={editSeo.externalLinks || []} onChange={(externalLinks) => setEditSeo({ ...editSeo, externalLinks })} />
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => saveContent.mutate()} loading={saveContent.isPending}>Save SEO metadata</Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setEditSeo(prev => ({
                        ...prev,
                        h1: '',
                        h2: [],
                        bodyContent: '',
                        internalLinks: [],
                        externalLinks: []
                      }));
                      toast('Cleared extra fields. Click Save to apply.', 'success');
                    }}
                  >
                    Clear Extra Data
                  </Button>
                  <Button variant="secondary" onClick={() => analyzeContent.mutate()} loading={analyzeContent.isPending}>Analyze with Yoast</Button>
                  {contentDetail.data?.url && <a href={contentDetail.data.url} target="_blank" rel="noreferrer" className="inline-flex"><Button variant="secondary">Preview page</Button></a>}
                  <Button variant="ghost" onClick={() => { setEditing(null); setContentAnalysis(null); }}>Cancel</Button>
                </div>
                {contentDetail.isLoading ? <p className="text-sm text-ink-muted">Loading page audit preview...</p> : contentDetail.data && (
                  <details className="rounded-md border border-line bg-white" open={false}>
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ink">
                      Page audit snapshot
                    </summary>
                    <div className="grid gap-3 border-t border-line p-4 lg:grid-cols-2">
                    <div className="rounded-md border border-line p-3 space-y-2 text-sm">
                      <p className="font-semibold text-ink">{t('admin.seo.auditPreview.title')}</p>
                      <p className="text-xs text-ink-muted"><strong>URL:</strong> {contentDetail.data.url}</p>
                      <HeadingStack label="H1" items={contentDetail.data.h1 || []} tone="primary" />
                      <HeadingStack label="H2" items={(contentDetail.data.h2 || []).slice(0, 8)} />
                      <p className="text-xs text-ink-muted"><strong>Words:</strong> {contentDetail.data.contentWords} · <strong>Images:</strong> {contentDetail.data.images.total} · <strong>Missing alt:</strong> {contentDetail.data.images.missingAlt}</p>
                      <p className="text-xs text-ink-muted"><strong>Canonical:</strong> {contentDetail.data.canonical || 'None'}</p>
                      <p className="text-xs text-ink-muted"><strong>Validation:</strong> {contentDetail.data.validation.score}%</p>
                      {contentDetail.data.keywordPlan && (
                        <div className="rounded bg-primary/5 border border-primary/10 p-2 text-xs text-ink-muted">
                          <p><strong>{t('admin.seo.auditPreview.primary')}:</strong> {contentDetail.data.keywordPlan.primary}</p>
                          <p><strong>{t('admin.seo.auditPreview.secondary')}:</strong> {contentDetail.data.keywordPlan.secondary.join(', ') || '—'}</p>
                          <p><strong>{t('admin.seo.auditPreview.longTail')}:</strong> {contentDetail.data.keywordPlan.longTail.join(', ') || '—'}</p>
                        </div>
                      )}
                    </div>
                    <div className="rounded-md border border-line p-3 space-y-2 text-sm">
                      <p className="font-semibold text-ink">{t('admin.seo.auditPreview.source')}</p>
                      <pre className="overflow-auto bg-surfaceAlt p-3 text-[11px] rounded max-h-64 whitespace-pre-wrap break-all">{contentDetail.data.sourcePreview}</pre>
                    </div>
                    {!!contentDetail.data.validation.issues.length && (
                      <div className="lg:col-span-2 space-y-2">
                        {contentDetail.data.validation.issues.slice(0, 8).map((issue) => (
                          <FindingCard key={issue.id} status={issue.status as FindingStatus} title={issue.label} detail={`Found: ${issue.found} · Expected: ${issue.expected}`} fix={issue.fix} />
                        ))}
                      </div>
                    )}
                    </div>
                  </details>
                )}
                {contentAnalysis && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md border border-line p-3 text-center">
                        <p className="text-xs text-ink-muted mb-1">SEO score <LibraryBadge name="yoastseo" /></p>
                        <ScoreBar value={contentAnalysis.seoScore} label="Yoast SEO" />
                      </div>
                      <div className="rounded-md border border-line p-3 text-center">
                        <p className="text-xs text-ink-muted mb-1">Readability <LibraryBadge name="yoastseo" /></p>
                        <ScoreBar value={contentAnalysis.readabilityScore} label="Readability" />
                      </div>
                    </div>
                    {[
                      { label: 'SEO assessments (Yoast SeoAssessor)', items: contentAnalysis.seo || [] },
                      { label: 'Readability assessments (Yoast ContentAssessor)', items: contentAnalysis.readability || [] },
                    ].map(({ label, items }) => (
                      <div key={label} className="space-y-2">
                        <p className="text-xs font-bold text-ink-muted uppercase">{label}</p>
                        <div className="max-h-64 overflow-auto space-y-2">
                          {items.map((i: any) => (
                            <FindingCard
                              key={i.id}
                              status={i.rating === 'good' ? 'pass' : i.rating === 'ok' ? 'warn' : 'fail'}
                              title={i.id.replace(/([A-Z])/g, ' $1').trim()}
                              library={i.library || 'yoastseo'}
                              extra={`score ${i.score}/9`}
                              detail={i.text}
                            />
                          ))}
                          {!items.length && <p className="text-xs text-ink-muted">No assessments returned — add more body text and a focus keyword.</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </Modal>
            {content.isLoading ? <p className="p-5 text-sm text-ink-muted">Loading content...</p> : (
              <div className="divide-y divide-line max-h-[600px] overflow-auto">
                {filteredContent.map((item) => (
                  <div key={`${item.contentType}-${item.id}`} className="p-4 grid gap-3 md:grid-cols-[1.8fr_1.4fr_1fr_1fr_1.2fr_0.7fr] md:items-start">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink">{item.name || item.title}</p>
                      <p className="text-xs text-ink-muted">{contentPath(item)} · {item.contentType}{item.status ? ` · ${item.status}` : ''}</p>
                    </div>
                    <div className="text-xs text-ink-muted min-w-0">
                      <p className="truncate">{item.seo?.title || item.seoTitle || t('admin.seo.onPage.missingTitle')}</p>
                      <p className="truncate">{item.seo?.description || 'No meta description'}</p>
                    </div>
                    <div className="text-xs text-ink-muted">
                      <p className="font-semibold text-ink truncate">H1: {item.seo?.h1 || item.name || item.title || '—'}</p>
                      <p>H2 count: {item.seo?.h2?.length || 0}</p>
                      {!!item.seo?.h2?.length && <p className="truncate">First H2: {item.seo.h2[0]}</p>}
                    </div>
                    <div className="text-xs text-ink-muted">
                      <p>{item.seo?.focusKeywords?.length ? `${item.seo.focusKeywords.length} ${t('admin.seo.onPage.keywords')}` : t('admin.seo.onPage.noKeywords')}</p>
                      <p>{item.contentType === 'post' ? 'Post content' : 'Rendered preview'}</p>
                    </div>
                    <div className="text-xs text-ink-muted min-w-0">
                      <p className="truncate">{item.seo?.canonicalUrl || contentPath(item)}</p>
                      <p>{item.seo?.robots || 'index,follow'}</p>
                    </div>
                    <div className="text-right text-xs text-ink-muted">
                      <button type="button" onClick={() => openEditor(item)} className="text-primary font-semibold">{t('admin.seo.onPage.edit')}</button>
                    </div>
                  </div>
                ))}
                {!filteredContent.length && <p className="p-5 text-sm text-ink-muted">{t('admin.seo.onPage.noContent')}</p>}
              </div>
            )}
          </section>

          <section className="space-y-4">
            {schema.error && <ErrorBox message={extractErrorMessage(schema.error)} />}
            {schema.isLoading ? <p className="text-sm text-ink-muted">Loading schema data...</p> : (
              <>
                <div className="card p-5 space-y-3">
                  <h3 className="font-bold text-ink">{t('admin.seo.onPage.structuredData')}</h3>
                  <p className="text-sm text-ink-muted">{t('admin.seo.onPage.structuredDataDesc')}</p>
                  <div className="flex flex-wrap gap-2">
                    {schemaTypes.map((type: string) => (
                      <button key={type} type="button" onClick={() => setSelectedSchema(type)} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${selectedSchema === type ? 'bg-primary text-white' : 'bg-surfaceAlt text-ink-muted'}`}>{type}</button>
                    ))}
                  </div>
                  <pre className="overflow-auto bg-surfaceAlt p-4 text-xs rounded-md max-h-96">{JSON.stringify(schemaSample || { message: 'No sample available' }, null, 2)}</pre>
                </div>
                <div className="card p-5 space-y-3">
                  <h3 className="font-bold text-ink">{t('admin.seo.onPage.schemaByPage')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {(schema.data?.byPage || []).map((entry: any, index: number) => (
                      <button key={entry.page.path} type="button" onClick={() => setSelectedPage(index)} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${selectedPage === index ? 'bg-primary text-white' : 'bg-surfaceAlt text-ink-muted'}`}>{entry.page.label}</button>
                    ))}
                  </div>
                  {pageSchemas && (
                    <>
                      <p className="text-xs text-ink-muted">Path: {pageSchemas.page.path} · Types: {pageSchemas.page.types.join(', ')}</p>
                      {pageSchemas.schemas.map((doc: Record<string, unknown>, i: number) => (
                        <pre key={i} className="overflow-auto bg-surfaceAlt p-4 text-xs rounded-md max-h-72">{JSON.stringify(doc, null, 2)}</pre>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {technical && (
        <div className="space-y-4">
          <PackageStack packages={packagesByCategory.technical || []} title={t('admin.seo.tech.packages')} />

          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-ink">{t('admin.seo.tech.indexing')}</h3>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.tech.indexingDesc')}
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <a href={`${baseSiteUrl}/robots.txt`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">{t('admin.seo.tech.openRobots')}</a>
                <Button variant="secondary" size="sm" onClick={() => setRobotsModalOpen(true)}>{t('admin.seo.tech.editRobots')}</Button>
              </div>
              <div className="flex items-center gap-3">
                <a href={`${baseSiteUrl}/sitemap.xml`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">{t('admin.seo.tech.openSitemap')}</a>
                <Button variant="secondary" size="sm" onClick={() => pingSitemapsMutation.mutate()} loading={pingSitemapsMutation.isPending}>{t('admin.seo.tech.updateSitemap')}</Button>
              </div>
              <p className="text-sm text-ink-muted mt-2">
                IndexNow: {toolkit.data?.technical?.indexNow ? <span className="text-success font-semibold">active · key file present</span> : <span className="text-danger">inactive</span>}
              </p>
            </div>
            {indexing.error && <ErrorBox message={extractErrorMessage(indexing.error)} />}
            {indexing.isLoading ? <p className="text-sm text-ink-muted">Loading indexing status...</p> : indexing.data && (
              <>
                {indexing.data.robotsAnalysis && (
                  <div className="space-y-2 border-t border-line pt-3">
                    <p className="text-sm font-semibold text-ink">robots.txt analysis <LibraryBadge name="robots-parser" /></p>
                    {indexing.data.robotsAnalysis.sitemapUrl && (
                      <p className="text-xs text-ink-muted">Sitemap declared: <code>{indexing.data.robotsAnalysis.sitemapUrl}</code></p>
                    )}
                    {indexing.data.robotsAnalysis.disallowRules?.length > 0 && (
                      <div className="text-xs text-ink-muted">
                        <p className="font-semibold mb-1">Disallow rules:</p>
                        {indexing.data.robotsAnalysis.disallowRules.map((r: string) => <p key={r} className="font-mono">{r}</p>)}
                      </div>
                    )}
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {(indexing.data.robotsAnalysis.pageChecks || []).map((row: any) => (
                        <FindingCard
                          key={`${row.path}-${row.userAgent}`}
                          status={row.allowed ? 'pass' : 'fail'}
                          title={`${row.path} for ${row.userAgent}`}
                          library="robots-parser"
                          detail={row.allowed ? 'Crawler is allowed to fetch this path' : 'Crawler is BLOCKED — page may not be indexed'}
                          fix={row.allowed ? undefined : 'Remove or adjust the Disallow rule in generateRobots() for this path'}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {indexing.data.notFoundPaths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ink-muted mb-2">Top 404 paths</p>
                    <div className="divide-y divide-line text-sm">{indexing.data.notFoundPaths.map((row: any) => <div key={row.path} className="py-1 flex justify-between"><span>{row.path}</span><span className="text-ink-muted">{row.hits} hits</span></div>)}</div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-ink">{t('admin.seo.tech.auditTitle')}</h3>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.tech.auditDesc')}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => scanAnomaliesMutation.mutate()} loading={scanAnomaliesMutation.isPending}>
                {t('admin.seo.tech.scanBtn')}
              </Button>
              {anomalies.length > 0 && (
                <Button variant="secondary" onClick={() => autoFixMutation.mutate()} loading={autoFixMutation.isPending}>
                  Auto-Fix All Anomalies
                </Button>
              )}
            </div>

            {anomalies.length > 0 ? (
              <div className="mt-4 space-y-2 max-h-96 overflow-auto">
                <p className="text-xs text-danger font-semibold pb-2">Found {anomalies.length} anomalies:</p>
                {anomalies.map((a: any, i: number) => (
                  <FindingCard
                    key={i}
                    status="fail"
                    title={`${a.error}: ${a.title}`}
                    detail={a.issue}
                    fix={a.suggestion}
                    extra={a.type.toUpperCase()}
                  />
                ))}
              </div>
            ) : scanAnomaliesMutation.isSuccess ? (
              <p className="text-success text-sm mt-4 font-semibold">✅ Perfect! No Slugify or Helmet anomalies found.</p>
            ) : null}
          </section>

          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-ink">{t('admin.seo.tech.searchIndexing')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => pingSitemapsMutation.mutate()} loading={pingSitemapsMutation.isPending}>
                {t('admin.seo.tech.updateSitemap')}
              </Button>
              <Button onClick={() => indexNow.mutate()} loading={indexNow.isPending} variant="secondary">
                {t('admin.seo.tech.indexNowBtn')}
              </Button>
            </div>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.tech.searchIndexingDesc')}
            </p>
          </section>

          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-ink">{t('admin.seo.tech.crawlAudits')}</h3>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.tech.crawlAuditsDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => audit.mutate()} loading={audit.isPending}>{t('admin.seo.tech.runLinkAuditBtn')}</Button>
              <Button variant="secondary" onClick={() => lighthouseAudit.mutate()} loading={lighthouseAudit.isPending}>{t('admin.seo.tech.runLighthouseBtn')}</Button>
            </div>

            {(linkAuditResult || audit.data) && (() => {
              const data = linkAuditResult || audit.data;
              const findings = data.results?.findings || [];
              const broken = findings.filter((f: any) => f.status === 'fail');
              const warns = findings.filter((f: any) => f.status === 'warn');
              return (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-ink">
                    <LibraryBadge name="linkinator" /> Score: <Score value={data.score} /> — {data.summary?.broken || 0} broken · {data.summary?.skipped || 0} skipped · {data.summary?.scanned || 0} total
                  </p>
                  <div className="space-y-2 max-h-80 overflow-auto">
                    {broken.map((f: any) => (
                      <FindingCard key={f.url} status="fail" title={f.url} library="linkinator" detail={f.detail} extra={f.parent ? `found on ${f.parent}` : undefined} />
                    ))}
                    {warns.slice(0, 10).map((f: any) => (
                      <FindingCard key={f.url} status="warn" title={f.url} library="linkinator" detail={f.detail} />
                    ))}
                    {!broken.length && !warns.length && <p className="text-success text-sm">All crawled links returned OK status.</p>}
                  </div>
                </div>
              );
            })()}

            {(lighthouseResult || lighthouseAudit.data) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Lighthouse results</p>
                <LighthouseScoreCards summary={(lighthouseResult || lighthouseAudit.data).summary || {}} />
                <LighthouseFindingsPanel results={(lighthouseResult || lighthouseAudit.data).results || {}} />
              </div>
            )}

            {/* Audit history */}
            {audits.data && audits.data.length > 0 && (
              <div className="border border-line rounded-md divide-y divide-line">
                {audits.data.map((run: any) => (
                  <div key={run.id} className="p-3 text-sm">
                    <div className="flex justify-between gap-4 mb-1">
                      <div>
                        <span className="font-semibold text-ink">{run.type}</span>
                        <span className="text-ink-muted text-xs ml-2">{new Date(run.createdAt).toLocaleString()} — {run.targetUrl}</span>
                      </div>
                      <div className="text-right">{run.score != null ? <Score value={run.score} /> : '—'}</div>
                    </div>
                    {run.type === 'LIGHTHOUSE' && run.results?.findings && (
                      <LighthouseFindingsPanel results={run.results} />
                    )}
                    {run.type === 'LINKS' && run.results?.findings && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                        {run.results.findings.filter((f: any) => f.status !== 'pass').slice(0, 8).map((f: any) => (
                          <FindingCard key={f.url} status={f.status} title={f.url} library="linkinator" detail={f.detail} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-ink">{t('admin.seo.tech.redirectManager')}</h3>
            <p className="text-sm text-ink-muted">{t('admin.seo.tech.redirectManagerDesc')}</p>
            {redirects.error && <ErrorBox message={extractErrorMessage(redirects.error)} />}
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto_auto]">
              <input value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} placeholder="/old-page" className="input" />
              <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="/new-page" className="input" />
              <Select
                value={redirectCode}
                onChange={(e) => setRedirectCode(e.target.value as '301' | '302')}
                options={[
                  { value: '301', label: '301 Permanent' },
                  { value: '302', label: '302 Temporary' },
                ]}
              />
              <Button onClick={() => createRedirect.mutate()} loading={createRedirect.isPending} disabled={!sourcePath || !destination}>{t('admin.seo.tech.addRedirectBtn')}</Button>
            </div>
            {redirects.isLoading ? <p className="text-sm text-ink-muted">Loading redirects...</p> : (
              <div className="divide-y divide-line">
                {(redirects.data || []).map((item: any) => (
                  <div key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-mono">{item.sourcePath}</span> → <span className="font-mono">{item.destination}</span>
                      <span className="text-ink-muted ml-2">({item.statusCode}) · {item.hits || 0} hits · {item.isActive ? 'active' : 'inactive'}</span>
                    </div>
                    <div className="flex gap-2">
                      {baseSiteUrl && (
                        <a href={`${baseSiteUrl}${item.sourcePath}`} target="_blank" rel="noreferrer" className="text-xs text-primary font-semibold underline mt-2 mr-2">Test</a>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setRedirectEditing(item)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => removeRedirect.mutate(item.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
                {!redirects.data?.length && <p className="text-sm text-ink-muted py-2">No redirects yet.</p>}
              </div>
            )}
            {redirectEditing && (
              <div className="card p-5 grid gap-3 bg-surfaceAlt mt-2">
                <p className="text-sm font-semibold">Editing redirect: {redirectEditing.sourcePath}</p>
                <input value={redirectEditing.destination} onChange={(e) => setRedirectEditing({ ...redirectEditing, destination: e.target.value })} placeholder="Destination" className="input" />
                <div className="flex gap-4 items-center">
                  <Select
                    value={String(redirectEditing.statusCode)}
                    onChange={(e) => setRedirectEditing({ ...redirectEditing, statusCode: Number(e.target.value) })}
                    options={[
                      { value: '301', label: '301 Permanent' },
                      { value: '302', label: '302 Temporary' },
                    ]}
                  />
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={redirectEditing.isActive} onChange={(e) => setRedirectEditing({ ...redirectEditing, isActive: e.target.checked })} />
                    Active
                  </label>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => updateRedirectMutation.mutate()} loading={updateRedirectMutation.isPending}>Save</Button>
                  <Button variant="ghost" onClick={() => setRedirectEditing(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {offPage && (
        <div className="space-y-4">
          <PackageStack packages={packagesByCategory['off-page'] || []} title={t('admin.seo.offPage.packages')} />

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.offPage.gsc')}</h3>
            {searchConsole.isLoading ? (
              <p className="text-sm text-ink-muted">{t('admin.seo.offPage.gscLoading')}</p>
            ) : searchConsole.data?.configured ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-success font-semibold">{t('admin.seo.offPage.gscConnected')}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => qc.invalidateQueries({ queryKey: ['seo-search-console'] })}
                  >
                    {t('admin.seo.offPage.gscRefresh')}
                  </Button>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold underline">
                    {t('admin.seo.offPage.gscOpen')}
                  </a>
                </div>
                {(searchConsole.data.sites || []).map((site: any) => (
                  <p key={site.siteUrl} className="text-ink">{site.siteUrl} <span className="text-ink-muted">({site.permissionLevel})</span></p>
                ))}
                {!searchConsole.data.sites?.length && (
                  <div className="rounded-md bg-surfaceAlt border border-line p-3 text-xs space-y-2 text-ink-muted">
                    <p className="font-semibold text-ink">No properties on this Google account yet</p>
                    <p>The API is connected, but <strong>gopeptides.nl</strong> must be added and verified in Search Console using the <em>same</em> Google account you connected (<code>gopeptides1@gmail.com</code>).</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-primary underline">search.google.com/search-console</a></li>
                      <li>
                        <strong>Recommended — Domain property:</strong> click Add property → <strong>Domain</strong> → type only{' '}
                        <code className="select-all">gopeptides.nl</code> (no <code>https://</code>, no trailing slash)
                      </li>
                      <li>
                        <strong>Or URL prefix:</strong> choose URL prefix → type exactly{' '}
                        <code className="select-all">https://gopeptides.nl/</code> (with trailing <code>/</code>)
                      </li>
                      <li>Verify via DNS TXT record at your domain registrar (required for Domain property)</li>
                      <li>Return here and click <strong>Refresh sites</strong></li>
                    </ol>
                    <p className="text-ink-muted pt-1">
                      If you see &quot;Invalid site URL&quot;: you may be using the wrong property type — Domain wants <code>gopeptides.nl</code> only;
                      URL prefix wants the full URL with <code>https://</code> and a trailing <code>/</code>.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {searchConsole.data?.message && (
                  <p className={`text-sm ${searchConsole.data.enableApiUrl ? 'text-gold' : 'text-ink-muted'}`}>
                    {searchConsole.data.message}
                  </p>
                )}
                {searchConsole.data?.enableApiUrl && (
                  <a href={searchConsole.data.enableApiUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <Button variant="secondary">Enable Search Console API in Google Cloud</Button>
                  </a>
                )}
                {searchConsole.data?.redirectUri && !searchConsole.data?.configured && (
                  <div className="rounded-md bg-surfaceAlt border border-line p-3 text-xs space-y-1">
                    <p className="font-semibold text-ink">Authorized redirect URI:</p>
                    <code className="block text-primary break-all select-all">{searchConsole.data.redirectUri}</code>
                  </div>
                )}
                {searchConsole.data?.connectUrl && (
                  <a href={searchConsole.data.connectUrl} className="inline-block">
                    <Button variant="secondary">Connect Google Search Console</Button>
                  </a>
                )}
                {!searchConsole.data?.connectUrl && searchConsole.data?.message?.includes('GOOGLE_CLIENT_ID') && (
                  <p className="text-xs text-ink-muted">Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env.</p>
                )}
              </div>
            )}
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">Google Merchant API</h3>
            <p className="text-sm text-ink-muted">
              Push active products from the live store to Merchant Center via the{' '}
              <a href="https://developers.google.com/merchant/api" target="_blank" rel="noreferrer" className="text-primary underline">Merchant API</a>.
              The data source must be type <strong>API</strong> (create one in Merchant Center → Products → Data sources if your current source is sitemap-only).
            </p>
            {merchant.isLoading ? (
              <p className="text-sm text-ink-muted">Loading Merchant status…</p>
            ) : (
              <div className="space-y-3 text-sm">
                {merchant.data?.message && (
                  <p className="text-ink-muted">{merchant.data.message}</p>
                )}
                {merchant.data?.enableApiUrl && (
                  <a href={merchant.data.enableApiUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <Button variant="secondary" size="sm">Enable Merchant API in Google Cloud</Button>
                  </a>
                )}
                {merchant.data?.registerGuideUrl && (
                  <a href={merchant.data.registerGuideUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <Button variant="secondary" size="sm">Open Merchant registration guide</Button>
                  </a>
                )}
                {merchant.data?.connectUrl && (
                  <a href={merchant.data.connectUrl} className="inline-block">
                    <Button variant="secondary" size="sm">Connect Google (GSC + Merchant)</Button>
                  </a>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={merchantDraft.accountId}
                    onChange={(e) => setMerchantDraft({ ...merchantDraft, accountId: e.target.value })}
                    placeholder="Merchant Center account ID"
                    className="input"
                  />
                  <input
                    value={merchantDraft.dataSourceId}
                    onChange={(e) => setMerchantDraft({ ...merchantDraft, dataSourceId: e.target.value })}
                    placeholder="Data source ID"
                    className="input"
                  />
                  <input
                    value={merchantDraft.feedLabel}
                    onChange={(e) => setMerchantDraft({ ...merchantDraft, feedLabel: e.target.value })}
                    placeholder="Feed label (e.g. NL)"
                    className="input"
                  />
                  <input
                    value={merchantDraft.contentLanguage}
                    onChange={(e) => setMerchantDraft({ ...merchantDraft, contentLanguage: e.target.value })}
                    placeholder="Content language (e.g. nl)"
                    className="input"
                  />
                  <input
                    value={merchantDraft.developerEmail}
                    onChange={(e) => setMerchantDraft({ ...merchantDraft, developerEmail: e.target.value })}
                    placeholder="Developer email for Merchant API"
                    className="input sm:col-span-2"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="sm" onClick={() => saveMerchant.mutate()} loading={saveMerchant.isPending}>Save settings</Button>
                  <Button size="sm" variant="secondary" onClick={() => registerMerchantProject.mutate()} loading={registerMerchantProject.isPending} disabled={!merchantDraft.accountId.trim() || !merchantDraft.developerEmail.trim()}>
                    Register GCP project
                  </Button>
                  <Button size="sm" onClick={() => syncMerchant.mutate()} loading={syncMerchant.isPending} disabled={!merchantDraft.accountId.trim()}>
                    Sync {merchant.data?.productCount ?? 0} products
                  </Button>
                  {merchant.data?.feedPreviewUrl && (
                    <a href={merchant.data.feedPreviewUrl} target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold underline">
                      Preview live feed JSON
                    </a>
                  )}
                  {merchant.data?.productSitemapUrl && (
                    <a href={merchant.data.productSitemapUrl} target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold underline">
                      Product sitemap
                    </a>
                  )}
                </div>
                {merchant.data?.lastSyncAt && (
                  <p className="text-xs text-ink-muted">
                    Last sync: {new Date(merchant.data.lastSyncAt).toLocaleString()}
                    {merchant.data.lastSync ? ` — ${merchant.data.lastSync.submitted} ok, ${merchant.data.lastSync.failed} failed` : ''}
                  </p>
                )}
                {(merchant.data?.lastSync?.errors || []).slice(0, 3).map((err: { offerId: string; error: string }) => (
                  <p key={err.offerId} className="text-xs text-danger break-all">{err.offerId}: {err.error}</p>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.offPage.indexNow')}</h3>
            <p className="text-sm text-ink-muted">{t('admin.seo.offPage.indexNowDesc')}</p>
            <Button onClick={() => indexNow.mutate()} loading={indexNow.isPending}>{t('admin.seo.offPage.indexNowBtn')}</Button>
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.offPage.keywords')}</h3>
            <p className="text-sm text-ink-muted">{t('admin.seo.offPage.kwDesc')}</p>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              <input value={kwDraft.keyword} onChange={(e) => setKwDraft({ ...kwDraft, keyword: e.target.value })} placeholder="Keyword" className="input" />
              <input value={kwDraft.targetPath} onChange={(e) => setKwDraft({ ...kwDraft, targetPath: e.target.value })} placeholder="Target path e.g. /shop" className="input" />
              <input value={kwDraft.notes} onChange={(e) => setKwDraft({ ...kwDraft, notes: e.target.value })} placeholder="Notes (optional)" className="input" />
              <input value={kwDraft.priority} onChange={(e) => setKwDraft({ ...kwDraft, priority: e.target.value })} placeholder="Priority (0-100)" className="input" type="number" />
            </div>
            <Button onClick={() => createKeyword.mutate()} loading={createKeyword.isPending} disabled={!kwDraft.keyword.trim()}>{t('admin.seo.offPage.kwAddBtn')}</Button>
          </section>

          {kwEditing && (
            <div className="card p-5 grid gap-3 bg-surfaceAlt">
              <p className="text-sm font-semibold">Editing keyword</p>
              <input value={kwEditing.keyword} onChange={(e) => setKwEditing({ ...kwEditing, keyword: e.target.value })} className="input" />
              <input value={kwEditing.targetPath || ''} onChange={(e) => setKwEditing({ ...kwEditing, targetPath: e.target.value })} placeholder="Target path" className="input" />
              <input value={kwEditing.notes || ''} onChange={(e) => setKwEditing({ ...kwEditing, notes: e.target.value })} placeholder="Notes" className="input" />
              <input value={kwEditing.priority} onChange={(e) => setKwEditing({ ...kwEditing, priority: Number(e.target.value) || 0 })} type="number" className="input" />
              <div className="flex gap-2">
                <Button onClick={() => updateKeyword.mutate()} loading={updateKeyword.isPending}>Save</Button>
                <Button variant="ghost" onClick={() => setKwEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {keywords.error && <ErrorBox message={extractErrorMessage(keywords.error)} />}
          {keywords.isLoading ? <p className="text-sm text-ink-muted">Loading keywords...</p> : (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-line font-semibold text-sm">Campaign keywords</div>
              <div className="divide-y divide-line">
                {(keywords.data?.tracked || []).map((kw) => (
                  <div key={kw.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-ink">{kw.keyword}</p>
                      <p className="text-xs text-ink-muted">{kw.targetPath || 'No target path'} · priority {kw.priority}{kw.notes ? ` · ${kw.notes}` : ''}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setKwEditing(kw)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteKeyword.mutate(kw.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
                {!keywords.data?.tracked?.length && <p className="p-4 text-sm text-ink-muted">No tracked keywords yet.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {contentI18n && (
        <div className="space-y-4">
          <PackageStack packages={packagesByCategory['content-i18n'] || []} title={t('admin.seo.content.title')} />

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.content.localesTitle')}</h3>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.content.localesDesc')}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { lang: 'NL', url: '/', label: 'Nederlands (default)', color: 'text-success' },
                { lang: 'EN', url: '/?lang=en', label: 'English', color: 'text-primary' },
                { lang: 'DE', url: '/?lang=de', label: 'Deutsch', color: 'text-primary' },
              ].map(({ lang, url, label, color }) => (
                <div key={lang} className="rounded-md border border-line p-3 text-sm">
                  <p className={`font-bold ${color}`}>{lang} — {label}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    <code>{url}</code>
                  </p>
                  {toolkit.data?.siteUrl && (
                    <a
                      href={`${toolkit.data.siteUrl}${url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline mt-1 block"
                    >
                      Open →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.content.slugTitle')}</h3>
            <p className="text-sm text-ink-muted">{t('admin.seo.content.slugDesc')}</p>
            <div className="flex gap-2">
              <input value={slugInput} onChange={(e) => setSlugInput(e.target.value)} placeholder="Page title" className="input flex-1" />
              <Button onClick={() => slugMutation.mutate()} loading={slugMutation.isPending} disabled={!slugInput.trim()}>{t('admin.seo.content.slugBtn')}</Button>
            </div>
            {slugPreview && <p className="text-sm text-ink">/{slugPreview}</p>}
          </section>

          <section className="card p-5 space-y-3">
            <h3 className="font-bold text-ink">{t('admin.seo.content.readingTitle')}</h3>
            <p className="text-sm text-ink-muted">{t('admin.seo.content.readingDesc')}</p>
            <textarea value={readingInput} onChange={(e) => setReadingInput(e.target.value)} placeholder="Paste article excerpt or body text" rows={4} className="input" />
            <Button onClick={() => readingMutation.mutate()} loading={readingMutation.isPending} disabled={!readingInput.trim()}>{t('admin.seo.content.readingBtn')}</Button>
            {readingPreview && <p className="text-sm text-ink">{readingPreview.text} · {readingPreview.words} words</p>}
            {blogPosts.length > 0 && (
              <div className="pt-2 border-t border-line">
                <p className="text-xs font-semibold text-ink-muted mb-2">Quick-fill from blog posts</p>
                <div className="flex flex-wrap gap-2">
                  {blogPosts.slice(0, 8).map((post) => (
                    <button key={post.id} type="button" onClick={() => setReadingInput(post.excerpt || post.title || '')} className="text-xs bg-surfaceAlt px-2 py-1 rounded hover:bg-primary/10">{post.title}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h4 className="font-semibold text-sm text-ink mb-2">Keywords on pages (from content SEO)</h4>
            <div className="flex flex-wrap gap-2">
              {(keywords.data?.onPage || []).map((kw) => (
                <span key={kw} className="text-xs bg-surfaceAlt px-2 py-1 rounded">{kw}</span>
              ))}
              {!keywords.data?.onPage?.length && <span className="text-sm text-ink-muted">No page keywords yet — add them in On-Page → Content inventory.</span>}
            </div>
          </section>
        </div>
      )}

      {performance && (
        <div className="space-y-4">
          <PackageStack packages={packagesByCategory.performance || []} title={t('admin.seo.perf.title')} />

          {toolkit.data?.technical && (
            <section className="card p-5 space-y-2">
              <h3 className="font-bold text-ink">{t('admin.seo.perf.serverTitle')}</h3>
              <p className="text-sm text-ink-muted">{t('admin.seo.perf.serverDesc')}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="text-success font-semibold">compression: on</span>
                <span className="text-success font-semibold">helmet: on</span>
                <span className={toolkit.data.technical.redis ? 'text-success font-semibold' : 'text-ink-muted'}>redis: {toolkit.data.technical.redis ? 'on' : 'off'}</span>
                <span className="text-ink">sitemap URLs: {toolkit.data.technical.sitemapUrlCount}</span>
              </div>
            </section>
          )}

          <section className="card p-5 space-y-4">
            <h3 className="font-bold text-ink">{t('admin.seo.perf.cwvTitle')} <span className="text-xs font-normal text-ink-muted ml-1">(optional)</span></h3>
            <p className="text-sm text-ink-muted">
              {t('admin.seo.perf.cwvDesc')}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => lighthouseAudit.mutate()} loading={lighthouseAudit.isPending}>{t('admin.seo.perf.runLighthouse')}</Button>
              <Button onClick={() => webpMutation.mutate()} loading={webpMutation.isPending}>{t('admin.seo.perf.autoFix')}</Button>
            </div>
            {(lighthouseResult || lighthouseAudit.data) && (
              <LighthouseFindingsPanel results={(lighthouseResult || lighthouseAudit.data).results || {}} />
            )}
            {lighthouseRuns.length > 0 && (
              <div className="divide-y divide-line">
                {lighthouseRuns.slice(0, 3).map((run: any) => (
                  <div key={run.id} className="py-3">
                    <p className="text-xs text-ink-muted mb-2">{new Date(run.createdAt).toLocaleString()} — {run.targetUrl}</p>
                    <LighthouseScoreCards summary={run.summary || {}} />
                    {run.results?.findings && <div className="mt-2"><LighthouseFindingsPanel results={run.results} /></div>}
                  </div>
                ))}
              </div>
            )}
            {!lighthouseRuns.length && <p className="text-sm text-ink-muted">No Lighthouse runs yet.</p>}
          </section>

          <section className="card overflow-hidden">
            <div className="p-5 border-b border-line space-y-3">
              <h3 className="font-bold text-ink">{t('admin.seo.perf.imageTitle')}</h3>
              <p className="text-sm text-ink-muted">
                {t('admin.seo.perf.imageDesc')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => convertWebp.mutate()} loading={convertWebp.isPending}>
                  {t('admin.seo.perf.convertWebpBtn')}
                </Button>
                <Button variant="secondary" onClick={() => mediaMetadata.refetch()} loading={mediaMetadata.isFetching}>
                  {t('admin.seo.perf.refreshMetaBtn')}
                </Button>
              </div>
            </div>

            <div className="p-5 border-b border-line space-y-3 bg-surfaceAlt/40">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('admin.seo.perf.geoLatitude')}</p>
                  <input value={geoDraft.latitude} onChange={(e) => setGeoDraft((prev) => ({ ...prev, latitude: e.target.value }))} className="input w-36" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('admin.seo.perf.geoLongitude')}</p>
                  <input value={geoDraft.longitude} onChange={(e) => setGeoDraft((prev) => ({ ...prev, longitude: e.target.value }))} className="input w-36" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('admin.seo.perf.geoAltitude')}</p>
                  <input value={geoDraft.altitude} onChange={(e) => setGeoDraft((prev) => ({ ...prev, altitude: e.target.value }))} className="input w-32" placeholder="optional" />
                </div>
                <Button onClick={() => geotagMedia.mutate()} loading={geotagMedia.isPending}>
                  {t('admin.seo.perf.applyGeotagBtn')}
                </Button>
              </div>
              <p className="text-xs text-ink-muted">{t('admin.seo.perf.geoHelp')}</p>
              {perfTasks.length > 0 && (
                <div className="grid gap-3">
                  {perfTasks.map((task) => (
                    <TaskProgress key={task.key} title={task.title} detail={task.detail} percent={task.percent} />
                  ))}
                </div>
              )}
              {mediaMetadata.error && <ErrorBox message={extractErrorMessage(mediaMetadata.error)} />}
              {metadataAudit && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded border border-line bg-white p-3">
                    <p className="text-xs text-ink-muted">{t('admin.seo.perf.metaTotal')}</p>
                    <p className="text-lg font-bold text-ink">{metadataAudit.total}</p>
                  </div>
                  <div className="rounded border border-line bg-white p-3">
                    <p className="text-xs text-ink-muted">{t('admin.seo.perf.metaWithTags')}</p>
                    <p className="text-lg font-bold text-ink">{metadataAudit.withMetadata}</p>
                  </div>
                  <div className="rounded border border-line bg-white p-3">
                    <p className="text-xs text-ink-muted">{t('admin.seo.perf.metaGeotagged')}</p>
                    <p className="text-lg font-bold text-ink">{metadataAudit.geotagged}</p>
                  </div>
                </div>
              )}
              {!mediaMetadata.isLoading && metadataAudit ? (
                <div className="divide-y divide-line rounded-lg border border-line bg-white">
                  {metadataAudit.items.slice(0, 120).map((item) => {
                    const expanded = !!metaExpanded[item.relativePath];
                    return (
                      <div key={item.filePath} className="p-3 space-y-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{item.relativePath}</p>
                            <p className="text-xs text-ink-muted truncate">{item.url}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full px-2 py-1 ${item.geotagged ? 'bg-success/10 text-success' : 'bg-gold/10 text-gold'}`}>
                              {item.geotagged ? t('admin.seo.perf.metaTaggedOk') : t('admin.seo.perf.metaNeedsGeotag')}
                            </span>
                            <span className="rounded-full px-2 py-1 bg-surfaceAlt text-ink-muted">
                              {item.metadataCount} {t('admin.seo.perf.metaTagsFound')}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => setMetaExpanded((prev) => ({ ...prev, [item.relativePath]: !prev[item.relativePath] }))}>
                              {expanded ? t('admin.seo.perf.hideMetaBtn') : t('admin.seo.perf.showMetaBtn')}
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-ink-muted">
                          GPS: {item.gps.latitude ?? '—'}, {item.gps.longitude ?? '—'}{item.gps.altitude != null ? `, alt ${item.gps.altitude}` : ''}
                        </div>
                        {item.error && <p className="text-xs text-danger">{item.error}</p>}
                        {expanded && (
                          <pre className="overflow-auto rounded-md bg-surfaceAlt p-3 text-[11px] text-ink">{JSON.stringify(item.metadata, null, 2)}</pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !perfTasks.length ? (
                <p className="text-sm text-ink-muted">No image job running.</p>
              ) : null}
            </div>
            {media.error && <div className="p-5"><ErrorBox message={extractErrorMessage(media.error)} /></div>}
            {media.isLoading ? <p className="p-5 text-sm text-ink-muted">Loading product image rows and alt text...</p> : (
              <div className="divide-y divide-line">
                {(media.data || []).map((image: any) => {
                  const value = mediaEdits[image.id] ?? image.alt ?? '';
                  return (
                    <div key={image.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink">{image.product.name}</p>
                        <p className="text-xs text-ink-muted truncate">{image.url}</p>
                      </div>
                      <input value={value} onChange={(e) => setMediaEdits((prev) => ({ ...prev, [image.id]: e.target.value }))} placeholder="Alt text" className="input md:max-w-md" />
                      <Button size="sm" onClick={() => saveMediaAlt.mutate({ id: image.id, alt: value })} loading={saveMediaAlt.isPending} disabled={!value.trim()}>Save</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
      {/* Robots.txt Modal */}
      {robotsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface w-full max-w-2xl rounded-xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-bold text-ink mb-4">Edit robots.txt</h2>
            {robotsQuery.isLoading ? (
              <p className="text-ink-muted">Loading...</p>
            ) : (
              <>
                <textarea 
                  className="input flex-1 font-mono text-sm min-h-[300px] mb-4" 
                  value={robotsContent} 
                  onChange={(e) => setRobotsContent(e.target.value)} 
                />
                <div className="flex justify-end gap-3 mt-auto">
                  <Button variant="secondary" onClick={() => setRobotsModalOpen(false)}>Cancel</Button>
                  <Button onClick={() => updateRobotsMutation.mutate()} loading={updateRobotsMutation.isPending}>Save</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
