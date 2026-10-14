import { api, unwrap } from './api';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/user';

export const authService = {
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return unwrap(api.post('/auth/register', payload));
  },
  login(payload: LoginPayload): Promise<AuthResponse> {
    return unwrap(api.post('/auth/login', payload));
  },
  logout(): Promise<unknown> {
    return api.post('/auth/logout');
  },
  me(): Promise<User> {
    return unwrap(api.get('/auth/me'));
  },
  forgotPassword(email: string): Promise<unknown> {
    return api.post('/auth/forgot-password', { email });
  },
  resetPassword(email: string, code: string, password: string): Promise<unknown> {
    return api.post('/auth/reset-password', { email, code, password });
  },
  verifyEmail(email: string, code: string): Promise<unknown> {
    return api.post('/auth/verify-email', { email, code });
  },
  resendVerification(email: string): Promise<unknown> {
    return api.post('/auth/resend-verification', { email });
  },
  refresh(): Promise<{ accessToken: string; user: User }> {
    return unwrap(api.post('/auth/refresh-token'));
  },
};
