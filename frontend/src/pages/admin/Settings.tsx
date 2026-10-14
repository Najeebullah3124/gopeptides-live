import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useT } from '@/hooks/useT';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { api, extractErrorMessage } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type SettingsTab = 'contact' | 'social' | 'analytics';

export default function AdminSettings() {
  const { t } = useT();
  const toast = useUiStore((s) => s.toast);
  const { contact, social, analytics, fetchSettings, loading } = useSettingsStore();
  const [tab, setTab] = useState<SettingsTab>('contact');
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!loading) {
      reset({
        email: contact?.email || '',
        phone: contact?.phone || '',
        whatsappNumber: contact?.whatsappNumber || '',
        address_en: contact?.translations?.en?.address || '',
        hours_en: contact?.translations?.en?.hours || '',
        responseTime_en: contact?.translations?.en?.responseTime || '',
        address_nl: contact?.translations?.nl?.address || '',
        hours_nl: contact?.translations?.nl?.hours || '',
        responseTime_nl: contact?.translations?.nl?.responseTime || '',
        address_de: contact?.translations?.de?.address || '',
        hours_de: contact?.translations?.de?.hours || '',
        responseTime_de: contact?.translations?.de?.responseTime || '',
        
        whatsapp: social?.whatsapp || '',
        instagram: social?.instagram || '',
        tiktok: social?.tiktok || '',
        facebook: social?.facebook || '',
        twitter: social?.twitter || '',

        googleAnalyticsId: analytics?.googleAnalyticsId || '',
      });
    }
  }, [contact, social, analytics, loading, reset]);

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const payload = {
        contact: {
          email: data.email,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          translations: {
            en: { address: data.address_en, hours: data.hours_en, responseTime: data.responseTime_en },
            nl: { address: data.address_nl, hours: data.hours_nl, responseTime: data.responseTime_nl },
            de: { address: data.address_de, hours: data.hours_de, responseTime: data.responseTime_de },
          }
        },
        social: {
          whatsapp: data.whatsapp,
          instagram: data.instagram,
          tiktok: data.tiktok,
          facebook: data.facebook,
          twitter: data.twitter,
        },
        analytics: {
          googleAnalyticsId: data.googleAnalyticsId,
        },
      };

      const res = await api.put('/settings', payload);
      if (res.data?.success) {
        toast('Settings updated successfully', 'success');
        await fetchSettings(); // refresh store
      }
    } catch (err) {
      toast(extractErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !contact.email) {
    return <div className="p-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Site Settings</h1>
      </div>

      <div className="flex gap-4 border-b border-line">
        <button
          onClick={() => setTab('contact')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors ${tab === 'contact' ? 'border-b-2 border-primary text-primary' : 'text-ink-muted'}`}
        >
          Contact Info
        </button>
        <button
          onClick={() => setTab('social')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors ${tab === 'social' ? 'border-b-2 border-primary text-primary' : 'text-ink-muted'}`}
        >
          Social Media Links
        </button>
        <button
          onClick={() => setTab('analytics')}
          className={`pb-2 px-2 text-sm font-semibold transition-colors ${tab === 'analytics' ? 'border-b-2 border-primary text-primary' : 'text-ink-muted'}`}
        >
          Analytics
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 max-w-4xl space-y-6">
        {tab === 'contact' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-ink mb-4">Core Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Public Email" {...register('email')} placeholder="info@gopeptides.nl" />
                <Input label="Phone Number" {...register('phone')} placeholder="+31 6 15636154" />
                <Input label="WhatsApp Number (Digits Only)" {...register('whatsappNumber')} placeholder="31615636154" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ink mb-4">Dutch Translations (Default)</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Adres" {...register('address_nl')} placeholder="Amsterdam, Nederland" />
                <Input label="Openingstijden" {...register('hours_nl')} placeholder="Ma-Za · 24 uur geopend" />
                <Input label="Reactietijd" {...register('responseTime_nl')} placeholder="Binnen 1 werkdag" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ink mb-4">English Translations</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Address" {...register('address_en')} />
                <Input label="Business Hours" {...register('hours_en')} />
                <Input label="Response Time" {...register('responseTime_en')} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-ink mb-4">German Translations</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Adresse" {...register('address_de')} />
                <Input label="Öffnungszeiten" {...register('hours_de')} />
                <Input label="Reaktionszeit" {...register('responseTime_de')} />
              </div>
            </div>
          </div>
        )}

        {tab === 'social' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ink mb-4">Social Media URLs</h3>
            <p className="text-sm text-ink-muted mb-4">Enter the full URL (including https://) for your social media profiles.</p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="WhatsApp URL" {...register('whatsapp')} placeholder="https://wa.me/31615636154" />
              <Input label="Instagram URL" {...register('instagram')} placeholder="https://www.instagram.com/gopeptides" />
              <Input label="TikTok URL" {...register('tiktok')} placeholder="https://www.tiktok.com/@gopeptides" />
              <Input label="Facebook URL" {...register('facebook')} placeholder="https://facebook.com/gopeptides" />
              <Input label="Twitter / X URL" {...register('twitter')} placeholder="https://x.com/gopeptides" />
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-ink mb-4">{t('admin.settings.gaIdLabel')}</h3>
            <p className="text-sm text-ink-muted mb-4">{t('admin.settings.gaIdHint')}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label={t('admin.settings.gaIdLabel')} {...register('googleAnalyticsId')} placeholder="G-XXXXXXXXXX" />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-line flex justify-end">
          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
