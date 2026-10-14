import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { useLangStore } from '@/stores/langStore';
import { tr } from '@/i18n/translations';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Stable per-browser session id so anonymous activity can be grouped. */
export function getSessionId(): string {
  const KEY = 'gp-session-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(KEY, id);
  }
  return id;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  config.headers = config.headers || {};
  (config.headers as Record<string, string>)['x-session-id'] = getSessionId();
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = axios
      .post<{ data: { accessToken: string } }>(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true })
      .then((r) => {
        const token = r.data.data.accessToken;
        useAuthStore.getState().setAccessToken(token);
        return token;
      })
      .catch(() => {
        useAuthStore.getState().clear();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/refresh-token') &&
      !original.url?.includes('/auth/register')
    ) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken && original.headers) {
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: Array<{ message: string }>; code?: string } | undefined;
    if (err.response?.status === 429 || data?.code === 'RATE_LIMITED') {
      const lang = useLangStore.getState().lang;
      return tr(lang, 'error.rateLimited');
    }
    if (data?.errors?.length) return data.errors.map((e) => e.message).join(', ');
    if (data?.message) return data.message;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export async function unwrap<T>(promise: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const r = await promise;
  return r.data.data;
}
