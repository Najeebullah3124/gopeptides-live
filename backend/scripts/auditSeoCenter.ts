/**
 * SEO Center full audit script.
 * Run: npx tsx backend/scripts/auditSeoCenter.ts
 *
 * Tests every SEO endpoint with real auth, validates library-backed output shapes,
 * and verifies redirects actually fire over HTTP.
 */

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@gopeptides.nl';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || '';

type Result = { label: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string };
const results: Result[] = [];

function pass(label: string, detail = '') { results.push({ label, status: 'PASS', detail }); }
function fail(label: string, detail = '') { results.push({ label, status: 'FAIL', detail }); }
function warn(label: string, detail = '') { results.push({ label, status: 'WARN', detail }); }

async function get(path: string, token: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function post(path: string, token: string, body: unknown = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function del(path: string, token: string) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function run() {
  console.log('\n=== SEO CENTER AUDIT ===\n');

  let token = '';
  try {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
    });
    const body = await r.json();
    token = body?.data?.accessToken || body?.data?.token || '';
    if (!token || r.status !== 200) throw new Error(`Login failed: ${r.status} ${JSON.stringify(body)}`);
    pass('AUTH login', `token obtained (${token.length} chars)`);
  } catch (e) {
    fail('AUTH login', String(e));
    printResults();
    process.exit(1);
  }

  for (const [label, url] of [
    ['PUBLIC sitemap.xml', '/sitemap.xml'],
    ['PUBLIC robots.txt', '/robots.txt'],
  ] as [string, string][]) {
    const r = await fetch(`${BASE}${url}`);
    if (r.status === 200) pass(label, `${r.status}`);
    else fail(label, `HTTP ${r.status}`);
  }

  const indexingRes = await get('/api/admin/seo/indexing', token);
  if (indexingRes.status === 200) {
    const keyFileUrl = indexingRes.body?.data?.indexNowKeyFileUrl as string | undefined;
    if (keyFileUrl) {
      const keyPath = '/' + keyFileUrl.split('/').pop();
      const keyRes = await fetch(`${BASE}${keyPath}`);
      if (keyRes.status === 200) pass('PUBLIC IndexNow key file', `${keyPath}`);
      else fail('PUBLIC IndexNow key file', `HTTP ${keyRes.status} at ${keyPath}`);
    }
    const robots = indexingRes.body?.data?.robotsAnalysis;
    if (robots?.pageChecks?.length) pass('robots-parser analysis', `${robots.pageChecks.length} page checks`);
    else fail('robots-parser analysis', 'missing pageChecks in indexing response');
  }

  for (const [lang, url] of [
    ['NL default', '/'],
    ['EN ?lang=en', '/?lang=en'],
    ['DE ?lang=de', '/?lang=de'],
  ] as [string, string][]) {
    const r = await fetch(`${BASE}${url}`, { headers: { Accept: 'text/html' } });
    const html = await r.text();
    const hasTitle = /<title>/i.test(html);
    const hasCanonical = /rel="canonical"/i.test(html);
    const hasHreflang = /hreflang/i.test(html);
    if (r.status === 200 && hasTitle && hasCanonical) pass(`SSR HTML ${lang}`, `title:${hasTitle} canonical:${hasCanonical} hreflang:${hasHreflang}`);
    else if (r.status === 200) warn(`SSR HTML ${lang}`, `missing SEO tags`);
    else fail(`SSR HTML ${lang}`, `HTTP ${r.status}`);
  }

  const apiChecks: [string, string][] = [
    ['API GET /dashboard', '/api/admin/seo/dashboard'],
    ['API GET /toolkit', '/api/admin/seo/toolkit'],
    ['API GET /content', '/api/admin/seo/content'],
    ['API GET /schema', '/api/admin/seo/schema'],
    ['API GET /indexing', '/api/admin/seo/indexing'],
    ['API GET /media', '/api/admin/seo/media'],
    ['API GET /audits', '/api/admin/seo/audits'],
    ['API GET /redirects', '/api/admin/seo/redirects'],
    ['API GET /keywords', '/api/admin/seo/keywords'],
    ['API GET /search-console', '/api/admin/seo/search-console'],
  ];
  for (const [label, path] of apiChecks) {
    const r = await get(path, token);
    if (r.status === 200) pass(label, r.body?.message || 'ok');
    else fail(label, `HTTP ${r.status}`);
  }

  const slugRes = await post('/api/admin/seo/toolkit/slug', token, { text: 'Test peptide product' });
  if (slugRes.status === 200 && slugRes.body?.data?.slug) pass('API POST /toolkit/slug', `slug="${slugRes.body.data.slug}"`);
  else fail('API POST /toolkit/slug', `HTTP ${slugRes.status}`);

  const rtRes = await post('/api/admin/seo/toolkit/reading-time', token, { text: 'This is a sample blog post. '.repeat(100) });
  if (rtRes.status === 200 && rtRes.body?.data?.text) pass('API POST /toolkit/reading-time', rtRes.body.data.text);
  else fail('API POST /toolkit/reading-time', `HTTP ${rtRes.status}`);

  const analyzeRes = await post('/api/admin/seo/analyze', token, {
    title: 'BPC-157 peptide research guide',
    description: 'Learn about BPC-157 peptide purity, dosing for research, and EU shipping from GoPeptides.',
    text: 'BPC-157 is a research peptide studied for tissue repair. '.repeat(30),
    keyword: 'bpc-157',
    language: 'nl',
  });
  const yoast = analyzeRes.body?.data;
  if (analyzeRes.status === 200 && yoast?.seo?.length && yoast.seo[0]?.text && yoast.seo[0]?.rating) {
    pass('API POST /analyze (Yoast)', `seo:${yoast.seo.length} readability:${yoast.readability?.length} sample:"${yoast.seo[0].text.slice(0, 50)}…"`);
  } else {
    fail('API POST /analyze (Yoast)', `HTTP ${analyzeRes.status} — missing assessment text/rating`);
  }

  const htmlAuditRes = await post('/api/admin/seo/toolkit/html-audit', token, {});
  const checks = htmlAuditRes.body?.data?.checks;
  if (htmlAuditRes.status === 200 && Array.isArray(checks) && checks.length >= 10 && checks[0]?.fix !== undefined) {
    pass('API POST /toolkit/html-audit (Cheerio)', `${checks.length} checks, score=${htmlAuditRes.body.data.score}%`);
  } else {
    fail('API POST /toolkit/html-audit (Cheerio)', `HTTP ${htmlAuditRes.status} — expected checks[] with fix fields`);
  }

  const indexNowRes = await post('/api/admin/seo/indexnow', token, {});
  if (indexNowRes.status === 200) pass('API POST /indexnow (IndexNow)', indexNowRes.body?.data?.note || `submitted ${indexNowRes.body?.data?.submitted}`);
  else fail('API POST /indexnow (IndexNow)', `HTTP ${indexNowRes.status}`);

  // Redirect CRUD + HTTP enforcement
  const testSource = '/seo-audit-test-old';
  const testDest = '/shop';
  const createRedir = await post('/api/admin/seo/redirects', token, { sourcePath: testSource, destination: testDest, statusCode: 301 });
  if (createRedir.status === 201 || createRedir.status === 200) {
    pass('API POST /redirects (create)', `${testSource} → ${testDest}`);
    const redirHttp = await fetch(`${BASE}${testSource}`, { redirect: 'manual' });
    if (redirHttp.status === 301 && redirHttp.headers.get('location')?.includes(testDest)) {
      pass('Redirect middleware (HTTP 301)', `Location: ${redirHttp.headers.get('location')}`);
    } else {
      fail('Redirect middleware (HTTP 301)', `got HTTP ${redirHttp.status}, location=${redirHttp.headers.get('location')}`);
    }
    const list = await get('/api/admin/seo/redirects', token);
    const row = (list.body?.data || []).find((r: { sourcePath: string }) => r.sourcePath === testSource);
    if (row?.id) await del(`/api/admin/seo/redirects/${row.id}`, token);
  } else {
    fail('API POST /redirects (create)', `HTTP ${createRedir.status} — ${createRedir.body?.message}`);
  }

  const kwRes = await post('/api/admin/seo/keywords', token, { keyword: 'seo-audit-kw', targetPath: '/shop', priority: 1 });
  if (kwRes.status === 201 || kwRes.status === 200) {
    pass('API POST /keywords (create)', kwRes.body?.data?.keyword);
    if (kwRes.body?.data?.id) await del(`/api/admin/seo/keywords/${kwRes.body.data.id}`, token);
  } else {
    fail('API POST /keywords (create)', `HTTP ${kwRes.status}`);
  }

  console.log('\n  [Lighthouse — may take ~20s...]');
  const lhRes = await post('/api/admin/seo/audits/lighthouse', token, {});
  if (lhRes.status === 200 || lhRes.status === 201) {
    const findings = lhRes.body?.data?.results?.findings;
    const cats = lhRes.body?.data?.summary || {};
    if (Array.isArray(findings) && findings.length > 5 && findings[0]?.title) {
      pass('API POST /audits/lighthouse', `SEO:${cats.seo ?? '?'} · ${findings.length} audit findings`);
    } else {
      warn('API POST /audits/lighthouse', `ran but findings missing — SEO:${cats.seo}`);
    }
  } else if (lhRes.status === 400 && lhRes.body?.message?.includes('Chrome')) {
    warn('API POST /audits/lighthouse', 'Chrome not available');
  } else {
    fail('API POST /audits/lighthouse', `HTTP ${lhRes.status}`);
  }

  console.log('\n  [Linkinator — quick crawl...]');
  const linkRes = await post('/api/admin/seo/audits/links', token, { targetUrl: `${BASE}/` });
  if (linkRes.status === 201 || linkRes.status === 200) {
    const findings = linkRes.body?.data?.results?.findings;
    const summary = linkRes.body?.data?.summary || {};
    if (Array.isArray(findings) && findings.length > 0) {
      pass('API POST /audits/links (Linkinator)', `scanned:${summary.scanned} broken:${summary.broken} findings:${findings.length}`);
    } else {
      fail('API POST /audits/links (Linkinator)', 'missing findings array');
    }
  } else {
    fail('API POST /audits/links (Linkinator)', `HTTP ${linkRes.status}`);
  }

  printResults();
}

function printResults() {
  const pad = Math.max(...results.map((r) => r.label.length));
  let p = 0, f = 0, w = 0;
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️ ';
    console.log(`${icon} ${r.label.padEnd(pad)} ${r.detail}`);
    if (r.status === 'PASS') p++;
    else if (r.status === 'FAIL') f++;
    else w++;
  }
  console.log(`\n── ${p} passed  ${f} failed  ${w} warnings ──\n`);
  if (f) {
    console.log('FAILED CHECKS:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  ❌ ${r.label}: ${r.detail}`));
    process.exit(1);
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
