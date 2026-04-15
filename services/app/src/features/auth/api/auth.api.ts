import { api } from '@/api/client';
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types';

export const authApi = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    return await api.post('auth/register', { json: payload }).json<RegisterResponse>();
  },

  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    return await api.post('auth/login', { json: payload }).json<LoginResponse>();
  },
};
