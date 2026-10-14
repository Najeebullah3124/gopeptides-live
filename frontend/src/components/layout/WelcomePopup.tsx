import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/hooks/useT';
import { api } from '@/services/api';

export function WelcomePopup() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const showPopup = () => {
      timeoutId = setTimeout(() => {
        setOpen(true);
      }, 1000);
    };

    const isVerified = localStorage.getItem('gp-age-verified') === 'yes';
    const isDismissed = localStorage.getItem('gp-welcome-dismissed') === 'yes';

    if (!isDismissed) {
      if (isVerified) {
        showPopup();
      }

      const handleAgeVerified = () => {
        showPopup();
      };

      window.addEventListener('age-verified', handleAgeVerified);
      return () => {
        window.removeEventListener('age-verified', handleAgeVerified);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('gp-welcome-dismissed', 'yes');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('WELCOME10').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim().includes('@')) {
      setError(t('contact.validEmail') || 'Please enter a valid email.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/subscribe', { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      // Fallback: still show the code even if they were already subscribed
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Glassmorphic backdrop */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
            onClick={handleDismiss}
          />
          
          {/* Premium Glassmorphic Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden flex flex-col items-center justify-center"
          >
            {/* Ambient background glows */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary-light/30 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              aria-label="Close"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-colors"
            >
              <Icon name="close" size={16} />
            </button>

            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 mb-6">
              <Icon name="spark" size={32} className="text-primary-light animate-pulse" />
            </div>

            {/* Header */}
            <h2 className="text-2xl font-extrabold tracking-tight mb-2 text-white uppercase leading-tight text-center">
              {t('welcome.popup.title')}
            </h2>
            <p className="text-sm text-white/85 leading-relaxed mb-6 text-center">
              {t('welcome.popup.subtitle')}
            </p>

            {submitted ? (
              /* Success / Coupon copy block */
              <div className="animate-fadeIn w-full flex flex-col items-center">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-col items-center justify-center relative w-full">
                  <span className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1 text-center">
                    {t('welcome.popup.codeLabel') || 'Your Promo Code'}
                  </span>
                  <span className="text-2xl font-mono font-extrabold tracking-widest text-primary-light select-all text-center">
                    WELCOME10
                  </span>
                  <button
                    onClick={handleCopy}
                    className="mt-3 inline-flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/25 border border-white/10 text-xs font-semibold text-white transition-all active:scale-95 mx-auto"
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={12} />
                    {copied ? t('welcome.popup.copied') || 'Copied!' : t('welcome.popup.copy') || 'Copy Code'}
                  </button>
                </div>

                <button
                  onClick={handleDismiss}
                  className="w-full btn-cta py-3 font-bold text-sm rounded-xl flex justify-center items-center bg-primary hover:bg-primary-dark text-bg transition-colors"
                >
                  {t('welcome.explore') || 'Start Exploring'}
                </button>
              </div>
            ) : (
              /* Email Input Form block */
              <form onSubmit={onSubscribe} className="space-y-4 animate-fadeIn w-full">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('welcome.popup.placeholder') || 'Enter your email...'}
                    className="w-full bg-white/5 border-2 border-white/20 focus:border-primary-light rounded-xl text-white placeholder-white/50 text-sm px-4 py-3.5 outline-none transition-all text-center"
                  />
                </div>
                
                {error && (
                  <p className="text-xs text-red-400 font-semibold text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-cta py-3.5 font-bold text-sm rounded-xl flex justify-center items-center bg-primary hover:bg-primary-dark text-bg transition-colors disabled:opacity-50"
                >
                  {submitting ? '...' : t('welcome.popup.button')}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
