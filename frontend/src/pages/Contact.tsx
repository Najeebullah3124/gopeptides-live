import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useSEO } from '@/hooks/useSEO';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useT } from '@/hooks/useT';
import { useUiStore } from '@/stores/uiStore';
import { contactService } from '@/services/contactService';
import { extractErrorMessage } from '@/services/api';
import { CONTACT } from '@/constants';
import { useSettingsStore } from '@/stores/settingsStore';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoContentBlock } from '@/components/seo/SeoContentBlock';

const schema = z.object({
  name: z.string().min(1, 'required').max(80),
  email: z.string().email('email'),
  subject: z.string().min(1, 'required').max(120),
  message: z.string().min(5, 'min5').max(2000),
});
type ContactForm = z.infer<typeof schema>;

export default function ContactPage() {
  const { t, lang } = useT();
  const { contact } = useSettingsStore();
  const pageSeo = usePageSeo('/contact');
  const seo = lang === 'nl'
    ? { title: 'Contact GoPeptides Onderzoeksondersteuning', description: 'Neem contact op met GoPeptides voor vragen over HPLC-geteste onderzoekspeptiden, COA-documenten, verzending en bestellingen. Reactie binnen een werkdag.' }
    : lang === 'de'
      ? { title: 'GoPeptides Forschungssupport kontaktieren', description: 'Kontaktieren Sie GoPeptides bei Fragen zu HPLC-geprueften Forschungspeptiden, COA-Dokumenten, Versand und Bestellungen. Antwort innerhalb eines Werktags.' }
      : { title: 'Contact GoPeptides Research Support Team', description: 'Contact GoPeptides with questions about HPLC-tested research peptides, COA documents, shipping, and orders. Our support team replies within one business day.' };
  useSEO({
    title: pageSeo.editable?.title || seo.title,
    description: pageSeo.editable?.description || seo.description,
    keywords: pageSeo.editable?.focusKeywords,
    canonical: pageSeo.canonical,
    alternates: pageSeo.alternates
  });
  const toast = useUiStore((s) => s.toast);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const errMsg = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    if (raw === 'required') return t('auth.validation.required');
    if (raw === 'email') return t('contact.validEmail');
    if (raw === 'min5') return t('auth.validation.passwordMin');
    return raw;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactForm>({ resolver: zodResolver(schema) });

  const submit = async (data: ContactForm) => {
    setSubmitting(true);
    try {
      await contactService.submit(data);
      setDone(true);
      reset();
      toast(t('contact.sentDesc'), 'success');
    } catch (err) {
      toast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: seo.title,
    description: seo.description,
    url: pageSeo.canonical,
  };

  return (
    <div className="container-app section-pad max-w-5xl">
      <JsonLd data={pageJsonLd} />
      <div className="text-center mb-10">
        <p className="eyebrow">{t('contact.eyebrow')}</p>
        <h1 className="text-4xl font-extrabold text-ink mb-3" style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}>
          {pageSeo.editable?.h1 || t('contact.title')}
        </h1>
        <p className="text-ink-muted max-w-xl mx-auto">{t('contact.subtitle')}</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <aside className="space-y-4">
          {[
            { icon: 'mail' as const, label: t('contact.contactEmail'), value: contact?.email || CONTACT.email },
            { icon: 'truck' as const, label: t('contact.shippingHQ'), value: contact?.translations?.[lang]?.address || t('contact.shippingHQVal') },
            { icon: 'info' as const, label: t('contact.hours'), value: contact?.translations?.[lang]?.hours || t('contact.hoursVal') },
            { icon: 'shield' as const, label: t('contact.responseTime'), value: contact?.translations?.[lang]?.responseTime || t('contact.responseTimeVal') },
          ].map((c) => (
            <div key={c.label} className="card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Icon name={c.icon} size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[1.5px] text-ink-muted font-bold">{c.label}</p>
                <p className="text-sm text-ink mt-0.5">{c.value}</p>
              </div>
            </div>
          ))}
        </aside>

        <div className="card p-6 lg:p-8">
          {done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/15 border-2 border-success/40 mx-auto flex items-center justify-center mb-5">
                <Icon name="check" size={28} className="text-success" />
              </div>
              <h2 className="text-xl font-bold text-ink mb-2">{t('contact.sent')}</h2>
              <p className="text-ink-muted mb-6 max-w-sm mx-auto">{t('contact.sentDesc')}</p>
              <Button variant="secondary" onClick={() => setDone(false)}>
                {t('contact.sendAnother')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
              <h2 className="text-xl font-bold text-ink">{pageSeo.editable?.h2?.[0] || t('contact.sendMessage')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label={t('label.name')}
                  placeholder={t('contact.placeholder.name')}
                  {...register('name')}
                  error={errMsg(errors.name?.message)}
                />
                <Input
                  label={t('label.email')}
                  type="email"
                  placeholder={t('auth.placeholder.email')}
                  leftIcon={<Icon name="mail" size={16} />}
                  {...register('email')}
                  error={errMsg(errors.email?.message)}
                />
              </div>
              <Input
                label={t('label.subject')}
                placeholder={t('contact.placeholder.subject')}
                {...register('subject')}
                error={errMsg(errors.subject?.message)}
              />
              <Textarea
                label={t('label.message')}
                placeholder={t('contact.placeholder.message')}
                rows={6}
                {...register('message')}
                error={errMsg(errors.message?.message)}
              />
              <Button type="submit" size="lg" fullWidth loading={submitting}>
                {t('contact.sendMessage')}
                <Icon name="arrowRight" size={14} />
              </Button>
            </form>
          )}
        </div>
      </div>
      <SeoContentBlock seo={pageSeo.editable} />
    </div>
  );
}
