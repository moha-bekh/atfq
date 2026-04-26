import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthSuccess } from '../types';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data: AuthSuccess) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (data) => 
        set({ 
          user: data.user, 
          accessToken: data.access_token, 
          refreshToken: data.refresh_token, 
          isAuthenticated: true 
        }),
      logout: async () => {
        const { accessToken, refreshToken } = get();
        
        try {
          if (accessToken && refreshToken) {
            await authApi.logout(accessToken, refreshToken);
          }
        } catch (error) {
          console.error('Failed to logout on server:', error);
        } finally {
          set({ 
            user: null, 
            accessToken: null, 
            refreshToken: null, 
            isAuthenticated: false 
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
