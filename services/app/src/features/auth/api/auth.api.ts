import { api } from '@/api/client';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  OAuthProvider,
  OAuthUrlResponse,
  OAuthCallbackParams
} from '../types';

export const authApi = {
  register: async (payload: RegisterRequest): Promise<LoginResponse> => {
    return await api.post('auth/register', { json: payload }).json<LoginResponse>();
  },

  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    return await api.post('auth/login', { json: payload }).json<LoginResponse>();
  },

  logout: async (accessToken: string, refreshToken: string): Promise<void> => {
    await api.post('auth/logout', { 
      json: { 
        access_token: accessToken, 
        refresh_token: refreshToken 
      } 
    });
  },

  getOAuthUrl: async (provider: OAuthProvider): Promise<OAuthUrlResponse> => {
    return await api.get(`auth/oauth/url/${provider}`).json<OAuthUrlResponse>();
  },

  oauthCallback: async (provider: OAuthProvider, params: OAuthCallbackParams): Promise<LoginResponse> => {
    return await api.get(`auth/oauth/callback/${provider}`, { searchParams: params }).json<LoginResponse>();
  },

  enableMfa: async (payload: { method: 'TOTP' | 'SMS' }): Promise<{ secret_base32: string }> => {
    return await api.post('auth/mfa/enable', { json: payload }).json();
  },

  disableMfa: async (): Promise<void> => {
    await api.post('auth/mfa/disable');
  },

  verifyMfa: async (payload: { login_request_id: string; code: string }): Promise<LoginResponse> => {
    return await api.post('auth/mfa/verify', { json: payload }).json();
  },

  refresh: async (payload: { refresh_token: string }): Promise<LoginResponse> => {
    return await api.post('auth/refresh', { json: payload }).json();
  },

  getMe: async (): Promise<any> => {
    return await api.get('auth/me').json();
  },

  getLinkedProviders: async (): Promise<{ providers: { name: string, provider_id: string }[] }> => {
    return await api.get('auth/oauth/providers').json();
  },

  unlinkProvider: async (provider: OAuthProvider): Promise<void> => {
    await api.delete(`auth/oauth/providers/${provider}`);
  },

  updateEmail: async (payload: { new_email: string }): Promise<void> => {
    await api.put('auth/email', { json: payload });
  },

  updateUsername: async (payload: { new_username: string }): Promise<void> => {
    await api.put('auth/username', { json: payload });
  },

  updatePassword: async (payload: { old_password: string; new_password: string }): Promise<void> => {
    await api.put('auth/password', { json: payload });
  },

  deleteAccount: async (payload: { refresh_token: string }): Promise<void> => {
    await api.delete('auth/account', { json: payload });
  },
};
