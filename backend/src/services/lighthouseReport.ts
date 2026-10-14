/** Extract actionable findings from a Lighthouse LHR JSON report. */

export type LighthouseFinding = {
  category: string;
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  status: 'pass' | 'warn' | 'fail' | 'info';
  explanation?: string;
};

export type LighthouseMetrics = {
  lcp?: string;
  cls?: string;
  tbt?: string;
  fcp?: string;
  si?: string;
};

type LhrAudit = {
  id: string;
  title: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  explanation?: string;
};

type Lhr = {
  categories?: Record<string, { auditRefs?: Array<{ id: string }> }>;
  audits?: Record<string, LhrAudit>;
};

function auditStatus(score: number | null | undefined, mode?: string): LighthouseFinding['status'] {
  if (mode === 'informative' || mode === 'manual') return 'info';
  if (score == null) return 'info';
  if (score >= 0.9) return 'pass';
  if (score >= 0.5) return 'warn';
  return 'fail';
}

export function extractLighthouseFindings(lhr: Lhr): { findings: LighthouseFinding[]; metrics: LighthouseMetrics } {
  const audits = lhr.audits || {};
  const findings: LighthouseFinding[] = [];
  const seen = new Set<string>();

  for (const catKey of ['seo', 'performance', 'accessibility', 'best-practices']) {
    const refs = lhr.categories?.[catKey]?.auditRefs || [];
    for (const ref of refs) {
      const audit = audits[ref.id];
      if (!audit || seen.has(audit.id)) continue;
      if (audit.scoreDisplayMode === 'notApplicable') continue;
      seen.add(audit.id);
      findings.push({
        category: catKey,
        id: audit.id,
        title: audit.title,
        description: audit.description || '',
        score: audit.score != null ? Math.round(audit.score * 100) : null,
        displayValue: audit.displayValue,
        status: auditStatus(audit.score, audit.scoreDisplayMode),
        explanation: audit.explanation,
      });
    }
  }

  const pick = (id: string) => audits[id]?.displayValue;
  const metrics: LighthouseMetrics = {
    lcp: pick('largest-contentful-paint'),
    cls: pick('cumulative-layout-shift'),
    tbt: pick('total-blocking-time'),
    fcp: pick('first-contentful-paint'),
    si: pick('speed-index'),
  };

  return { findings, metrics };
}
