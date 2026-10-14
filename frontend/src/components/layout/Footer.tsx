import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';
import { CONTACT } from '@/constants';
import { useProducts } from '@/hooks/useProducts';
import { useSettingsStore } from '@/stores/settingsStore';
import { resolveSupportEmail, resolveWhatsAppHref } from '@/utils/contactLinks';

function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 2.13.67 4.103 1.81 5.73L2 22l4.43-1.157A9.92 9.92 0 0 0 12.004 22c5.49 0 9.986-4.5 9.986-10s-4.5-10-9.986-10zm5.42 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  );
}

function TikTokGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.52V6.78a4.85 4.85 0 0 1-1.02-.09z" />
    </svg>
  );
}

/** Checkout methods: Wallid, bank transfer, EcomTrade24 hosted (card/PayPal/iDEAL/crypto) */
function PaymentBadge({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold tracking-wide uppercase"
      style={{
        background: 'rgba(255,255,255,0.08)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.28)',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

export function Footer() {
  const { t, lang } = useT();
  const { contact, social } = useSettingsStore();
  const whatsappHref = resolveWhatsAppHref(contact, social);
  const supportEmail = resolveSupportEmail(contact);
  const trustpilotRef = useRef<HTMLDivElement>(null);
  const [loadTrustpilot, setLoadTrustpilot] = useState(false);

  const [footerReady, setFooterReady] = useState(false);

  useEffect(() => {
    const enable = () => setFooterReady(true);
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(enable, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(enable, 1500);
    return () => clearTimeout(id);
  }, []);

  // Google Maps embed pulls ~300KB of scripts; native iframe loading="lazy" still fetches it
  // on load because Chrome's lazy threshold spans several viewports. Mount the iframe only
  // when the map container actually approaches the viewport.
  const mapRef = useRef<HTMLDivElement>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const el = mapRef.current;
    if (!el || showMap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowMap(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showMap]);

  const { data: productsData } = useProducts({ limit: 100 }, { enabled: footerReady });
  const bestsellers = (productsData?.data || [])
    .filter(p => p.badge === 'Bestseller' || p.isFeatured)
    .reduce((unique: any[], item) => {
      if (!unique.some(p => p.name === item.name)) {
        unique.push(item);
      }
      return unique;
    }, [])
    .slice(0, 3);

  useEffect(() => {
    // Analytics tracking could go here
  }, []);

  const services: Array<{ icon: string; title: string; sub: string }> = [
    { icon: 'truck',   title: t('footer.svc.shipping'), sub: t('footer.svc.shippingSub') },
    { icon: 'refresh', title: t('footer.svc.returns'),  sub: t('footer.svc.returnsSub') },
    { icon: 'headset', title: t('footer.svc.support'),  sub: t('footer.svc.supportSub') },
  ];

  return (
    <footer className="footer-root">
      {/* Service bar — centred */}
      <div className="footer-service-bar" style={{ justifyContent: 'center' }}>
        {services.map((s) => (
          <div key={s.title} className="footer-service-item">
            <span className="footer-service-icon">
              <Icon name={s.icon} size={22} />
            </span>
            <div>
              <div className="footer-service-title">{s.title}</div>
              <div className="footer-service-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="footer-inner">
        <div className="footer-cols">

          {/* Brand block */}
          <div className="footer-brand">
            <div className="notranslate" translate="no">
              <Logo large />
            </div>
            <p className="footer-tagline">{t('footer.tagline')}</p>
          </div>

          {/* Useful Links */}
          <div>
            <h2 className="footer-col-heading">{t('footer.usefulLinks')}</h2>
            <ul className="footer-col-links">
              <li><Link to="/privacy" className="footer-link">{t('footer.privacy')}</Link></li>
              <li><Link to="/terms" className="footer-link">{t('footer.terms')}</Link></li>
              <li><Link to="/shipping" className="footer-link">{t('footer.shipping')} & {t('footer.returns')}</Link></li>
              <li><Link to="/faq" className="footer-link">FAQ</Link></li>
              <li><Link to="/labresults" className="footer-link">Lab Results</Link></li>
            </ul>
          </div>

          {/* Most Sold */}
          <div>
            <h2 className="footer-col-heading">{t('footer.mostSold')}</h2>
            <ul className="footer-col-links min-h-[5.5rem]">
              {bestsellers.length > 0 ? (
                bestsellers.map((p) => {
                  return (
                    <li key={p.id}>
                      <Link to={`/${p.slug}`} className="footer-link">
                        <span className="notranslate" translate="no">
                          {p.name}
                        </span>
                      </Link>
                    </li>
                  );
                })
              ) : (
                <>
                  <li><Link to="/tirzepatide-10mg" className="footer-link"><span className="notranslate" translate="no">Tirzepatide</span></Link></li>
                  <li><Link to="/retatrutide-10mg" className="footer-link"><span className="notranslate" translate="no">Retatrutide</span></Link></li>
                  <li><Link to="/bpc-157-10mg" className="footer-link"><span className="notranslate" translate="no">BPC-157</span></Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Information Column */}
          <div>
            <h2 className="footer-col-heading">{t('footer.information')}</h2>
            <ul className="footer-col-links space-y-1.5 text-xs text-ink-muted">
              <li>
                <a href="/sitemap.xml" className="footer-link" target="_blank" rel="noopener noreferrer">
                  {t('footer.sitemap')}
                </a>
              </li>
              <li>
                <a href="/llms.txt" className="footer-link" target="_blank" rel="noopener noreferrer">
                  {t('footer.llms')}
                </a>
              </li>
              <li>{t('footer.kvk')}</li>
              <li>{t('footer.btw')}</li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h2 className="footer-col-heading">{t('footer.contactTitle')}</h2>
            <div className="footer-col-links space-y-2">
              <a className="footer-contact-row footer-contact-static hover:text-white transition-colors" href="https://search.google.com/local/reviews?placeid=ChIJP40W2xoLxkcR1VHaE5jeXLw" target="_blank" rel="noopener noreferrer">
                <Icon name="pin" size={15} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                    {t('footer.addressLabel')}
                  </span>
                  <span>{contact?.translations?.[lang]?.address || t('footer.address')}</span>
                </span>
              </a>
              <a className="footer-contact-row" href={`mailto:${supportEmail}`}>
                <Icon name="mail" size={15} />
                <span>{supportEmail}</span>
              </a>
              <a className="footer-contact-row" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppGlyph size={15} />
                <span>WhatsApp — {t('footer.support247')}</span>
              </a>
              <a className="footer-contact-row" href="https://t.me/gopeptides" target="_blank" rel="noopener noreferrer">
                <Icon name="telegram" size={15} />
                <span>Telegram — @gopeptides</span>
              </a>
            </div>
            
            {/* Google Map Embedded — mounted only when scrolled near the footer */}
            <div ref={mapRef} className="mt-4 rounded-xl overflow-hidden shadow-sm h-32 w-full bg-white/5 border border-white/10 relative">
              {showMap && (
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2439.154805524764!2d4.9408094771159385!3d52.31319337200767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c60b1adb168d3f%3A0xbc5cde9813da51d5!2sGo%20Peptides!5e0!3m2!1snl!2s!4v1783090147174!5m2!1snl!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Location Map"
                  className="absolute inset-0 transition-all duration-500 hover:opacity-90"
                />
              )}
            </div>
          </div>
        </div>

        {/* Social + payments row */}
        <div className="footer-payments-row">
          <div className="footer-socials">
            {whatsappHref && (
              <a className="footer-social" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <WhatsAppGlyph size={16} />
              </a>
            )}
            {(social?.instagram || 'https://www.instagram.com/gopeptides') && (
              <a className="footer-social" href={social?.instagram || 'https://www.instagram.com/gopeptides'} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Icon name="instagram" size={16} />
              </a>
            )}
            <a className="footer-social" href="https://t.me/gopeptides" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <Icon name="telegram" size={16} />
            </a>
            {(social?.tiktok || 'https://www.tiktok.com/@gopeptides') && (
              <a className="footer-social" href={social?.tiktok || 'https://www.tiktok.com/@gopeptides'} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <TikTokGlyph size={16} />
              </a>
            )}
            {social?.facebook && (
              <a className="footer-social" href={social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Icon name="facebook" size={16} />
              </a>
            )}
            {social?.twitter && (
              <a className="footer-social" href={social.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <Icon name="twitter" size={16} />
              </a>
            )}
          </div>
          <div className="footer-payments flex items-center gap-2 flex-wrap justify-end">
            <PaymentBadge
              label="Wallid"
              icon={
                <img
                  src="/wallid-logo-64.webp"
                  alt=""
                  width={16}
                  height={16}
                  className="w-4 h-4 object-contain rounded-sm bg-white"
                />
              }
            />
            <PaymentBadge
              label={t('checkout.method.bankTransfer')}
              icon={<Icon name="bank" size={14} className="text-white" />}
            />
            <PaymentBadge label="Card" icon={<Icon name="lock" size={14} className="text-white" />} />
            <PaymentBadge label="PayPal" icon={<Icon name="globe" size={14} className="text-white" />} />
            <PaymentBadge label="iDEAL" icon={<Icon name="bank" size={14} className="text-white" />} />
            <PaymentBadge label="Crypto" icon={<Icon name="spark" size={14} className="text-white" />} />
          </div>
        </div>

        <div className="footer-bottom">
          <p>{t('footer.legalNotice', { year: new Date().getFullYear() })}</p>
          <div className="footer-secure">
            <Icon name="shield" size={12} />
            <span>{t('footer.secure')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
