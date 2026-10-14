/** One /labresults card per substance. Dosage (10mg vs 30mg) is not a different peptide. */

export type LabCardLike = {
  slug: string;
  name: string;
  sku: string;
  batch: string;
  testDate: string | null;
  reportUrl: string | null;
  reportImages: string[];
  tests: unknown[];
};

export function substanceKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function score(card: LabCardLike): number {
  let s = 0;
  if (card.reportImages?.length) s += 100;
  if (card.tests?.length) s += 50;
  if (/GP-\d{6}-\d+/i.test(card.batch || '')) s += 20;
  if (card.testDate && /\d{2}-\d{2}-\d{4}/.test(card.testDate)) s += 10;
  if (card.reportUrl) s += 5;
  return s;
}

export function dedupeLabResultCards<T extends LabCardLike>(
  cards: T[],
): Array<T & { familySlugs: string[] }> {
  const groups = new Map<string, T[]>();
  for (const card of cards) {
    const key = substanceKey(card.name);
    const list = groups.get(key);
    if (list) list.push(card);
    else groups.set(key, [card]);
  }

  const out: Array<T & { familySlugs: string[] }> = [];
  for (const group of groups.values()) {
    const winner = [...group].sort((a, b) => {
      const diff = score(b) - score(a);
      if (diff) return diff;
      return a.slug.localeCompare(b.slug);
    })[0];
    out.push({ ...winner, familySlugs: group.map((g) => g.slug) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
