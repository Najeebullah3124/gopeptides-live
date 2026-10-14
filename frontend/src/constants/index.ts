export const SITE_NAME = 'GoPeptides';
export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''; // legacy; Stripe checkout removed

// ---------------------------------------------------------------------------
// Contact / support details shown in the footer, floating widgets and chat.
// whatsappNumber is in international format, digits only.
// ---------------------------------------------------------------------------
export const CONTACT = {
  email: 'info@gopeptides.nl',
  phone: '+31 6 15636154',
  phoneHref: 'tel:+31615636154',
  whatsappNumber: '31685108914', // international format, digits only
  whatsappHref: 'https://api.whatsapp.com/send?phone=31685108914',
};

/** Catalog prices are VAT-inclusive — do not add 21% on top (client request). */
export const PRICES_INCLUDE_VAT = true;
export const TAX_RATE = 0;

/** Manual bank transfer — shown on order confirmation after checkout. */
export const BANK_TRANSFER = {
  accountHolder: 'Dubiotech',
  iban: 'NL63REVO5801164286',
  bic: 'REVONL22',
} as const;

export const NAV_LINKS: Array<{ to: string; key: string }> = [
  { to: '/', key: 'nav.home' },
  { to: '/shop', key: 'nav.shop' },
  { to: '/labresults', key: 'nav.science' },
  { to: '/reviews', key: 'nav.reviews' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/faq', key: 'nav.faq' },
  { to: '/contact', key: 'nav.contact' },
];

export const TRUST_BADGES = [
  { icon: 'beaker', title: 'HPLC Tested', desc: 'Every batch verified' },
  { icon: 'document', title: 'CoA Included', desc: 'Certificate of Analysis' },
  { icon: 'truck', title: '48h Delivery', desc: 'Express EU shipping' },
  { icon: 'shield', title: 'Money Back', desc: '14-day guarantee' },
];

export const FAQ_ITEMS = [
  {
    q: 'Are your peptides research-grade only?',
    a: 'Yes. All peptides we supply are for in-vitro research and laboratory use only. They are not intended for human consumption, diagnostic, or therapeutic use.',
  },
  {
    q: 'What purity levels do you guarantee?',
    a: 'Every batch is HPLC-tested to verify purity above 99%. Most products achieve >99% purity. A Certificate of Analysis (CoA) is included with each order.',
  },
  {
    q: 'How fast is shipping in the EU?',
    a: 'We ship from Amsterdam, NL within 24 hours. Most EU destinations receive delivery within 2-7 business days via express courier with tracking.',
  },
  {
    q: 'How should peptides be stored?',
    a: 'Lyophilized peptides should be stored at -20°C in a freezer. Once reconstituted, store at 2-8°C and use within the timeframe noted on the product page.',
  },
  {
    q: 'Do you offer bulk pricing?',
    a: 'Please contact info@gopeptides.nl to receive the discount code for the bulk price.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Wallid (pay by bank), manual bank transfer, and EcomTrade24 hosted checkout (card, PayPal, iDEAL, crypto, and other methods they enable on the payment page).',
  },
];

export const STATS = [
  { value: '99%', label: 'Purity verified' },
  { value: '115', label: 'Researcher reviews' },
  { value: '48h', label: 'EU delivery' },
  { value: '14d', label: 'Money back' },
];

export const COUNTRIES = [
  'Netherlands', 'Belgium', 'Germany', 'France', 'Spain', 'Italy', 'Austria',
  'Portugal', 'Ireland', 'Denmark', 'Sweden', 'Finland', 'Poland', 'Czechia',
  'Luxembourg', 'Greece', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia', 'Lithuania',
  'Romania', 'Bulgaria', 'Hungary', 'Croatia', 'Malta', 'Cyprus',
];

export const PURITY_LEVELS = ['>99%'];
