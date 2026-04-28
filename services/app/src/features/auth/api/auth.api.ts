import { api } from '@/api/client';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  OAuthProvider,
  OAuthUrlResponse,
  OAuthCallbackParams
} from '../types';

export const authApi = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    return await api.post('auth/register', { json: payload }).json<RegisterResponse>();
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
};
