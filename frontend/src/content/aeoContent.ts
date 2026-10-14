/** AEO answer snippets + FAQs (EN/NL/DE). Keep answers ~40–70 words for extractability. */

export type AeoLang = 'en' | 'nl' | 'de';

const HOME: Record<AeoLang, string> = {
  en: 'GoPeptides supplies HPLC-tested research peptides for laboratory use only, with a batch Certificate of Analysis on every order. We ship from the Netherlands across the EU, typically within 24 hours. Products are not for human or animal use — only controlled research.',
  nl: 'GoPeptides levert HPLC-geteste onderzoekspeptiden uitsluitend voor laboratoriumgebruik, met een Certificate of Analysis per batch. We verzenden vanuit Nederland door heel de EU, meestal binnen 24 uur. Producten zijn niet bedoeld voor mens of dier — alleen gecontroleerd onderzoek.',
  de: 'GoPeptides liefert HPLC-gepruefte Forschungspeptide ausschliesslich fuer den Laborgebrauch, mit Analysezertifikat pro Charge. Versand aus den Niederlanden in die EU, in der Regel innerhalb von 24 Stunden. Nicht fuer Mensch oder Tier — nur kontrollierte Forschung.',
};

const SHOP: Record<AeoLang, string> = {
  en: 'The GoPeptides shop lists research-grade peptides by category, dosage, and purity. Each active product page shows HPLC/CoA documentation where available, storage notes, and research-use-only terms. Filter by category to compare vials before ordering for your lab workflow.',
  nl: 'De GoPeptides-shop toont onderzoekspeptiden per categorie, dosering en zuiverheid. Elke actieve productpagina toont waar beschikbaar HPLC- en CoA-documentatie, bewaarinstructies en research-only voorwaarden. Filter op categorie om flacons te vergelijken en veilig te bestellen voor je laboratoriumwerk.',
  de: 'Der GoPeptides-Shop listet Forschungspeptide nach Kategorie, Dosierung und Reinheit. Jede aktive Produktseite zeigt ggf. HPLC- und CoA-Dokumentation, Lagerhinweise und Research-only-Bedingungen. Filtern Sie nach Kategorie, um Fläschchen zu vergleichen und fuer Ihr Labor zu bestellen.',
};

const LAB: Record<AeoLang, string> = {
  en: 'Lab results on GoPeptides show third-party purity and content checks for research peptide batches. Open a product report to view measured values and, when available, scan images of the Certificate of Analysis. Reports support laboratory documentation — not medical advice.',
  nl: 'Labresultaten bij GoPeptides tonen onafhankelijke zuiverheids- en contentcontroles voor onderzoekspeptide-batches. Open een productrapport voor gemeten waarden en, indien beschikbaar, scans van het Certificate of Analysis. Deze rapporten helpen bij labdocumentatie en zijn geen medisch advies.',
  de: 'Laborergebnisse bei GoPeptides zeigen unabhaengige Reinheits- und Gehaltspruefungen fuer Forschungspeptid-Chargen. Oeffnen Sie einen Produktbericht fuer Messwerte und ggf. CoA-Scans. Berichte dienen der Labordokumentation und sind keine medizinische Beratung.',
};

export function aeoPageAnswer(page: 'home' | 'shop' | 'labresults', lang: AeoLang): string {
  if (page === 'shop') return SHOP[lang] || SHOP.en;
  if (page === 'labresults') return LAB[lang] || LAB.en;
  return HOME[lang] || HOME.en;
}

export function aeoProductAnswer(
  name: string,
  weight: string | null | undefined,
  purity: string | null | undefined,
  lang: AeoLang,
): string {
  const dose = weight?.trim() ? ` (${weight.trim()})` : '';
  const pur = purity?.trim() || '≥99%';
  if (lang === 'nl') {
    return `${name}${dose} is een HPLC-getest onderzoekspeptid van GoPeptides met typische zuiverheid ${pur} en batch-CoA waar beschikbaar. Uitsluitend voor laboratorium- en in-vitro-onderzoek; niet voor menselijke of dierlijke consumptie. Bestel met EU-verzending vanuit Nederland.`;
  }
  if (lang === 'de') {
    return `${name}${dose} ist ein HPLC-geprueftes Forschungspeptid von GoPeptides mit typischer Reinheit ${pur} und Chargen-CoA sofern verfuegbar. Nur fuer Labor- und In-vitro-Forschung; nicht fuer Mensch oder Tier. Bestellung mit EU-Versand aus den Niederlanden.`;
  }
  return `${name}${dose} is an HPLC-tested research peptide from GoPeptides with typical purity ${pur} and a batch CoA when available. For laboratory and in-vitro research only — not for human or animal use. Order with EU shipping from the Netherlands.`;
}

export function aeoProductFaqs(
  name: string,
  weight: string | null | undefined,
  purity: string | null | undefined,
  lang: AeoLang,
): Array<{ question: string; answer: string }> {
  const dose = weight?.trim() ? ` ${weight.trim()}` : '';
  const pur = purity?.trim() || '≥99%';
  if (lang === 'nl') {
    return [
      {
        question: `Waarvoor is ${name} bedoeld?`,
        answer: `${name}${dose} is uitsluitend bedoeld voor laboratorium- en researchgebruik. Het is geen geneesmiddel en mag niet door mensen of dieren worden gebruikt.`,
      },
      {
        question: `Heeft ${name} een Certificate of Analysis?`,
        answer: `GoPeptides koppelt HPLC-tests en CoA-documentatie per batch waar beschikbaar. Op de product- en labresultatenpagina zie je zuiverheid (vaak ${pur}) en meetwaarden.`,
      },
      {
        question: `Hoe bewaar ik ${name}?`,
        answer: `Lyofiliseerde peptiden koel en donker bewaren (vaak −20°C). Na reconstitutie gekoeld bewaren en binnen de termijn op de productpagina gebruiken.`,
      },
    ];
  }
  if (lang === 'de') {
    return [
      {
        question: `Wofuer ist ${name} gedacht?`,
        answer: `${name}${dose} ist ausschliesslich fuer Labor- und Forschungszwecke bestimmt. Es ist kein Arzneimittel und darf nicht an Menschen oder Tiere verabreicht werden.`,
      },
      {
        question: `Gibt es ein Analysezertifikat fuer ${name}?`,
        answer: `GoPeptides stellt HPLC-Tests und CoA-Dokumentation pro Charge bereit, sofern verfuegbar. Auf Produkt- und Laborseiten sehen Sie Reinheit (oft ${pur}) und Messwerte.`,
      },
      {
        question: `Wie lagere ich ${name}?`,
        answer: `Lyophilisierte Peptide kuehl und dunkel lagern (oft −20°C). Nach Rekonstitution gekuehlt aufbewahren und innerhalb der auf der Produktseite genannten Frist verwenden.`,
      },
    ];
  }
  return [
    {
      question: `What is ${name} used for?`,
      answer: `${name}${dose} is intended strictly for laboratory and research use. It is not a medicine and must not be used in humans or animals.`,
    },
    {
      question: `Does ${name} include a Certificate of Analysis?`,
      answer: `GoPeptides provides HPLC testing and batch CoA documentation when available. Product and lab-results pages show purity (often ${pur}) and measured values.`,
    },
    {
      question: `How should I store ${name}?`,
      answer: `Store lyophilized peptides cold and protected from light (often −20°C). After reconstitution, refrigerate and use within the window noted on the product page.`,
    },
  ];
}
