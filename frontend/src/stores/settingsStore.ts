import { create } from 'zustand';
import { api } from '@/services/api';

interface ContactSettings {
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  translations?: {
    [lang: string]: {
      address?: string;
      hours?: string;
      responseTime?: string;
    };
  };
}

interface SocialSettings {
  whatsapp?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
}

interface AnalyticsSettings {
  googleAnalyticsId?: string;
}

interface SettingsState {
  contact: ContactSettings;
  social: SocialSettings;
  analytics: AnalyticsSettings;
  seoOverrides: Record<string, Record<string, any>>;
  fetched: boolean;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  contact: {},
  social: {},
  analytics: {},
  seoOverrides: {},
  fetched: false,
  loading: false,

  fetchSettings: async () => {
    if (get().fetched || get().loading) return;
    set({ loading: true });
    try {
      const res = await api.get('/settings');
      if (res.data?.success && res.data?.data) {
        set({
          contact: res.data.data.contact || {},
          social: res.data.data.social || {},
          analytics: res.data.data.analytics || {},
          seoOverrides: res.data.data.seo || {},
          fetched: true,
          loading: false,
        });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      set({ loading: false });
    }
  },

  refreshSettings: async () => {
    set({ fetched: false, loading: false });
    await get().fetchSettings();
  },
}));
