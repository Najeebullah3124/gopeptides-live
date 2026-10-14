/**
 * Live-only: set Category.seoData.slugEn / slugDe from known EN↔NL aliases.
 * Never replaces the DB file. Safe to re-run (skips when already set unless FORCE=1).
 *
 * Run on server: npx tsx scripts/seedLocalizedCategorySlugs.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FORCE = process.env.FORCE === '1';

/** Primary (often NL) slug → preferred EN / DE path slugs */
const MAP: Record<string, { slugEn?: string; slugDe?: string }> = {
  'gewichtsbeheer-energie': { slugEn: 'weight-management', slugDe: 'gewichtsmanagement' },
  'gewichtsbeheer-energie-onderzoek': { slugEn: 'weight-management-research', slugDe: 'gewichtsmanagement-forschung' },
  gewichtscontrole: { slugEn: 'weight-management', slugDe: 'gewichtsmanagement' },
  'focus-kalmte': { slugEn: 'cognitive', slugDe: 'kognition' },
  'focus-concentratie-onderzoek': { slugEn: 'focus-concentration-research', slugDe: 'fokus-konzentration-forschung' },
  cognitief: { slugEn: 'cognitive', slugDe: 'kognition' },
  'groei-prestatie': { slugEn: 'hormonal', slugDe: 'hormonal' },
  'groei-prestatie-onderzoek': { slugEn: 'growth-performance-research', slugDe: 'wachstum-leistung-forschung' },
  hormonaal: { slugEn: 'hormonal', slugDe: 'hormonal' },
  'herstel-huidverzorging': { slugEn: 'recovery', slugDe: 'regeneration' },
  'herstel-huid-onderzoek': { slugEn: 'recovery-skin-research', slugDe: 'regeneration-haut-forschung' },
  herstel: { slugEn: 'recovery', slugDe: 'regeneration' },
  'longevity-vitaliteit': { slugEn: 'anti-aging', slugDe: 'anti-aging' },
  'longevity-vitality-onderzoek': { slugEn: 'longevity-vitality-research', slugDe: 'longevity-vitalitaet-forschung' },
  'benodigdheden-extras': { slugEn: 'supplies-extras', slugDe: 'zubehoer' },
  onderzoeksbenodigdheden: { slugEn: 'research-supplies', slugDe: 'forschungsmaterial' },
  'melanotan-pt-141-onderzoek': { slugEn: 'melanotan-pt-141-research', slugDe: 'melanotan-pt-141-forschung' },
};

function parseSeo(raw: string | null): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function main() {
  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true, seoData: true } });
  let updated = 0;
  for (const c of cats) {
    const hint = MAP[c.slug] || {};
    // Prefer explicit EN alias from MAP; else leave empty (fallback = primary)
    const seo = parseSeo(c.seoData);
    const next = { ...seo };
    let changed = false;
    if (hint.slugEn && (FORCE || !seo.slugEn)) {
      next.slugEn = hint.slugEn;
      changed = true;
    }
    if (hint.slugDe && (FORCE || !seo.slugDe)) {
      next.slugDe = hint.slugDe;
      changed = true;
    }
    if (!changed) {
      console.log(`skip ${c.slug}`);
      continue;
    }
    await prisma.category.update({
      where: { id: c.id },
      data: { seoData: JSON.stringify(next) },
    });
    updated += 1;
    console.log(`ok ${c.slug} → en=${next.slugEn || '-'} de=${next.slugDe || '-'}`);
  }
  console.log(`seedLocalizedCategorySlugs: updated=${updated} total=${cats.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
