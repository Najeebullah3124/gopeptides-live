import { useState } from 'react';
import { motion } from 'framer-motion';
import { useT } from '@/hooks/useT';
import { Icon } from '@/components/ui/Icon';
import { scaleIn, viewport } from '@/utils/animations';
import { api } from '@/services/api';

export function SubscribeSection({ h2 }: { h2?: string }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim().includes('@')) {
      setError(t('contact.validEmail'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/subscribe', { email: email.trim(), name: name.trim() || undefined });
    } catch {
      // still show success — already subscribed is fine
    } finally {
      setLoading(false);
    }
    setSubmitted(true);
    setName('');
    setEmail('');
  };

  return (
    <section className="section-pad subscribe-section">
      <motion.div
        className="subscribe-banner"
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <div className="subscribe-content">
          <div className="eyebrow subscribe-eyebrow">{t('subscribe.eyebrow')}</div>
          <h2 className="subscribe-title" dangerouslySetInnerHTML={{ __html: h2 || t('subscribe.title') }} />
          <p className="subscribe-sub">{t('subscribe.sub')}</p>

          {submitted ? (
            <div className="subscribe-success">
              <Icon name="check" size={22} />
              <span>{t('subscribe.done')} ✓ — {t('subscribe.perk1')}</span>
            </div>
          ) : (
            <form onSubmit={onSubscribe} className="subscribe-form">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('subscribe.name')}
                className="field subscribe-input"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('subscribe.placeholder')}
                className="field subscribe-input"
                required
              />
              {error && <p className="subscribe-error">{error}</p>}
              <button type="submit" className="btn-cta lg subscribe-btn" disabled={loading}>
                {loading ? '...' : t('subscribe.button')}
              </button>
            </form>
          )}

          {!submitted && (
            <ul className="subscribe-perks">
              <li className="subscribe-perk"><Icon name="check" size={14} />{t('subscribe.perk1')}</li>
              <li className="subscribe-perk"><Icon name="check" size={14} />{t('subscribe.perk2')}</li>
              <li className="subscribe-perk"><Icon name="check" size={14} />{t('subscribe.perk3')}</li>
            </ul>
          )}
        </div>

        <div
          className="subscribe-photo"
          style={{ backgroundImage: 'url(/photos/subscribe.webp)' }}
          aria-hidden="true"
        />
      </motion.div>
    </section>
  );
}
