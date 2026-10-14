import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';
import { useSetLang } from '@/hooks/useSetLang';
import { useLangStore, isNativeLang } from '@/stores/langStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { LANGS, type Lang } from '@/i18n/translations';
import { cn } from '@/utils/helpers';
import { resolveSupportEmail, resolveWhatsAppHref } from '@/utils/contactLinks';


function getGoogSelect(): HTMLSelectElement | null {
  return document.querySelector('.goog-te-combo');
}

/** Trigger Google Translate for a target language (e.g. 'fr', 'es') */
function triggerGoogleTranslate(targetLang: string) {
  const select = getGoogSelect();
  if (select) {
    select.value = targetLang;
    select.dispatchEvent(new Event('change'));
    return;
  }
  // Fallback: set cookie and reload ONLY if it's not already set to avoid infinite reload loops
  const expectedValue = `/en/${targetLang}`;
  const currentCookie = document.cookie.split('; ').find(row => row.trim().startsWith('googtrans='));
  if (!currentCookie || !currentCookie.includes(expectedValue)) {
    document.cookie = `googtrans=/en/${targetLang}; path=/`;
    document.cookie = `googtrans=/en/${targetLang}; path=/; domain=.${window.location.hostname}`;
    // Allow a future reset (e.g. switching back to a native language) to reload once more.
    sessionStorage.removeItem('gt-reset-done');
    window.location.reload();
  }
}

/** Remove the googtrans cookie across every path/domain variant it might have been set on. */
function clearGoogtransCookie(): boolean {
  const had = document.cookie.split('; ').some((r) => r.trim().startsWith('googtrans='));
  if (!had) return false;
  const host = window.location.hostname;
  const domains = ['', `; domain=${host}`, `; domain=.${host}`];
  // Also try the registrable domain (e.g. .gopeptides.nl) when on a subdomain.
  const parts = host.split('.');
  if (parts.length > 2) domains.push(`; domain=.${parts.slice(-2).join('.')}`);
  const expiry = '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  for (const d of domains) {
    document.cookie = `googtrans=; path=/${d}${expiry}`;
    document.cookie = `googtrans=${d}${expiry}`;
  }
  return true;
}

/** Reset Google Translate back to original (English base) */
function resetGoogleTranslate() {
  const select = getGoogSelect();
  if (select && select.value && select.value !== 'en') {
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
  }
  // If a stale googtrans cookie existed, clearing it requires a reload for GT to drop the translation.
  // Guard with a one-shot session flag so a stubborn cookie can never cause a reload loop.
  if (clearGoogtransCookie() && !sessionStorage.getItem('gt-reset-done')) {
    sessionStorage.setItem('gt-reset-done', '1');
    window.location.reload();
  }
}

/** WhatsApp brand glyph */
function WhatsAppGlyph({ size = 26, className = '', style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 2.13.67 4.103 1.81 5.73L2 22l4.43-1.157A9.92 9.92 0 0 0 12.004 22c5.49 0 9.986-4.5 9.986-10s-4.5-10-9.986-10zm5.42 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  );
}

const NATIVE_LANGS = LANGS.filter((l) => isNativeLang(l.code as Lang));
const EXTENDED_LANGS = LANGS.filter((l) => !isNativeLang(l.code as Lang));

export function FloatingWidgets() {
  const { t } = useT();
  const lang = useLangStore((s) => s.lang);
  const { contact, social } = useSettingsStore();
  const whatsappHref = resolveWhatsAppHref(contact, social);
  const supportEmail = resolveSupportEmail(contact);
  const setLang = useSetLang();
  const [chatOpen, setChatOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false);
      if (chatRef.current && !chatRef.current.contains(target)) setChatOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    // Native languages (en, nl, de) have full manual dictionaries — turn Google Translate OFF.
    // Only the extended EU languages use Google Translate.
    if (isNativeLang(lang)) {
      resetGoogleTranslate();
    } else {
      triggerGoogleTranslate(lang);
    }
  }, [lang]);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  const handleLangSelect = (code: string) => {
    setLang(code as Lang);
    setLangOpen(false);
    // GT is triggered automatically by the useEffect above when lang changes
  };

  return (
    <>
      {/* Bottom-left: chat */}
      <div className="fw-left" ref={chatRef}>
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              className="fw-chat-panel"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              <div className="fw-chat-head">
                <div className="fw-chat-head-title">{t('chat.title')}</div>
                <div className="fw-chat-head-sub">{t('chat.sub')}</div>
              </div>
              <div className="fw-chat-body">
                <a className="fw-chat-option fw-chat-option-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <WhatsAppGlyph size={22} />
                  <span>
                    <span className="fw-chat-option-title">{t('chat.whatsapp')}</span>
                    <span className="fw-chat-option-sub">{t('chat.whatsappSub')}</span>
                  </span>
                </a>
                <a className="fw-chat-option" href={`mailto:${supportEmail}`}>
                  <Icon name="mail" size={20} />
                  <span>
                    <span className="fw-chat-option-title">{t('chat.email')}</span>
                    <span className="fw-chat-option-sub">{supportEmail}</span>
                  </span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fw-left-buttons">
          <button className="fw-livechat-pill" onClick={() => setChatOpen((v) => !v)} aria-label={t('chat.livechat')}>
            {chatOpen ? <Icon name="close" size={20} /> : <WhatsAppGlyph size={20} />}
            <span>{t('chat.livechat')}</span>
          </button>
        </div>
      </div>

      {/* Bottom-right: language selector — 14 EU languages */}
      <div className="fw-right" ref={langRef}>
        <AnimatePresence>
          {langOpen && (
            <motion.div
              className="fw-lang-menu notranslate"
              translate="no"
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              {/* Native languages — full translations */}
              {NATIVE_LANGS.map((l) => (
                <button
                  key={l.code}
                  className={cn('fw-lang-option notranslate', l.code === lang && 'active')}
                  translate="no"
                  onClick={() => handleLangSelect(l.code)}
                >
                  <span className="fw-lang-flag" translate="no">{l.flag}</span>
                  <span className="notranslate" translate="no">{l.label}</span>
                </button>
              ))}

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--color-line)', margin: '4px 8px', opacity: 0.5 }} />
              <div className="notranslate" translate="no" style={{ fontSize: '10px', color: 'var(--color-ink-muted)', padding: '2px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Auto-vertaald
              </div>

              {/* Extended EU languages — Google Translate */}
              {EXTENDED_LANGS.map((l) => (
                <button
                  key={l.code}
                  className={cn('fw-lang-option notranslate', l.code === lang && 'active')}
                  translate="no"
                  onClick={() => handleLangSelect(l.code)}
                >
                  <span className="fw-lang-flag" translate="no">{l.flag}</span>
                  <span className="notranslate" translate="no">{l.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          className="fw-btn fw-btn-lang"
          onClick={() => setLangOpen((v) => !v)}
          aria-label={t('lang.toggle')}
        >
          <Icon name="globe" size={20} />
          <span className="fw-lang-current">{current.flag}</span>
        </button>
      </div>
    </>
  );
}
