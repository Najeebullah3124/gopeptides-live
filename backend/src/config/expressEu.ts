/** Express add-on: Europe except NL and BE. €39.95, or included when merchandise ≥ €450. */

export const EXPRESS_EU_FEE = 39.95;
export const EXPRESS_EU_FREE_THRESHOLD = 450;

const EUROPE_ISO2 = new Set([
  'AL', 'AD', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME',
  'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA', 'XK',
]);

const NAME_TO_ISO2: Record<string, string> = {
  albania: 'AL',
  andorra: 'AD',
  austria: 'AT',
  belarus: 'BY',
  belgium: 'BE',
  belgie: 'BE',
  belgique: 'BE',
  belgien: 'BE',
  'bosnia and herzegovina': 'BA',
  bulgaria: 'BG',
  croatia: 'HR',
  cyprus: 'CY',
  czechia: 'CZ',
  'czech republic': 'CZ',
  denmark: 'DK',
  estonia: 'EE',
  finland: 'FI',
  france: 'FR',
  germany: 'DE',
  deutschland: 'DE',
  greece: 'GR',
  hungary: 'HU',
  iceland: 'IS',
  ireland: 'IE',
  italy: 'IT',
  kosovo: 'XK',
  latvia: 'LV',
  liechtenstein: 'LI',
  lithuania: 'LT',
  luxembourg: 'LU',
  malta: 'MT',
  moldova: 'MD',
  monaco: 'MC',
  montenegro: 'ME',
  netherlands: 'NL',
  nederland: 'NL',
  niederlande: 'NL',
  'the netherlands': 'NL',
  'north macedonia': 'MK',
  norway: 'NO',
  poland: 'PL',
  portugal: 'PT',
  romania: 'RO',
  'san marino': 'SM',
  serbia: 'RS',
  slovakia: 'SK',
  slovenia: 'SI',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  ukraine: 'UA',
  'united kingdom': 'GB',
  'great britain': 'GB',
  england: 'GB',
  'vatican city': 'VA',
};

function fold(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function countryToIso2(raw?: string): string | undefined {
  const s = (raw || '').trim();
  if (!s) return undefined;
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  return NAME_TO_ISO2[fold(s)];
}

export function isNetherlandsCountry(raw?: string): boolean {
  return countryToIso2(raw) === 'NL';
}

export function isEuropeExceptNl(raw?: string): boolean {
  const iso = countryToIso2(raw);
  return !!iso && iso !== 'NL' && iso !== 'BE' && EUROPE_ISO2.has(iso);
}

export type ExpressEuQuote = {
  eligible: boolean;
  applied: boolean;
  surcharge: number;
  included: boolean;
};

export function quoteExpressEu(country: string | undefined, afterDiscount: number, optedIn: boolean): ExpressEuQuote {
  const eligible = isEuropeExceptNl(country);
  if (!eligible) return { eligible: false, applied: false, surcharge: 0, included: false };
  const included = afterDiscount >= EXPRESS_EU_FREE_THRESHOLD;
  const applied = included || optedIn;
  const surcharge = applied && !included ? EXPRESS_EU_FEE : 0;
  return { eligible, applied, surcharge, included };
}
