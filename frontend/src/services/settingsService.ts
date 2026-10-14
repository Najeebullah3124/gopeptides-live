import { api, unwrap } from './api';

export interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceMessageNl: string;
  maintenanceMessageDe: string;
  maintenancePages: string;
  googleAnalyticsId: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramEnabled?: boolean;
  emailAlertsEnabled?: boolean;
  emailAlertsRecipients?: string;
  nowpaymentsApiKey?: string;
  nowpaymentsSandboxEnabled?: boolean;
  trustpilotWidgetEnabled?: boolean;
  trustpilotBusinessUnitId?: string;
  trustpilotTemplateId?: string;
  printnodeApiKey?: string;
  printnodePrinterId?: string;
  printnodeEnabled?: boolean;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalEnabled?: boolean;
  social?: {
    whatsapp?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    twitter?: string;
  };
  seo?: Record<string, Record<string, any>>;
}

export const settingsService = {
  get(): Promise<SystemSettings> {
    return unwrap(api.get('/settings'));
  },
  getAdmin(): Promise<SystemSettings> {
    return unwrap(api.get('/settings/admin'));
  },
  update(payload: Partial<SystemSettings>): Promise<SystemSettings> {
    return unwrap(api.put('/settings/admin', payload));
  },
};
