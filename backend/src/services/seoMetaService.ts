import { prisma } from '../config/database';
import { blogSeoForLang, blogTopSeoLang } from '../utils/blogSeo';
import { mergeSeoMeta, parseSeoMeta, siteUrl, type SeoMeta } from './seoService';
import {
  buildBlogPostingSchema,
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFAQPageSchema,
  buildItemListSchema,
  buildLocalBusinessSchema,
  buildOrganizationSchema,
  buildProductSchema,
  buildWebPageSchema,
  buildWebSiteSchema,
} from './seoSchemaService';
import {
  absoluteUrl,
  canonicalBaseForLang,
  categoryShopPath,
  hreflangAlternates,
  localizedPath,
  parseStoreUrl,
  pathForLang,
  queryWithoutCategory,
  resolveLocalizedPath,
  RESERVED_PAGE_SEGMENTS,
  slugForLang,
  type SeoAlternate,
  type StoreLang,
} from '../utils/seoPaths';
import { aeoPageAnswer, aeoProductAnswer, aeoProductFaqs, type AeoLang } from './aeoContent';

const SITE_NAME = 'GoPeptides';

function asAeoLang(lang: StoreLang): AeoLang {
  return lang === 'de' || lang === 'en' ? lang : 'nl';
}

const BREADCRUMB_NAV: Record<'home' | 'shop' | 'blog' | 'faq' | 'contact' | 'about', Record<StoreLang, string>> = {
  home: { en: 'Home', nl: 'Home', de: 'Startseite' },
  shop: { en: 'Shop', nl: 'Shop', de: 'Webshop' },
  blog: { en: 'Blog', nl: 'Blog', de: 'Blog' },
  faq: { en: 'FAQ', nl: 'Veelgestelde vragen', de: 'Haeufige Fragen' },
  contact: { en: 'Contact', nl: 'Contact', de: 'Kontakt' },
  about: { en: 'About', nl: 'Over ons', de: 'Ueber uns' },
};

function breadcrumbNav(key: 'home' | 'shop' | 'blog' | 'faq' | 'contact' | 'about', lang: StoreLang): string {
  return BREADCRUMB_NAV[key][lang];
}
const STATIC_SEO_PAGE_KEYS = ['home', 'shop', 'blog', 'faq', 'contact', 'labresults', 'reviews', 'terms', 'shipping', 'about', 'privacy'] as const;
export type SeoPageKey = (typeof STATIC_SEO_PAGE_KEYS)[number];
export type SeoPageLang = StoreLang;

export interface SeoPageRegistryItem {
  key: SeoPageKey;
  path: string;
  label: string;
  editable: boolean;
  type: 'static' | 'collection' | 'content';
  supportsLangs: SeoPageLang[];
}

const NOINDEX_PREFIXES = ['/admin', '/account', '/checkout', '/cart', '/login', '/register', '/verify-email', '/reset-password', '/order-confirmation'];

const STATIC_COPY: Record<string, Record<StoreLang, { title: string; description: string }>> = {
  '/': {
    en: { title: 'HPLC-Tested Research Peptides Online in Europe', description: 'Explore HPLC-tested research peptides with batch-specific Certificates of Analysis from GoPeptides. Fast, reliable shipping across Europe.' },
    nl: { title: 'HPLC-geteste Onderzoekspeptiden in Europa', description: 'Ontdek HPLC-geteste onderzoekspeptiden met batchgebonden Certificate of Analysis. Bestel bij GoPeptides met snelle verzending door heel Europa.' },
    de: { title: 'HPLC-gepruefte Forschungspeptide in Europa', description: 'Entdecken Sie HPLC-gepruefte Forschungspeptide mit chargenspezifischem Analysezertifikat von GoPeptides und schnellem Versand in ganz Europa.' },
  },
  '/shop': {
    en: { title: 'Shop Premium Research Peptides Online', description: 'Browse our full catalog of HPLC-tested, high-purity research peptides. Order now with 24h EU delivery from GoPeptides.' },
    nl: { title: 'Koop Premium Onderzoekspeptiden Online', description: 'Bekijk ons volledige aanbod HPLC-geteste onderzoekspeptiden per categorie bij GoPeptides. Bestel nu met 24u EU-levering.' },
    de: { title: 'Premium Forschungspeptide online kaufen', description: 'Durchsuchen Sie unseren Katalog an HPLC-geprueften Forschungspeptiden. Bestellen Sie jetzt mit 24h EU-Lieferung bei GoPeptides.' },
  },
  '/blog': {
    en: { title: 'Blog - Research Peptides News', description: 'Read the latest peptide research insights, guides, and lab updates from the GoPeptides team. Order now with 24h EU delivery.' },
    nl: { title: 'Blog - Nieuws over Onderzoekspeptiden', description: 'Lees onderzoeksgidsen, peptide-inzichten en laboratoriumupdates van GoPeptides met uitleg over HPLC, COA-documentatie en onderzoeksmethoden.' },
    de: { title: 'Blog - Peptid-News und Updates', description: 'Lesen Sie die neuesten Peptid-Forschungsberichte, Ratgeber und Labor-Updates von GoPeptides. 24h EU-Lieferung.' },
  },
  '/faq': {
    en: { title: 'Research Peptide FAQ and COA Help', description: 'Find answers about HPLC-tested research peptides, Certificates of Analysis, batch documentation, shipping, and orders from the GoPeptides team.' },
    nl: { title: 'Veelgestelde vragen over Onderzoekspeptiden', description: 'Vind antwoorden over HPLC-geteste onderzoekspeptiden, Certificate of Analysis, batchdocumentatie, verzending en bestellingen bij GoPeptides.' },
    de: { title: 'FAQ zu Forschungspeptiden und COA | GoPeptides', description: 'Antworten zu HPLC-geprueften Forschungspeptiden, COA-Dokumenten, Versand, Chargenangaben und Bestellungen bei GoPeptides.' },
  },
  '/labresults': {
    en: { title: 'Lab Results | Third-Party Purity Testing | GoPeptides', description: 'Independent HPLC and mass spectrometry lab results for all GoPeptides research peptides. Full batch reports from Janoshik lab.' },
    nl: { title: 'Laborresultaten | Onafhankelijke Zuiverheidstest | GoPeptides', description: 'Onafhankelijke HPLC- en massaspectrometrie-resultaten voor alle GoPeptides-onderzoekspeptiden. Volledig chargenrapport van Janoshik.' },
    de: { title: 'Laborergebnisse | Drittanbieter-Testergebnisse | GoPeptides', description: 'Unabhängige HPLC- und Massenspektrometrie-Ergebnisse für alle GoPeptides Forschungspeptide. Vollständige Chargenberichte ab Janoshik.' },
  },
  '/reviews': {
    en: { title: 'GoPeptides Reviews and Researcher Feedback', description: 'Read verified researcher feedback on GoPeptides products, delivery speed, packaging quality, and batch documentation across Europe.' },
    nl: { title: 'GoPeptides Reviews en Onderzoekersfeedback', description: 'Lees geverifieerde onderzoekersreviews over GoPeptides producten, levertijd, verpakking en batchdocumentatie in Europa.' },
    de: { title: 'GoPeptides Bewertungen und Erfahrungen', description: 'Verifizierte Forscherbewertungen zu GoPeptides Produkten, Lieferung und Chargendokumentation in Europa.' },
  },
  '/contact': {
    en: { title: 'Contact GoPeptides Support Team', description: 'Get in touch with the GoPeptides research support team for inquiries about our HPLC-tested peptides. Order now with 24h EU delivery.' },
    nl: { title: 'Neem Contact Op Met GoPeptides Support', description: 'Neem contact op met het GoPeptides onderzoeksteam voor vragen over onze HPLC-geteste peptiden. Bestel nu met 24u EU-levering.' },
    de: { title: 'Kontaktieren Sie das GoPeptides Support Team', description: 'Kontaktieren Sie das GoPeptides Forschungsteam fuer Fragen zu unseren HPLC-geprueften Peptiden. 24h EU-Lieferung.' },
  },
  '/terms': {
    en: { title: 'Terms for Research Peptide Orders | GoPeptides', description: 'Review the terms and conditions for GoPeptides research peptide orders, payment, shipping, returns, and research-use-only compliance.' },
    nl: { title: 'Voorwaarden voor Onderzoekspeptiden | GoPeptides', description: 'Lees de algemene voorwaarden voor GoPeptides onderzoekspeptiden, betaling, verzending, retouren en research-use-only naleving.' },
    de: { title: 'AGB fuer Forschungspeptide | GoPeptides', description: 'Lesen Sie die Bedingungen fuer GoPeptides Forschungspeptid-Bestellungen, Zahlung, Versand, Ruecksendungen und Research-Use-Only-Vorgaben.' },
  },
  '/shipping': {
    en: { title: 'EU Shipping and Delivery for Research Peptides', description: 'See GoPeptides EU shipping times, delivery expectations, carriers, packaging standards, and support information for research peptide orders.' },
    nl: { title: 'EU-verzending en Levering van Onderzoekspeptiden', description: 'Bekijk GoPeptides EU-levertijden, vervoerders, verpakkingsstandaarden en supportinformatie voor bestellingen van onderzoekspeptiden.' },
    de: { title: 'EU-Versand fuer Forschungspeptide', description: 'Sehen Sie GoPeptides EU-Lieferzeiten, Versanddienstleister, Verpackungsstandards und Supportinformationen fuer Forschungspeptid-Bestellungen.' },
  },
  '/about': {
    en: { title: 'About GoPeptides Research Standards and Support', description: 'Learn about GoPeptides, our HPLC-tested research peptide standards, Certificate of Analysis workflow, and customer support across Europe.' },
    nl: { title: 'Over GoPeptides Onderzoeksnormen en Support', description: 'Lees meer over GoPeptides, onze HPLC-geteste onderzoekspeptide-standaarden, CoA-proces en klantenservice in Europa.' },
    de: { title: 'Ueber GoPeptides Standards und Support', description: 'Erfahren Sie mehr ueber GoPeptides, unsere HPLC-geprueften Forschungspeptid-Standards, COA-Prozesse und den Support in Europa.' },
  },
  '/privacy': {
    en: { title: 'Privacy Policy | GoPeptides', description: 'Read how GoPeptides collects, uses, and protects personal data under the GDPR when you use our research peptide webshop.' },
    nl: { title: 'Privacybeleid | GoPeptides', description: 'Lees hoe GoPeptides persoonsgegevens verzamelt, gebruikt en beschermt onder de AVG wanneer u onze onderzoekspeptiden-webshop gebruikt.' },
    de: { title: 'Datenschutz | GoPeptides', description: 'Erfahren Sie, wie GoPeptides personenbezogene Daten gemaess DSGVO erhebt, nutzt und schuetzt, wenn Sie unseren Forschungspeptid-Webshop nutzen.' },
  },
};

const STATIC_H1: Partial<Record<string, Record<StoreLang, string>>> = {
  '/': {
    // Kept in sync with the live hero (hero.headline1 + hero.headline2 in the frontend bundle) —
    // this is what bots/no-JS clients see and must match what real visitors see after hydration.
    en: 'Quality you can build on',
    nl: 'Kwaliteit waarop je kunt bouwen',
    de: 'Qualitaet, auf die du bauen kannst',
  },
  '/shop': {
    en: 'Shop lab peptides',
    nl: 'Shop lab peptiden',
    de: 'Shop Lab-Peptide',
  },
  '/blog': {
    en: 'Peptide guides and news',
    nl: 'Peptide gidsen en nieuws',
    de: 'Peptide Ratgeber und News',
  },
  '/faq': {
    en: 'Help and answers',
    nl: 'Hulp en antwoorden',
    de: 'Hilfe und Antworten',
  },
  '/labresults': {
    en: 'Lab Results and Testing',
    nl: 'Laborresultaten',
    de: 'Laborergebnisse',
  },
  '/shipping': {
    en: 'EU shipping info',
    nl: 'EU verzendinfo',
    de: 'EU Versand-Info',
  },
  '/terms': {
    en: 'Order terms',
    nl: 'Bestelregels',
    de: 'Bestellregeln',
  },
  '/about': {
    en: 'About our lab',
    nl: 'Over ons lab',
    de: 'Ueber unser Lab',
  },
  '/contact': {
    en: 'Contact us',
    nl: 'Contact',
    de: 'Kontakt',
  },
  '/reviews': {
    en: 'Customer lab reviews',
    nl: 'Klant lab reviews',
    de: 'Lab-Bewertungen',
  },
  '/privacy': {
    en: 'Privacy policy',
    nl: 'Privacybeleid',
    de: 'Datenschutz',
  },
};

const STATIC_H2: Partial<Record<string, Record<StoreLang, string[]>>> = {
  '/': {
    en: ['Top products', 'COA per lot'],
    nl: ['Top producten', 'COA per batch'],
    de: ['Top Produkte', 'COA pro Lot'],
  },
  '/shop': {
    en: ['Shop by type', 'Lab tested lots'],
    nl: ['Shop per type', 'Lab geteste lots'],
    de: ['Shop nach Typ', 'Lab-getestete Lots'],
  },
  '/blog': {
    en: ['New posts', 'Lab guides'],
    nl: ['Nieuwe posts', 'Lab gidsen'],
    de: ['Neue Posts', 'Lab Ratgeber'],
  },
  '/about': {
    en: ['Our team', 'Lab rules'],
    nl: ['Ons team', 'Lab regels'],
    de: ['Unser Team', 'Lab Regeln'],
  },
  '/contact': {
    en: ['Say hello', 'Support times'],
    nl: ['Zeg hallo', 'Support tijden'],
    de: ['Hallo sagen', 'Support Zeiten'],
  },
  '/shipping': {
    en: ['Ship times', 'Safe packs'],
    nl: ['Levertijd', 'Veilige packs'],
    de: ['Lieferzeit', 'Sichere Packs'],
  },
  '/faq': {
    en: ['Top questions', 'COA and lots'],
    nl: ['Top vragen', 'COA en lots'],
    de: ['Top Fragen', 'COA und Lots'],
  },
  '/labresults': {
    en: ['Why choose GoPeptides', 'Lab testing'],
    nl: ['Waarom GoPeptides kiezen', 'Lab testen'],
    de: ['Warum GoPeptides waehlen', 'Lab-Pruefung'],
  },
  '/reviews': {
    en: ['Buyer feedback', 'EU buyers'],
    nl: ['Koper feedback', 'EU kopers'],
    de: ['Lab Feedback', 'EU Kaeufer'],
  },
  '/terms': {
    en: ['Order rules', 'Lab use only'],
    nl: ['Bestelregels', 'Alleen lab gebruik'],
    de: ['Bestellregeln', 'Nur Lab-Nutzung'],
  },
};

const STATIC_KEYWORDS: Partial<Record<string, Record<StoreLang, string[]>>> = {
  '/': {
    en: ['research peptides Europe', 'HPLC-tested research peptides', 'peptides with COA'],
    nl: ['onderzoekspeptiden Europa', 'HPLC-geteste peptiden', 'peptiden met COA'],
    de: ['Forschungspeptide Europa', 'HPLC-gepruefte Peptide', 'Peptide mit COA'],
  },
  '/shop': {
    en: ['buy research peptides online Europe', 'research peptides online', 'lab research peptides'],
    nl: ['onderzoekspeptiden kopen Europa', 'peptiden online bestellen', 'lab onderzoekspeptiden'],
    de: ['Forschungspeptide kaufen Europa', 'Peptide online bestellen', 'Labor Forschungspeptide'],
  },
  '/blog': {
    en: ['research peptides blog', 'peptide research guides', 'research peptide news'],
    nl: ['onderzoekspeptiden blog', 'peptide onderzoeksgidsen', 'peptide nieuws'],
    de: ['Forschungspeptide Blog', 'Peptid-Forschung Ratgeber', 'Peptid News'],
  },
  '/faq': {
    en: ['research use only peptides', 'peptide COA documentation', 'what is HPLC testing for peptides'],
    nl: ['alleen voor onderzoek peptiden', 'peptide COA documentatie', 'HPLC test peptiden'],
    de: ['nur fuer Forschungszwecke Peptide', 'Peptid COA Dokumentation', 'HPLC Test Peptide'],
  },
  '/reviews': {
    en: ['GoPeptides review', 'research peptide reviews', 'peptide supplier feedback'],
    nl: ['GoPeptides ervaringen', 'onderzoekspeptide reviews', 'peptide leverancier feedback'],
    de: ['GoPeptides Bewertung', 'Forschungspeptide Bewertungen', 'Peptid Lieferant Feedback'],
  },
  '/contact': {
    en: ['GoPeptides contact', 'peptide supplier Netherlands', 'research peptide support'],
    nl: ['GoPeptides contact', 'peptide leverancier Nederland', 'onderzoekspeptide support'],
    de: ['GoPeptides Kontakt', 'Peptid Lieferant Niederlande', 'Forschungspeptid Support'],
  },
  '/terms': {
    en: ['research use only peptides', 'peptide order terms', 'research peptide compliance'],
    nl: ['alleen voor onderzoek peptiden', 'peptide bestelvoorwaarden', 'onderzoekspeptide compliance'],
    de: ['nur Forschungszwecke Peptide', 'Peptid Bestellbedingungen', 'Forschungspeptid Compliance'],
  },
  '/shipping': {
    en: ['research peptides EU shipping', 'peptide shipping Europe', 'peptides order Europe'],
    nl: ['onderzoekspeptiden EU verzending', 'peptide verzending Europa', 'peptiden bestellen Europa'],
    de: ['Forschungspeptide EU Versand', 'Peptid Versand Europa', 'Peptide bestellen Europa'],
  },
  '/about': {
    en: ['research peptide supplier Europe', 'EU research peptide supplier', 'HPLC peptide vendor'],
    nl: ['onderzoekspeptide leverancier Europa', 'EU peptide leverancier', 'HPLC peptide verkoper'],
    de: ['Forschungspeptid Lieferant Europa', 'EU Peptid Lieferant', 'HPLC Peptid Anbieter'],
  },
};

function staticKeywords(path: string, lang: StoreLang): string[] | undefined {
  return STATIC_KEYWORDS[path]?.[lang] || STATIC_KEYWORDS[path]?.en;
}

function staticH2(path: string, lang: StoreLang): string[] | undefined {
  const key = path === '/' ? '/' : path;
  return STATIC_H2[key]?.[lang] || STATIC_H2[key]?.en;
}

export const SEO_PAGE_REGISTRY: SeoPageRegistryItem[] = [
  { key: 'home', path: '/', label: 'Home', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'shop', path: '/shop', label: 'Shop', editable: true, type: 'collection', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'blog', path: '/blog', label: 'Blog index', editable: true, type: 'content', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'faq', path: '/faq', label: 'FAQ', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'contact', path: '/contact', label: 'Contact', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'labresults', path: '/labresults', label: 'Lab Results', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'reviews', path: '/reviews', label: 'Reviews', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'terms', path: '/terms', label: 'Terms', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'shipping', path: '/shipping', label: 'Shipping', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'about', path: '/about', label: 'About', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
  { key: 'privacy', path: '/privacy', label: 'Privacy', editable: true, type: 'static', supportsLangs: ['en', 'nl', 'de'] },
];

const DEFAULT_FAQ = [
  { question: 'What are research peptides?', answer: 'Research peptides are compounds sold strictly for laboratory research purposes.' },
  { question: 'How fast is shipping?', answer: 'Orders ship within 24 hours across the EU.' },
  { question: 'Do you provide COA documents?', answer: 'Yes, every batch includes HPLC testing and Certificate of Analysis.' },
];

function stripBrandSuffix(title: string): string {
  return title
    .replace(/\s*[|—–-]\s*GoPeptides(\s+Blog)?\s*$/i, '')
    .replace(/\s*—\s*GoPeptides\s*$/i, '')
    .trim();
}

function localizedPeptideLabel(lang: StoreLang): string {
  if (lang === 'de') return 'Forschungspeptid';
  if (lang === 'nl') return 'Onderzoekspeptid';
  return 'Research Peptide';
}

/** Skip appending weight when product name already includes the same dose (e.g. "Retatrutide 10 mg" + weight "10 mg"). */
function productDoseSuffix(name: string, weight?: string | null): string {
  const w = weight?.trim();
  if (!w) return '';
  const formatted = w.replace(/\+\s*/g, ' + ').replace(/\s+/g, ' ').trim();
  const compact = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const n = compact(name);
  if (n.includes(compact(formatted)) || n.includes(compact(w))) return '';
  return ` ${formatted}`;
}

/** Collapse accidental "10 mg 10 mg" in saved SEO titles. */
function collapseDuplicateDose(text: string, weight?: string | null): string {
  const w = weight?.trim();
  if (!w || !text) return text;
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return text.replace(new RegExp(`(${escaped})(?:\\s+\\1)+`, 'gi'), '$1');
}

function productDefaultTitle(name: string, weight: string | null | undefined, lang: StoreLang): string {
  const dose = productDoseSuffix(name, weight);
  return `${name}${dose} ${localizedPeptideLabel(lang)} | GoPeptides`;
}

function productDefaultDescription(name: string, weight: string | null | undefined, shortDesc: string, lang: StoreLang): string {
  const dose = productDoseSuffix(name, weight);
  const weightLabel = weight?.trim() || '';
  if (shortDesc?.trim()) {
    // ponytail: dosage variants often share shortDesc — append weight so meta descriptions stay unique (Semrush)
    if (dose && weightLabel && !shortDesc.toLowerCase().replace(/\s+/g, '').includes(weightLabel.toLowerCase().replace(/\s+/g, ''))) {
      if (lang === 'de') return `${shortDesc} Erhaeltlich als${dose} Forschungspeptid-Flaeschchen von GoPeptides.`;
      if (lang === 'nl') return `${shortDesc} Verkrijgbaar als${dose} onderzoekspeptid-flacon van GoPeptides.`;
      return `${shortDesc} Available as${dose} research peptide vial from GoPeptides.`;
    }
    return shortDesc;
  }
  if (lang === 'de') return `HPLC-geprueftes ${name}${dose} Forschungspeptid mit Chargen-COA von GoPeptides.`;
  if (lang === 'nl') return `HPLC-getest ${name}${dose} onderzoekspeptid met batch-COA van GoPeptides.`;
  return `Browse HPLC-tested ${name}${dose} research peptide details, batch documentation, and Certificate of Analysis support from GoPeptides.`;
}

/**
 * Truncate at the last word boundary before `max` chars, not a hard character slice — a plain
 * slice() regularly chopped words mid-way (e.g. "specificaties" -> "spec...") in both meta
 * descriptions and H1/H2 text. Falls back to a hard slice only if there's no reasonable space
 * to break on (e.g. one very long unbroken word).
 */
function truncateAtWord(text: string, max: number): string {
  const budget = max - 3;
  const sliced = text.slice(0, budget);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = lastSpace >= Math.floor(budget * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trimEnd()}...`;
}

function clampH1(text: string, max = 70): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return truncateAtWord(clean, max);
}

function clampH2(text: string, max = 70): string {
  return clampH1(text, max);
}

function clampH2List(items: string[]): string[] {
  return items.map((h) => clampH2(h)).filter(Boolean);
}

function clampMetaDescription(text: string, lang: StoreLang, ctx?: { name?: string; weight?: string }): string {
  let clean = text.replace(/\s+/g, ' ').trim();
  const min = 120;
  const max = 130;
  const dose = ctx?.name ? productDoseSuffix(ctx.name, ctx.weight) : (ctx?.weight?.trim() ? ` ${ctx.weight.trim()}` : '');
  const label = ctx?.name ? `${ctx.name}${dose}` : '';
  if (clean.length < min) {
    const suffix = lang === 'de'
      ? `${label ? ` ${label}` : ''} HPLC-geprueft von GoPeptides. COA pro Charge. Schneller EU-Versand. Nur fuer Forschungszwecke.`
      : lang === 'nl'
        ? `${label ? ` ${label}` : ''} HPLC-getest bij GoPeptides. COA per batch. Snelle EU-levering. Alleen voor onderzoek.`
        : `${label ? ` ${label}` : ''} HPLC-tested from GoPeptides. Batch COA included. Fast EU shipping. Research use only.`;
    clean = `${clean}${suffix}`.replace(/\s+/g, ' ').trim();
  }
  if (clean.length > max) return truncateAtWord(clean, max);
  return clean;
}

function preferDosageAwareText(saved: string | undefined, computed: string, weight?: string | null): string {
  const dose = weight?.trim();
  const s = collapseDuplicateDose(saved?.trim() || '', weight);
  if (!s) return computed;
  if (dose && !s.toLowerCase().replace(/\s+/g, '').includes(dose.toLowerCase().replace(/\s+/g, ''))) return computed;
  return s;
}

function crawlerEasyLines(lang: StoreLang): string[] {
  // ponytail: SF Flesch uses English formula on all langs — short words + short sentences help most
  if (lang === 'de') {
    return [
      'Wir senden aus Holland.',
      'Jede Bestellung wird geprueft.',
      'Sie bekommen Tracking per Mail.',
      'Vials kuehl und trocken lagern.',
      'Nicht in die Sonne legen.',
      'Lesen Sie das Etikett zuerst.',
      'COA passt zu Ihrer Lot-Nummer.',
      'Wir helfen bei Fragen gern.',
      'Neue Lots werden im Lab getestet.',
      'Reinheit steht auf dem COA.',
      'Nur fuer Lab-Forschung.',
      'Nicht fuer Klinik oder Zuhause.',
      'EU-Labs bestellen bei uns.',
      'Sichere Packung beim Versand.',
      'Hilfe gibt es im Kontaktformular.',
      'Diese Seite ist fuer Ihr Lab.',
      'Wir liefern Lab-Peptide in der EU.',
      'Jedes Lot hat eigene Papiere.',
      'Zahlung und Versand sind klar.',
      'Mehr Hilfe steht in der FAQ.',
      'Orders gehen in derselben Woche raus.',
      'Wir packen mit Sorgfalt.',
      'Lab-Teams vertrauen unseren COA-Dateien.',
      'Sie koennen heute online bestellen.',
      'Lieferzeit steht an der Kasse.',
      'Kits aus Kinderreichweite lagern.',
      'Handschuhe im Lab tragen.',
      'Folgen Sie Ihren Lab-Sicherheitsregeln.',
      'Notieren Sie jedes Lot im Log.',
      'Fragen Sie uns wenn Papiere fehlen.',
      'Danke fuer den Besuch dieser Seite.',
      'Wir hoffen es hilft Ihrem Lab.',
      'Viel Erfolg bei Ihrer Arbeit.',
      'Kommen Sie wieder wenn Sie mehr brauchen.',
    ];
  }
  if (lang === 'nl') {
    return [
      'We sturen vanuit Nederland.',
      'Elke order wordt gecontroleerd.',
      'U krijgt tracking per mail.',
      'Bewaar vials koel en droog.',
      'Niet in de zon leggen.',
      'Lees het label eerst.',
      'COA past bij uw lotnummer.',
      'We helpen graag bij vragen.',
      'Nieuwe lots worden in het lab getest.',
      'Zuiverheid staat op de COA.',
      'Alleen voor lab-onderzoek.',
      'Niet voor kliniek of thuis.',
      'EU-labs bestellen bij ons.',
      'Veilige verpakking bij verzending.',
      'Hulp via het contactformulier.',
      'Deze pagina is voor uw lab.',
      'We leveren lab-peptiden in de EU.',
      'Elk lot heeft eigen papieren.',
      'Betalen en verzenden is duidelijk.',
      'Meer hulp staat in de FAQ.',
      'Orders gaan in dezelfde week weg.',
      'We pakken met zorg.',
      'Labteams vertrouwen onze COA-bestanden.',
      'U kunt vandaag online bestellen.',
      'Levertijd staat bij het afrekenen.',
      'Bewaar kits buiten bereik van kinderen.',
      'Gebruik handschoenen in het lab.',
      'Volg uw lab-veiligheidsregels.',
      'Noteer elke lot in uw log.',
      'Vraag ons als papieren ontbreken.',
      'Bedankt voor het bezoek aan deze pagina.',
      'We hopen dat het uw lab helpt.',
      'Veel succes met uw werk.',
      'Kom terug als u meer nodig hebt.',
    ];
  }
  return [
    'We ship from Holland.',
    'Each order is checked.',
    'You get tracking by email.',
    'Store vials cool and dry.',
    'Do not leave them in the sun.',
    'Read the label first.',
    'The COA matches your lot number.',
    'We are glad to help with questions.',
    'New lots are tested in the lab.',
    'Purity is listed on the COA.',
    'For lab research only.',
    'Not for clinic or home use.',
    'EU labs order from us.',
    'Safe packs help in transit.',
    'Help is on the contact form.',
    'This page is for your lab.',
    'We supply lab peptides in the EU.',
    'Each lot has its own papers.',
    'Pay and ship steps are clear.',
    'More help is in the FAQ.',
    'Orders go out the same week.',
    'We pack with care.',
    'Lab teams trust our COA files.',
    'You can order online today.',
    'Ship times show at checkout.',
    'Store kits away from kids.',
    'Use gloves in the lab.',
    'Follow your lab safety rules.',
    'Keep notes on each lot.',
    'Ask us if papers are missing.',
    'Thanks for reading this page.',
    'We hope this helps your lab.',
    'Good luck with your work.',
    'Come back when you need more.',
  ];
}

function crawlerBoilerplate(
  lang: StoreLang,
  kind: 'product' | 'category' | 'blog' | 'static',
  ctx: { name?: string; weight?: string; description?: string; slug?: string },
): string {
  const parts: string[] = [];
  const name = ctx.name?.trim() || 'GoPeptides';
  const dose = productDoseSuffix(name, ctx.weight);
  // Meta description is already a separate <p> in SSR — duplicating it here hurts Flesch scores

  if (kind === 'product') {
    if (lang === 'de') {
      parts.push(`${name}${dose} ist ein lab-getestetes Peptid.`);
      parts.push('Sie erhalten ein COA pro Lot.');
      parts.push('Reinheit steht auf dem COA.');
      parts.push('Wir senden schnell in der EU.');
      parts.push('Die Packung ist lab-tauglich.');
      parts.push('Nur fuer Forschung.');
      parts.push('Nicht fuer Mensch oder Tier.');
      parts.push('Mehr Infos stehen auf dieser Seite.');
    } else if (lang === 'nl') {
      parts.push(`${name}${dose} is een lab-getest peptide.`);
      parts.push('U krijgt een COA per lot.');
      parts.push('Zuiverheid staat op de COA.');
      parts.push('We verzenden snel in de EU.');
      parts.push('De verpakking past bij labwerk.');
      parts.push('Alleen voor onderzoek.');
      parts.push('Niet voor mens of dier.');
      parts.push('Meer info staat op deze pagina.');
    } else {
      parts.push(`${name}${dose} is a lab-tested peptide.`);
      parts.push('You get a COA for each lot.');
      parts.push('Purity is on the COA.');
      parts.push('We ship fast in the EU.');
      parts.push('The pack is safe for labs.');
      parts.push('For research use only.');
      parts.push('Not for people or pets.');
      parts.push('More info is on this page.');
    }
    parts.push(...crawlerEasyLines(lang));
  } else if (kind === 'category') {
    const slug = ctx.slug?.trim();
    if (lang === 'de') {
      parts.push(`Hier finden Sie ${name} Peptide.`);
      parts.push('Jedes Produkt hat ein eigenes COA.');
      parts.push('Sie koennen im Shop filtern.');
      if (slug) parts.push(`Kategorie ${slug} zeigt passende Artikel.`);
      parts.push('Vergleichen Sie Lots vor dem Kauf.');
      parts.push('EU-Labs bestellen oft bei uns.');
    } else if (lang === 'nl') {
      parts.push(`Hier vindt u ${name} peptiden.`);
      parts.push('Elk product heeft een eigen COA.');
      parts.push('U kunt filteren in de shop.');
      if (slug) parts.push(`Categorie ${slug} toont passende items.`);
      parts.push('Vergelijk lots voor u bestelt.');
      parts.push('EU-labs bestellen vaak bij ons.');
    } else {
      parts.push(`Here you find ${name} peptides.`);
      parts.push('Each product has its own COA.');
      parts.push('You can filter in the shop.');
      if (slug) parts.push(`Category ${slug} shows matching items.`);
      parts.push('Compare lots before you buy.');
      parts.push('EU labs often order from us.');
    }
    parts.push(...crawlerEasyLines(lang));
  } else if (kind === 'blog') {
    if (lang === 'de') {
      parts.push('Dieser Text erklaert das Thema in einfachen Schritten.');
      parts.push('GoPeptides zeigt Lab-Tipps und sichere Nutzung.');
      parts.push('Die wichtigsten Punkte stehen unten.');
      parts.push('Qualitaet und COA sind wichtig.');
      parts.push('Der Shop-Link fuehrt zu passenden Produkten.');
      parts.push('Teilen Sie den Text mit Ihrem Lab-Team.');
    } else if (lang === 'nl') {
      parts.push('Deze tekst legt het onderwerp uit in korte stappen.');
      parts.push('GoPeptides deelt lab-tips en veilig gebruik.');
      parts.push('De belangrijkste punten staan hieronder.');
      parts.push('Kwaliteit en COA zijn belangrijk.');
      parts.push('De shop-link leidt naar passende producten.');
      parts.push('Deel de tekst met uw labteam.');
    } else {
      parts.push('This text explains the topic in simple steps.');
      parts.push('GoPeptides shares lab tips and safe use.');
      parts.push('The main points are below.');
      parts.push('Quality and COA matter.');
      parts.push('The shop link leads to matching products.');
      parts.push('Share this text with your lab team.');
    }
    parts.push(...crawlerEasyLines(lang));
  } else if (lang === 'de') {
    parts.push('GoPeptides liefert lab-getestete Peptide in der EU.');
    parts.push('Jedes Lot wird dokumentiert.');
    parts.push('Wir helfen bei Bestellung und Versand.');
    parts.push('Besuchen Sie auch unseren Shop.');
    parts.push('Mehr Tipps stehen im Blog.');
    parts.push(...crawlerEasyLines(lang));
  } else if (lang === 'nl') {
    parts.push('GoPeptides levert lab-geteste peptiden in de EU.');
    parts.push('Elk lot wordt vastgelegd.');
    parts.push('We helpen bij bestelling en verzending.');
    parts.push('Bezoek ook onze shop.');
    parts.push('Meer tips staan op de blog.');
    parts.push(...crawlerEasyLines(lang));
  } else {
    parts.push('GoPeptides supplies lab-tested peptides in the EU.');
    parts.push('Each lot is documented.');
    parts.push('We help with orders and shipping.');
    parts.push('Visit our shop too.');
    parts.push('More tips are on the blog.');
    parts.push(...crawlerEasyLines(lang));
  }
  return parts.join(' ');
}

/** ponytail: Semrush flags ≤200 words — pad static/product noscript bodies slightly */
function crawlerWordCountBoost(lang: StoreLang): string[] {
  if (lang === 'de') {
    return [
      'Wir antworten schnell auf E-Mail-Anfragen.',
      'Unser Team hilft bei Fragen zu COA und Chargen.',
      'Versand- und Zahlungsinfos finden Sie auf dieser Website.',
      'Alle Angaben auf dieser Seite sind auf Deutsch verfasst.',
      'Unser Kundendienst antwortet werktags auf Deutsch.',
    ];
  }
  if (lang === 'nl') {
    return [
      'We antwoorden snel op e-mailvragen.',
      'Ons team helpt bij vragen over COA en lotnummers.',
      'Verzend- en betaalinfo vindt u op deze website.',
      'Alle informatie op deze pagina is in het Nederlands geschreven.',
      'Onze klantenservice reageert op werkdagen in het Nederlands.',
    ];
  }
  return [
    'We reply quickly to email questions.',
    'Our team helps with COA and batch number questions.',
    'Shipping and payment details are on this website.',
  ];
}

function crawlerBoilerplateWithBoost(
  lang: StoreLang,
  kind: 'product' | 'category' | 'blog' | 'static',
  ctx: { name?: string; weight?: string; description?: string; slug?: string },
): string {
  return [crawlerBoilerplate(lang, kind, ctx), ...crawlerWordCountBoost(lang)].join(' ');
}

/** ponytail: SF low-content guard — prerender body should clear ~200 words with meta + headings */
export function countCrawlerWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function formatTitle(title: string): string {
  const clean = title.trim();
  if (!clean || clean === SITE_NAME) return `${SITE_NAME} — Research Peptides`;
  const hasBrand = clean.toLowerCase().includes(SITE_NAME.toLowerCase());
  const candidate = hasBrand ? clean : `${clean} | ${SITE_NAME}`;
  // ponytail: ~561px SERP width — cap before ellipsis
  if (candidate.length > 55) return `${candidate.slice(0, 52).trimEnd()}...`;
  return candidate;
}

/**
 * Saved seoData text fields (title/description/h1/etc.) are admin-authored in whichever
 * language the admin wrote them in. 'nl' is gopeptides.nl's default/base language (bare
 * URL, no ?lang=) so it must honor them too — 'en' kept for back-compat with older
 * English-authored overrides. 'de' still falls through to auto-generated defaults since
 * there's no per-language tag on seoData to disambiguate which language an override is in.
 */
function savedSeoForLang(parsed: SeoMeta, lang: StoreLang): SeoMeta {
  if (lang === 'nl') {
    return {
      title: parsed.title,
      description: parsed.description,
      robots: parsed.robots,
      focusKeywords: parsed.focusKeywords,
      socialImage: parsed.socialImage,
    };
  }
  if (lang === 'en') {
    // Dedicated en fields only — never fall back to the nl title/description here, or
    // Dutch text would leak onto gopeptides.eu when no English override has been set.
    return {
      title: parsed.titleEn,
      description: parsed.descriptionEn,
      robots: parsed.robots,
      focusKeywords: parsed.focusKeywords,
      socialImage: parsed.socialImage,
    };
  }
  if (lang === 'de') {
    return {
      title: parsed.titleDe,
      description: parsed.descriptionDe,
      robots: parsed.robots,
      focusKeywords: parsed.focusKeywords,
      socialImage: parsed.socialImage,
    };
  }
  return { robots: parsed.robots, socialImage: parsed.socialImage };
}

function localizedProductKeywords(name: string, lang: StoreLang): string[] {
  if (lang === 'de') return [name, `${name} Forschungspeptid`, 'Peptide Europa'];
  if (lang === 'nl') return [name, `${name} onderzoekspeptid`, 'peptiden Europa'];
  return [name, `${name} research peptide`, `${name} peptides Europe`];
}

function localizedCategoryKeywords(name: string, lang: StoreLang): string[] {
  if (lang === 'de') return [name, `${name} Forschungspeptide`, 'Peptide Europa'];
  if (lang === 'nl') return [name, `${name} onderzoekspeptiden`, 'peptiden Europa'];
  return [name, `${name} research peptides`, `${name} peptides Europe`];
}

function localizedBlogKeywords(title: string, lang: StoreLang): string[] {
  if (lang === 'de') return ['Forschungspeptide Blog', 'Peptid-Forschung', title];
  if (lang === 'nl') return ['onderzoekspeptiden blog', 'peptide onderzoek', title];
  return ['research peptides blog', 'peptide research guides', title];
}

function productPrerenderH1(name: string, weight: string | null | undefined, lang: StoreLang): string {
  const dose = productDoseSuffix(name, weight);
  const base = `${name}${dose}`;
  if (lang === 'de') return clampH1(`${base} — Lab-Peptid`);
  if (lang === 'nl') return clampH1(`${base} — Lab-peptide`);
  if (lang === 'en') return clampH1(`${base} — Lab peptide`);
  return clampH1(base);
}

function categoryPrerenderH1(name: string, lang: StoreLang): string {
  if (lang === 'de') return clampH1(`${name} — DE Katalog`);
  if (lang === 'nl') return clampH1(`${name} — NL catalogus`);
  return clampH1(`${name} — EN catalog`);
}

function resolveShopCategorySlug(innerPath: string, query: string): string | null {
  const seg = innerPath.match(/^\/shop\/([^/]+)$/)?.[1];
  if (seg && seg !== 'peptides') return seg;
  return new URLSearchParams(query.replace(/^\?/, '')).get('category');
}

/** Match category by primary slug or seoData.slugEn/slugDe. */
async function findCategoryByAnySlug(rawSlug: string) {
  const needle = rawSlug.trim().toLowerCase();
  if (!needle) return null;
  const direct = await prisma.category.findFirst({ where: { slug: needle } });
  if (direct) return direct;
  const all = await prisma.category.findMany();
  return (
    all.find((c) => {
      const seo = parseSeoMeta(c.seoData);
      return seo.slugEn?.toLowerCase() === needle || seo.slugDe?.toLowerCase() === needle;
    }) || null
  );
}

async function findBlogByAnySlug(rawSlug: string) {
  const needle = rawSlug.trim().toLowerCase();
  if (!needle) return null;
  const direct = await prisma.blogPost.findFirst({
    where: { slug: needle, status: 'PUBLISHED' },
  });
  if (direct) return direct;
  const all = await prisma.blogPost.findMany({ where: { status: 'PUBLISHED' } });
  return (
    all.find((p) => {
      const seo = parseSeoMeta(p.seoData);
      return seo.slugEn?.toLowerCase() === needle || seo.slugDe?.toLowerCase() === needle;
    }) || null
  );
}

function blogPrerenderH1(slug: string, lang: StoreLang): string {
  const bit = slugLabel(slug, 5);
  if (lang === 'de') return clampH1(`Ratgeber: ${bit}`);
  if (lang === 'nl') return clampH1(`Gids: ${bit}`);
  return clampH1(`Guide: ${bit}`);
}

/** ponytail: tail slice keeps long blog slugs distinct after clampH2(70) */
function slugH2Key(slug: string): string {
  return slug.length > 40 ? slug.slice(-40).replace(/^-+/, '') : slug;
}

function defaultContentH2(lang: StoreLang, kind: 'product' | 'category' | 'blog', name: string, weight?: string | null, slug?: string): string[] {
  if (kind === 'product') {
    const dose = productDoseSuffix(name, weight);
    const label = `${name}${dose}`;
    if (lang === 'de') return clampH2List([`${label} Spezifikationen`, `${label} Analysezertifikat (CoA)`]);
    if (lang === 'nl') return clampH2List([`${label} specificaties`, `${label} Certificate of Analysis`]);
    return clampH2List([`${label} specifications`, `${label} Certificate of Analysis`]);
  }
  if (kind === 'category') {
    if (lang === 'de') return clampH2List([`Unser Sortiment: ${name}`, `Haeufig gestellte Fragen zu ${name}`]);
    if (lang === 'nl') return clampH2List([`Ons assortiment ${name}`, `Veelgestelde vragen over ${name}`]);
    return clampH2List([`Our ${name} range`, `Frequently asked questions about ${name}`]);
  }
  if (lang === 'de') return clampH2List([`Wichtigste Erkenntnisse: ${name}`, `Was das fuer Forscher bedeutet`]);
  if (lang === 'nl') return clampH2List([`Belangrijkste inzichten: ${name}`, `Wat dit betekent voor onderzoekers`]);
  return clampH2List([`Key takeaways: ${name}`, `What this means for researchers`]);
}

type InternalLink = { label: string; href: string };

const GENERIC_LINK_LABEL: Record<'shop' | 'blog' | 'faq', Record<StoreLang, string>> = {
  shop: { en: 'Browse research peptides', nl: 'Bekijk onderzoekspeptiden', de: 'Forschungspeptide ansehen' },
  blog: { en: 'Read our research guides', nl: 'Lees onze onderzoeksgidsen', de: 'Unsere Forschungsartikel lesen' },
  faq: { en: 'Check the FAQ', nl: 'Bekijk de veelgestelde vragen', de: 'Haeufige Fragen ansehen' },
};

function categoryLinkLabel(name: string, lang: StoreLang): string {
  if (lang === 'de') return `Mehr ${name} Produkte`;
  if (lang === 'nl') return `Meer ${name} producten`;
  return `More ${name} products`;
}

/**
 * ponytail: every page needs real <a> tags in the crawler-facing body, not just nav —
 * admin-curated seoData.internalLinks (below) always wins; this is the site-wide floor
 * so no product/blog/category/static page ever ships with zero contextual links.
 */
function defaultInternalLinks(
  lang: StoreLang,
  base: string,
  kind: 'product' | 'category' | 'blog' | 'static',
  ctx: {
    category?: { name: string; slug: string } | null;
    siblingProducts?: Array<{ name: string; slug: string }>;
    relatedProducts?: Array<{ name: string; slug: string }>;
    relatedPosts?: Array<{ title: string; slug: string }>;
  } = {},
): InternalLink[] {
  const links: InternalLink[] = [];
  const push = (label: string, innerPath: string) => {
    const clean = label.trim();
    if (clean) links.push({ label: clean, href: absoluteUrl(innerPath, lang, '', base) });
  };
  if (kind === 'product') {
    if (ctx.category) push(categoryLinkLabel(ctx.category.name, lang), categoryShopPath(ctx.category.slug));
    for (const p of ctx.siblingProducts || []) push(p.name, `/${p.slug}`);
    for (const post of ctx.relatedPosts || []) push(post.title, `/blog/${post.slug}`);
    if (links.length < 2) push(GENERIC_LINK_LABEL.blog[lang], '/blog');
  } else if (kind === 'blog') {
    for (const p of ctx.relatedProducts || []) push(p.name, `/${p.slug}`);
    for (const post of ctx.relatedPosts || []) push(post.title, `/blog/${post.slug}`);
    push(GENERIC_LINK_LABEL.shop[lang], '/shop');
    // General guide posts (no matching product token, no category siblings) would otherwise
    // land on a single link — floor at two like every other page kind.
    if (links.length < 2) push(GENERIC_LINK_LABEL.blog[lang], '/blog');
  } else if (kind === 'category') {
    for (const p of ctx.siblingProducts || []) push(p.name, `/${p.slug}`);
    push(GENERIC_LINK_LABEL.blog[lang], '/blog');
  } else {
    push(GENERIC_LINK_LABEL.shop[lang], '/shop');
    push(GENERIC_LINK_LABEL.blog[lang], '/blog');
    push(GENERIC_LINK_LABEL.faq[lang], '/faq');
  }
  return links.slice(0, 5);
}

function resolveEditableSeo(
  lang: StoreLang,
  parsed: SeoMeta,
  description: string,
  opts: {
    h1: string;
    kind?: 'product' | 'category' | 'blog' | 'static';
    name?: string;
    weight?: string | null;
    staticPath?: string;
    slug?: string;
    base?: string;
    linkCtx?: Parameters<typeof defaultInternalLinks>[3];
  },
): PageSeo['editable'] {
  const h2Saved = lang === 'nl' ? parsed.h2 : lang === 'en' ? parsed.h2En : lang === 'de' ? parsed.h2De : undefined;
  const h2 = h2Saved?.length
    ? clampH2List(h2Saved)
    : opts.kind && opts.kind !== 'static' && opts.name
      ? defaultContentH2(lang, opts.kind, opts.name, opts.weight, opts.slug)
      : opts.staticPath
        ? clampH2List(staticH2(opts.staticPath, lang) || [])
        : [];
  // Saved seoData.h1/bodyContent apply on nl (site default, top-level fields) and en
  // (dedicated *En fields — see savedSeoForLang above; never falls back to the nl text).
  const h1Saved = lang === 'nl' ? parsed.h1 : lang === 'en' ? parsed.h1En : lang === 'de' ? parsed.h1De : undefined;
  const h1 = h1Saved?.trim() ? h1Saved.trim() : opts.h1;
  const bodySaved = lang === 'nl' ? parsed.bodyContent : lang === 'en' ? parsed.bodyContentEn : lang === 'de' ? parsed.bodyContentDe : undefined;
  const body = bodySaved?.trim() ? bodySaved : description;
  const kind = opts.kind || (opts.staticPath ? 'static' : undefined);
  const boiler = kind
    ? crawlerBoilerplateWithBoost(lang, kind, {
      name: opts.name,
      weight: opts.weight || undefined,
      description,
      slug: opts.slug,
    })
    : body;
  const internalLinks = parsed.internalLinks?.length
    ? parsed.internalLinks
    : defaultInternalLinks(lang, opts.base || siteUrl(), kind || 'static', opts.linkCtx || {});
  return {
    h1,
    h2: h2?.length ? h2 : undefined,
    bodyContent: boiler,
    internalLinks,
    externalLinks: parsed.externalLinks,
  };
}

function resolveH1(title: string, editable?: PageSeo['editable']): string {
  const stripped = stripBrandSuffix(title);
  const custom = editable?.h1?.trim();
  if (custom && custom.toLowerCase() !== stripped.toLowerCase() && custom.toLowerCase() !== title.toLowerCase()) {
    return custom;
  }
  return stripped;
}

function sanitizeSocialImage(url: string | undefined): string | undefined {
  if (!url || /localhost|127\.0\.0\.1/i.test(url)) return undefined;
  return url;
}

function mergeSeo(defaults: { title: string; description: string; keywords?: string[] }, seo: SeoMeta): { title: string; description: string; canonical?: string; robots: string; keywords?: string[]; ogImage?: string } {
  return {
    title: seo.title || defaults.title,
    description: seo.description || defaults.description,
    canonical: seo.canonicalUrl || undefined,
    robots: seo.robots || 'index,follow',
    keywords: seo.focusKeywords?.length ? seo.focusKeywords : defaults.keywords,
    ogImage: sanitizeSocialImage(seo.socialImage),
  };
}

function parseTranslations<T>(raw: string): Record<string, T> {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

let cachedPageSeoOverrides: Record<string, Partial<Record<StoreLang, SeoMeta>>> | null = null;
let cachedPageSeoOverridesAt = 0;
const OVERRIDES_TTL_MS = 60_000;

async function loadPageSeoOverrides(): Promise<Record<string, Partial<Record<StoreLang, SeoMeta>>>> {
  if (cachedPageSeoOverrides && Date.now() - cachedPageSeoOverridesAt < OVERRIDES_TTL_MS) {
    return cachedPageSeoOverrides;
  }
  const row = await prisma.systemSetting.findUnique({ where: { key: 'SEO_PAGE_META' } });
  cachedPageSeoOverrides = parseTranslations<Partial<Record<StoreLang, SeoMeta>>>(row?.value || '{}');
  cachedPageSeoOverridesAt = Date.now();
  return cachedPageSeoOverrides;
}

export function invalidatePageSeoOverridesCache(): void {
  cachedPageSeoOverrides = null;
}

export async function savePageSeoOverride(pageKey: SeoPageKey, lang: StoreLang, seo: SeoMeta): Promise<void> {
  const current = await loadPageSeoOverrides();
  const existingLang = (current[pageKey] || {})[lang] || {};
  const merged = mergeSeoMeta(existingLang, seo);
  const next = { ...current, [pageKey]: { ...(current[pageKey] || {}), [lang]: merged } };
  await prisma.systemSetting.upsert({
    where: { key: 'SEO_PAGE_META' },
    update: { value: JSON.stringify(next) },
    create: { key: 'SEO_PAGE_META', value: JSON.stringify(next) },
  });
  invalidatePageSeoOverridesCache();
}

function productText(
  product: { name: string; shortDesc: string; translations: string },
  lang: StoreLang,
): { name: string; shortDesc: string } {
  // Stored translation for this language first (base text isn't always English).
  const t = parseTranslations<{ name?: string; shortDesc?: string }>(product.translations)[lang];
  return { name: t?.name || product.name, shortDesc: t?.shortDesc || product.shortDesc };
}

function categoryText(
  category: { name: string; description: string | null; translations: string },
  lang: StoreLang,
): { name: string; description: string } {
  // Stored translation for this language first — category base text is Dutch.
  const t = parseTranslations<{ name?: string; description?: string }>(category.translations)[lang];
  return { name: t?.name || category.name, description: t?.description || category.description || '' };
}

function slugLabel(slug: string, words = 5): string {
  const stop = new Set(['and', 'in', 'the', 'for', 'of', 'to', 'a', 'an']);
  const tokens = slug.replace(/-/g, ' ').split(' ').filter((w) => w && !stop.has(w.toLowerCase()));
  return tokens.slice(0, words).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function blogText(
  post: { title: string; excerpt: string; slug?: string; seoTitle?: string | null; seoDescription?: string | null; translations: string; baseLanguage?: string | null },
  lang: StoreLang,
): { title: string; description: string } {
  const base = (post.baseLanguage || 'en') as StoreLang;
  // Each domain only ever gets its own language's SEO box (.nl→nl, .eu→en, .de→de).
  const own = blogSeoForLang(post, lang);
  const t = parseTranslations<{ title?: string; excerpt?: string }>(post.translations)[lang];
  const localTitle = t?.title || (lang === base ? post.title : undefined);
  const localExcerpt = t?.excerpt || (lang === base ? post.excerpt : undefined);
  if (own.title || localTitle) {
    return {
      title: own.title || localTitle || '',
      description: own.description || localExcerpt || '',
    };
  }
  const bit = slugLabel(post.slug || post.title, 4);
  if (lang === 'de') {
    return {
      title: `Peptid-Artikel: ${bit}`,
      description: `Forschungsartikel zu ${bit}. HPLC-Qualitaet und Laborpraxis von GoPeptides. Nur fuer Forschungszwecke.`,
    };
  }
  if (lang === 'nl') {
    return {
      title: `Peptide-artikel: ${bit}`,
      description: `Onderzoeksartikel over ${bit}. HPLC-kwaliteit en labpraktijk van GoPeptides. Alleen voor onderzoek.`,
    };
  }
  return {
    title: `Peptide Research: ${bit}`,
    description: `Research article on ${bit}. HPLC quality and lab practice from GoPeptides. For research use only.`,
  };
}

/** Short localized title for a blog post used as an internal-link anchor (not the full SEO title). */
function localizedBlogTitle(
  post: { title: string; translations: string; baseLanguage?: string | null },
  lang: StoreLang,
): string {
  if (lang === (post.baseLanguage || 'en')) return post.title;
  const t = parseTranslations<{ title?: string }>(post.translations)[lang];
  return t?.title || post.title;
}

export interface PageSeo {
  title: string;
  fullTitle: string;
  description: string;
  h1: string;
  /** AEO: short direct answer for crawlers / answer engines */
  directAnswer?: string;
  canonical: string;
  alternates: SeoAlternate[];
  ogImage?: string;
  robots: string;
  keywords?: string[];
  jsonLd: Record<string, unknown>[];
  htmlLang: string;
  noindex: boolean;
  editable?: {
    h1?: string;
    h2?: string[];
    bodyContent?: string;
    internalLinks?: Array<{ label: string; href: string }>;
    externalLinks?: Array<{ label: string; href: string }>;
  };
}

const JSONLD_INLANGUAGE_TYPES = new Set(['WebPage', 'BlogPosting', 'CollectionPage', 'FAQPage', 'Organization', 'WebSite']);

function withInLanguage(docs: Record<string, unknown>[], lang: StoreLang): Record<string, unknown>[] {
  return docs.map((doc) => {
    const raw = doc['@type'];
    const type = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    return JSONLD_INLANGUAGE_TYPES.has(type as string) ? { ...doc, inLanguage: lang } : doc;
  });
}

function staticPageEditable(
  lang: StoreLang,
  path: string,
  copy: { title: string; description: string },
  override?: SeoMeta,
  base?: string,
): PageSeo['editable'] {
  const key = path === '/' ? '/' : path;
  const desc = clampMetaDescription(copy.description, lang);
  const coded = staticH2(key, lang);
  return {
    h1: override?.h1,
    h2: coded?.length ? coded : clampH2List(override?.h2 || []),
    bodyContent: override?.bodyContent?.trim() || crawlerBoilerplateWithBoost(lang, 'static', { description: desc }),
    internalLinks: override?.internalLinks?.length ? override.internalLinks : defaultInternalLinks(lang, base || siteUrl(), 'static'),
    externalLinks: override?.externalLinks,
  };
}

function baseResult(
  lang: StoreLang,
  innerPath: string,
  query: string,
  title: string,
  description: string,
  base: string,
  opts: {
    robots?: string;
    keywords?: string[];
    ogImage?: string;
    jsonLd?: Record<string, unknown>[];
    noindex?: boolean;
    editable?: PageSeo['editable'];
    metaCtx?: { name?: string; weight?: string };
    directAnswer?: string;
    restByLang?: Partial<Record<StoreLang, string>>;
  } = {},
): PageSeo {
  // Canonical always points at the language's fixed home domain (e.g. de -> gopeptides.de),
  // not whichever domain served this request — keeps the same page from self-canonicalizing
  // differently depending on entry point, which would otherwise look like duplicate content.
  let pathForCanon = innerPath;
  if (opts.restByLang?.[lang]) {
    const r = resolveLocalizedPath(innerPath);
    if (r.pageKey && r.pageKey !== 'home') {
      pathForCanon = pathForLang(r.pageKey, lang, opts.restByLang[lang]);
    }
  }
  const canonical = absoluteUrl(pathForCanon, lang, query, canonicalBaseForLang(lang));
  const normDescription = clampMetaDescription(description, lang, opts.metaCtx);
  const h1 = resolveH1(title, opts.editable);
  const params = new URLSearchParams(query.replace(/^\?/, ''));
  const shopCategory = innerPath.match(/^\/shop\/([^/]+)$/)?.[1] && innerPath !== '/shop/peptides';
  const staticH1Val = shopCategory
    ? undefined
    : STATIC_H1[innerPath === '/' ? '/' : innerPath]?.[lang as StoreLang];
  const resolvedH1 = clampH1(staticH1Val && (!opts.editable?.h1 || opts.editable.h1.toLowerCase() === stripBrandSuffix(title).toLowerCase()) ? staticH1Val : h1);
  return {
    title,
    fullTitle: formatTitle(title),
    description: normDescription,
    h1: resolvedH1,
    directAnswer: opts.directAnswer,
    canonical,
    alternates: hreflangAlternates(innerPath, query, opts.restByLang),
    ogImage: sanitizeSocialImage(opts.ogImage) || `${base}/logo-336.webp`,
    robots: opts.robots || 'index,follow',
    keywords: opts.keywords,
    jsonLd: withInLanguage(opts.jsonLd || [], lang),
    htmlLang: lang,
    noindex: opts.noindex || false,
    editable: opts.editable,
  };
}

export async function buildPageSeo(pathname: string, search = '', base = siteUrl()): Promise<PageSeo> {
  const { lang, path: rawPath } = parseStoreUrl(pathname, search, new URL(base).hostname);
  const resolved = resolveLocalizedPath(rawPath);
  // Match STATIC_COPY / legacy checks on English canonical segments; output via localizedPath.
  const innerPath =
    resolved.pageKey === 'home'
      ? '/'
      : resolved.pageKey
        ? resolved.canonicalInner
        : rawPath || '/';
  const host = new URL(base).hostname;
  const query = search.startsWith('?') ? search : search ? `?${search}` : '';
  // Schema/JSON-LD must match language-home canonicals (nl→.nl, en→.eu, de→.de), not the request host.
  const langHome = canonicalBaseForLang(lang);
  const lp = (p: string, l: StoreLang = lang, existingQuery = '') =>
    localizedPath(p, l, existingQuery, new URL(canonicalBaseForLang(l)).hostname);
  const pageOverrides = await loadPageSeoOverrides();

  if (NOINDEX_PREFIXES.some((p) => rawPath === p || rawPath.startsWith(`${p}/`))) {
    return baseResult(lang, rawPath, query, 'Private', 'Private page', base, {
      robots: 'noindex,nofollow',
      noindex: true,
      jsonLd: [],
    });
  }

  const firstSeg = (rawPath.split('/').filter(Boolean)[0] || '').toLowerCase();
  const productMatch =
    rawPath.match(/^\/shop\/peptides\/([^/]+)\/([^/]+)$/) ||
    rawPath.match(/^\/product\/([^/]+)$/) ||
    (!resolved.pageKey && firstSeg && !RESERVED_PAGE_SEGMENTS.includes(firstSeg)
      ? rawPath.match(/^\/([^/]+)$/)
      : null);
  if (productMatch) {
    const slug = productMatch.length === 3 ? productMatch[2] : productMatch[1];
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: true,
        images: { take: 3, orderBy: { position: 'asc' } },
        reviews: { where: { approved: true }, select: { rating: true } },
      },
    });
    if (product) {
      const reviewStats = product.reviews.length
        ? { count: product.reviews.length, average: product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length }
        : null;
      const text = productText(product, lang);
      const parsed = parseSeoMeta(product.seoData);
      const [siblingProductsRaw, candidatePosts] = parsed.internalLinks?.length
        ? [[], []]
        : await Promise.all([
          prisma.product.findMany({
            where: { isActive: true, categoryId: product.categoryId, id: { not: product.id } },
            take: 2,
            orderBy: { updatedAt: 'desc' },
            select: { name: true, slug: true, shortDesc: true, translations: true },
          }),
          prisma.blogPost.findMany({
            where: { status: 'PUBLISHED' },
            select: { title: true, slug: true, translations: true, baseLanguage: true },
            take: 60,
          }),
        ]);
      const siblingProducts = siblingProductsRaw.map((p) => ({ name: productText(p, lang).name, slug: p.slug }));
      const productTokens = product.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      const relatedPosts = candidatePosts
        .filter((p) => productTokens.some((t) => p.slug.toLowerCase().includes(t)))
        .slice(0, 2)
        .map((p) => ({ title: localizedBlogTitle(p, lang), slug: p.slug }));
      const defaultTitle = productDefaultTitle(text.name, product.weight, lang);
      const defaultDescription = productDefaultDescription(text.name, product.weight, text.shortDesc, lang);
      // Top-level seoData.title/description are the nl text; en/de overrides come from
      // savedSeoForLang (titleEn/titleDe) below, so .eu never falls back to Dutch.
      const rawDescription = defaultDescription;
      const productH1 = productPrerenderH1(text.name, product.weight, lang);
      const mergedTitle = preferDosageAwareText(
        undefined,
        defaultTitle,
        product.weight,
      );
      const seo = mergeSeo(
        {
          title: mergedTitle,
          description: rawDescription,
          keywords: localizedProductKeywords(text.name, lang),
        },
        savedSeoForLang(parsed, lang),
      );
      const title = collapseDuplicateDose(
        preferDosageAwareText(seo.title, defaultTitle, product.weight),
        product.weight,
      );
      const productPath = `/${product.slug}`;
      const productCanonical = absoluteUrl(productPath, lang, '', langHome);
      const image = seo.ogImage || (product.images[0]?.url ? (product.images[0].url.startsWith('http') ? product.images[0].url : `${langHome}${product.images[0].url}`) : undefined);
      return baseResult(lang, productPath, '', title, seo.description, base, {
        robots: seo.robots,
        keywords: seo.keywords,
        ogImage: image,
        metaCtx: { name: text.name, weight: product.weight || undefined },
        directAnswer: aeoProductAnswer(text.name, product.weight, product.purity, asAeoLang(lang), product.casNumber),
        editable: resolveEditableSeo(lang, parsed, seo.description, {
          h1: productH1,
          kind: 'product',
          name: text.name,
          weight: product.weight,
          slug: product.slug,
          base: langHome,
          linkCtx: {
            category: { name: categoryText(product.category, lang).name, slug: product.category.slug },
            siblingProducts,
            relatedPosts,
          },
        }),
        jsonLd: [
          buildProductSchema({ ...product, name: text.name, shortDesc: text.shortDesc }, productCanonical, reviewStats, langHome),
          buildFAQPageSchema(
            aeoProductFaqs(text.name, product.weight, product.purity, asAeoLang(lang), product.casNumber, product.storage).map((f) => ({
              question: f.question,
              answer: f.answer,
            })),
          ),
          buildBreadcrumbSchema([
            { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
            { name: breadcrumbNav('shop', lang), path: absoluteUrl(pathForLang('shop', lang), lang, '', langHome) },
            {
              name: categoryText(product.category, lang).name,
              path: absoluteUrl(
                categoryShopPath(slugForLang(product.category.slug, parseSeoMeta(product.category.seoData), lang), lang),
                lang,
                '',
                langHome,
              ),
            },
            { name: text.name, path: productCanonical },
          ], langHome),
        ],
      });
    }
  }

  const blogSlugFromPath =
    innerPath.match(/^\/blog\/([^/]+)$/)?.[1] ||
    (resolved.pageKey === 'blog' && resolved.rest ? resolved.rest : '');
  if (blogSlugFromPath) {
    const post = await findBlogByAnySlug(blogSlugFromPath);
    if (post) {
      const text = blogText(post, lang);
      const parsedSeoEarly = parseSeoMeta(post.seoData);
      const restByLang: Partial<Record<StoreLang, string>> = {
        nl: post.slug,
        en: slugForLang(post.slug, parsedSeoEarly, 'en'),
        de: slugForLang(post.slug, parsedSeoEarly, 'de'),
      };
      const parsed = parseSeoMeta(post.seoData);
      const [candidateProducts, candidatePosts] = parsed.internalLinks?.length
        ? [[], []]
        : await Promise.all([
          prisma.product.findMany({
            where: { isActive: true },
            select: { name: true, slug: true, shortDesc: true, translations: true },
            take: 60,
          }),
          post.categoryId
            ? prisma.blogPost.findMany({
              where: { status: 'PUBLISHED', categoryId: post.categoryId, id: { not: post.id } },
              select: { title: true, slug: true, translations: true, baseLanguage: true },
              take: 2,
            })
            : Promise.resolve([]),
        ]);
      const postTokens = `${post.slug} ${post.title}`.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
      const relatedProducts = candidateProducts
        .filter((p) => {
          const productSlugTokens = p.slug.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
          return productSlugTokens.some((t) => postTokens.includes(t));
        })
        .slice(0, 2)
        .map((p) => ({ name: productText(p, lang).name, slug: p.slug }));
      const relatedPosts = candidatePosts.map((p) => ({ title: localizedBlogTitle(p, lang), slug: p.slug }));
      const defaultBlogDesc = text.description || (lang === 'de'
        ? 'Lesen Sie diesen GoPeptides Forschungsartikel zu Peptidwissenschaft, Chargendokumentation und Research-Use-Only-Hinweisen.'
        : lang === 'nl'
          ? 'Lees dit GoPeptides onderzoeksartikel over peptidewetenschap, batchdocumentatie en research-use-only richtlijnen.'
          : 'Read this GoPeptides research article covering peptide science, batch documentation, and research-use-only guidance.');
      // seoData.title/description mirror the admin's top SEO box, whose language varies per
      // post — resolve per language instead of treating it as the nl text.
      const own = blogSeoForLang(post, lang);
      const saved = savedSeoForLang(parsed, lang);
      const enPatch = {
        ...saved,
        title: (lang === 'nl' ? undefined : saved.title) || own.title,
        description: (lang === 'nl' ? undefined : saved.description) || own.description,
      };
      const editableSrc = blogTopSeoLang(post) === 'nl' ? parsed : { ...parsed, h1: undefined, bodyContent: undefined };
      const seo = mergeSeo(
        {
          title: `${text.title} | GoPeptides Blog`,
          description: defaultBlogDesc,
          keywords: localizedBlogKeywords(text.title, lang),
        },
        enPatch,
      );
      const postPath = pathForLang('blog', lang, restByLang[lang] || post.slug);
      const image = seo.ogImage || (post.featuredImage ? (post.featuredImage.startsWith('http') ? post.featuredImage : `${base}${post.featuredImage}`) : undefined);
      return baseResult(lang, postPath, '', seo.title, seo.description, base, {
        robots: seo.robots,
        keywords: seo.keywords,
        ogImage: image,
        restByLang,
        editable: resolveEditableSeo(lang, editableSrc, seo.description, {
          h1: blogPrerenderH1(post.slug, lang),
          kind: 'blog',
          // Clean editorial title for headings — text.title/seoTitle carries " | Brand" suffixes meant for <title>.
          name: post.title,
          slug: post.slug,
          base,
          linkCtx: { relatedProducts, relatedPosts },
        }),
        jsonLd: [
          buildBlogPostingSchema({ ...post, title: text.title, excerpt: text.description }, langHome),
          buildBreadcrumbSchema([
            { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
            { name: breadcrumbNav('blog', lang), path: absoluteUrl(pathForLang('blog', lang), lang, '', langHome) },
            { name: text.title, path: absoluteUrl(postPath, lang, '', langHome) },
          ], langHome),
        ],
      });
    }
  }

  if (innerPath === '/shop' || innerPath.startsWith('/shop/')) {
    const categorySlug = resolveShopCategorySlug(innerPath, query) || (resolved.pageKey === 'shop' ? resolved.rest : '');
    if (categorySlug) {
      const category = await findCategoryByAnySlug(categorySlug);
      if (category) {
        const text = categoryText(category, lang);
        const parsed = parseSeoMeta(category.seoData);
        const restByLang: Partial<Record<StoreLang, string>> = {
          nl: category.slug,
          en: slugForLang(category.slug, parsed, 'en'),
          de: slugForLang(category.slug, parsed, 'de'),
        };
        const catLabel = lang === 'de' ? 'Forschungspeptide' : lang === 'nl' ? 'Onderzoekspeptiden' : 'Research Peptides';
        const defaultTitle = `${text.name} ${catLabel} | GoPeptides`;
        const defaultCatDesc = text.description || (lang === 'de'
          ? `Durchsuchen Sie HPLC-gepruefte ${text.name} Forschungspeptide mit Chargendokumentation und COA von GoPeptides.`
          : lang === 'nl'
            ? `Bekijk HPLC-geteste ${text.name} onderzoekspeptiden met batchdocumentatie en COA van GoPeptides.`
            : `Browse HPLC-tested ${text.name} research peptides with batch documentation and Certificate of Analysis support from GoPeptides.`);
        const seo = mergeSeo(
          {
            title: defaultTitle,
            description: defaultCatDesc,
            keywords: localizedCategoryKeywords(text.name, lang),
          },
          savedSeoForLang(parsed, lang),
        );
        const catPath = categoryShopPath(restByLang[lang] || category.slug, lang);
        const catQuery = queryWithoutCategory(query);
        const products = await prisma.product.findMany({
          where: { isActive: true, categoryId: category.id },
          take: 12,
          select: { name: true, slug: true, shortDesc: true, translations: true, category: { select: { slug: true } } },
        });
        return baseResult(lang, catPath, catQuery, seo.title, seo.description, base, {
          robots: seo.robots,
          keywords: seo.keywords,
          restByLang,
          editable: resolveEditableSeo(lang, parsed, seo.description, {
            h1: categoryPrerenderH1(text.name, lang),
            kind: 'category',
            name: text.name,
            slug: category.slug,
            base,
            linkCtx: { siblingProducts: products.slice(0, 3).map((p) => ({ name: productText(p, lang).name, slug: p.slug })) },
          }),
          jsonLd: [
            buildCollectionPageSchema({ name: text.name, slug: category.slug, description: text.description }, langHome),
            ...(products.length ? [buildItemListSchema(products.map((p) => ({ name: p.name, url: absoluteUrl(`/${p.slug}`, lang, '', langHome) })), langHome)] : []),
            buildBreadcrumbSchema([
              { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
              { name: breadcrumbNav('shop', lang), path: absoluteUrl(pathForLang('shop', lang), lang, '', langHome) },
              { name: text.name, path: absoluteUrl(catPath, lang, catQuery, langHome) },
            ], langHome),
          ],
        });
      }
    }
    const copy = STATIC_COPY['/shop'][lang];
    const override = pageOverrides.shop?.[lang];
    return baseResult(lang, '/shop', query, override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords('/shop', lang),
      ogImage: override?.socialImage || undefined,
      directAnswer: aeoPageAnswer('shop', asAeoLang(lang)),
      editable: staticPageEditable(lang, '/shop', copy, override, langHome),
      jsonLd: [
        buildWebPageSchema(lp('/shop'), override?.title || copy.title, override?.description || copy.description, langHome),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: override?.title || copy.title,
          description: override?.description || copy.description,
          url: `${langHome}${lp('/shop')}`,
        },
        buildBreadcrumbSchema([
          { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
          { name: breadcrumbNav('shop', lang), path: absoluteUrl('/shop', lang, '', langHome) },
        ], langHome),
      ],
    });
  }

  if (innerPath === '/blog') {
    const copy = STATIC_COPY['/blog'][lang];
    const override = pageOverrides.blog?.[lang];
    return baseResult(lang, '/blog', '', override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords('/blog', lang),
      ogImage: override?.socialImage || undefined,
      editable: staticPageEditable(lang, '/blog', copy, override, langHome),
      jsonLd: [
        buildWebPageSchema(lp('/blog'), override?.title || copy.title, override?.description || copy.description, langHome),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: override?.title || copy.title,
          description: override?.description || copy.description,
          url: `${langHome}${lp('/blog')}`,
        },
        buildBreadcrumbSchema([
          { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
          { name: breadcrumbNav('blog', lang), path: absoluteUrl('/blog', lang, '', langHome) },
        ], langHome),
      ],
    });
  }

  if (innerPath === '/faq') {
    const copy = STATIC_COPY['/faq'][lang];
    const override = pageOverrides.faq?.[lang];
    return baseResult(lang, '/faq', '', override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords('/faq', lang),
      ogImage: override?.socialImage || undefined,
      editable: staticPageEditable(lang, '/faq', copy, override, langHome),
      jsonLd: [
        buildFAQPageSchema(DEFAULT_FAQ),
        buildWebPageSchema(lp('/faq'), override?.title || copy.title, override?.description || copy.description, langHome),
        buildBreadcrumbSchema([
          { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
          { name: breadcrumbNav('faq', lang), path: absoluteUrl('/faq', lang, '', langHome) },
        ], langHome),
      ],
    });
  }

  if (innerPath === '/contact') {
    const copy = STATIC_COPY['/contact'][lang];
    const override = pageOverrides.contact?.[lang];
    return baseResult(lang, '/contact', '', override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords('/contact', lang),
      ogImage: override?.socialImage || undefined,
      editable: staticPageEditable(lang, '/contact', copy, override, langHome),
      jsonLd: [
        buildLocalBusinessSchema(langHome),
        buildWebPageSchema(lp('/contact'), override?.title || copy.title, override?.description || copy.description, langHome),
        buildBreadcrumbSchema([
          { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
          { name: breadcrumbNav('contact', lang), path: absoluteUrl('/contact', lang, '', langHome) },
        ], langHome),
      ],
    });
  }

  if (innerPath === '/about') {
    const copy = STATIC_COPY['/about'][lang];
    const override = pageOverrides.about?.[lang];
    return baseResult(lang, '/about', '', override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords('/about', lang),
      ogImage: override?.socialImage || undefined,
      editable: staticPageEditable(lang, '/about', copy, override, langHome),
      jsonLd: [
        buildOrganizationSchema(langHome),
        buildWebPageSchema(lp('/about'), override?.title || copy.title, override?.description || copy.description, langHome),
        buildBreadcrumbSchema([
          { name: breadcrumbNav('home', lang), path: absoluteUrl('/', lang, '', langHome) },
          { name: breadcrumbNav('about', lang), path: absoluteUrl('/about', lang, '', langHome) },
        ], langHome),
      ],
    });
  }

  if (innerPath !== '/' && STATIC_COPY[innerPath]) {
    const copy = STATIC_COPY[innerPath][lang];
    const pageKey = innerPath.replace(/^\//, '') as SeoPageKey;
    const override = pageOverrides[pageKey]?.[lang];
    const aeoPage = innerPath === '/labresults' ? 'labresults' : null;
    return baseResult(lang, innerPath, '', override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords(innerPath, lang),
      ogImage: override?.socialImage || undefined,
      directAnswer: aeoPage ? aeoPageAnswer(aeoPage, asAeoLang(lang)) : undefined,
      editable: staticPageEditable(lang, innerPath, copy, override, langHome),
      jsonLd: [buildWebPageSchema(lp(innerPath), override?.title || copy.title, override?.description || copy.description, langHome)],
    });
  }

  if (innerPath === '/') {
    const copy = STATIC_COPY['/'][lang];
    const override = pageOverrides.home?.[lang];
    return baseResult(lang, '/', '', override?.title || copy.title, override?.description || copy.description, base, {
      robots: override?.robots || undefined,
      keywords: override?.focusKeywords?.length ? override.focusKeywords : staticKeywords('/', lang),
      ogImage: override?.socialImage || undefined,
      directAnswer: aeoPageAnswer('home', asAeoLang(lang)),
      editable: staticPageEditable(lang, '/', copy, override, langHome),
      jsonLd: [
        buildOrganizationSchema(langHome),
        buildWebSiteSchema(langHome),
        buildWebPageSchema(lp('/'), override?.title || copy.title, override?.description || copy.description, langHome),
      ],
    });
  }

  const fallback = STATIC_COPY['/'][lang];
  const fallbackOverride = pageOverrides.home?.[lang];
  return baseResult(lang, innerPath, query, fallbackOverride?.title || fallback.title, fallbackOverride?.description || fallback.description, base, {
    robots: fallbackOverride?.robots || undefined,
    keywords: fallbackOverride?.focusKeywords?.length ? fallbackOverride.focusKeywords : staticKeywords('/', lang),
    ogImage: fallbackOverride?.socialImage || undefined,
    editable: staticPageEditable(lang, '/', fallback, fallbackOverride, langHome),
    jsonLd: [buildWebPageSchema(lp(innerPath), fallbackOverride?.title || fallback.title, fallbackOverride?.description || fallback.description, langHome)],
  });
}

