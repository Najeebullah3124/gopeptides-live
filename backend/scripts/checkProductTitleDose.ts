/**
 * Ensures product SEO titles do not append weight when the name already includes it.
 * Run: npx tsx scripts/checkProductTitleDose.ts
 */
function productDoseSuffix(name: string, weight?: string | null): string {
  const w = weight?.trim();
  if (!w) return '';
  const formatted = w.replace(/\+\s*/g, ' + ').replace(/\s+/g, ' ').trim();
  const compact = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const n = compact(name);
  if (n.includes(compact(formatted)) || n.includes(compact(w))) return '';
  return ` ${formatted}`;
}

function productDefaultTitle(name: string, weight: string | null | undefined, lang: 'en' | 'nl' | 'de'): string {
  const dose = productDoseSuffix(name, weight);
  const label = lang === 'de' ? 'Forschungspeptid' : lang === 'nl' ? 'Onderzoekspeptid' : 'Research Peptide';
  return `${name}${dose} ${label} | GoPeptides`;
}

function collapseDuplicateDose(text: string, weight?: string | null): string {
  const w = weight?.trim();
  if (!w || !text) return text;
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return text.replace(new RegExp(`(${escaped})(?:\\s+\\1)+`, 'gi'), '$1');
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const cases: Array<{ name: string; weight: string; expectIncludesOnce: string; expectNot: string }> = [
  { name: 'Retatrutide 10 mg', weight: '10 mg', expectIncludesOnce: '10 mg', expectNot: '10 mg 10 mg' },
  { name: 'Retatrutide', weight: '10 mg', expectIncludesOnce: 'Retatrutide 10 mg', expectNot: '10 mg 10 mg' },
  { name: 'BPC-157 10mg', weight: '10 mg', expectIncludesOnce: 'BPC-157', expectNot: '10 mg 10 mg' },
  { name: 'Wolverine 5mg + 5mg', weight: '5mg + 5mg', expectIncludesOnce: 'Wolverine', expectNot: '5mg + 5mg 5mg + 5mg' },
];

for (const c of cases) {
  const title = productDefaultTitle(c.name, c.weight, 'nl');
  assert(title.includes(c.expectIncludesOnce), `missing "${c.expectIncludesOnce}" in: ${title}`);
  assert(!title.includes(c.expectNot), `duplicate dose in: ${title}`);
}

assert(
  collapseDuplicateDose('Retatrutide 10 mg 10 mg Onderzoekspeptid | GoPeptides', '10 mg') ===
    'Retatrutide 10 mg Onderzoekspeptid | GoPeptides',
  'collapseDuplicateDose failed',
);

console.log('checkProductTitleDose: ok');
