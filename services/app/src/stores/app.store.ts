import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthSuccess } from '@/features/auth/types';
import type { Profile, Theme } from '@/features/user/types';
import { authApi } from '@/features/auth/api';
import { userApi } from '@/features/user/api';

interface AppState {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Profile & Roles
  profile: Profile | null;
  roles: string[];
  permissions: string[];
  
  // Settings & Theme
  theme: string;
  font: string;
  displayFont: string;
  customColors: Record<string, string>;

  // Actions
  setAuth: (data: AuthSuccess) => void;
  setUser: (user: User) => void;
  setProfile: (profile: Profile) => void;
  updateTheme: (themeUpdate: Partial<Theme>) => void;
  setCustomColor: (key: string, color: string) => void;
  resetCustomColors: () => void;
  
  // Initialization & Auth Actions
  initApp: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  applyTheme: () => void;
}

type HttpLikeError = {
  status?: number;
};

const DEFAULT_COLORS = {
  'bg': '#7766BD',
  'main': '#F4EFFA',
  'caret': '#F4EFFA',
  'text': '#F4EFFA',
  'sub': '#4B3A91',
  'sub-alt': '#4B3A91',
  'error': '#00F5FF',
  'extra-error': '#20C2CC',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      profile: null,
      roles: [],
      permissions: [],
      
      theme: 'base',
      font: 'Plus Jakarta Sans',
      displayFont: 'Bricolage Grotesque',
      customColors: DEFAULT_COLORS,

      setAuth: (data) => {
        set({ 
          user: data.user, 
          accessToken: data.access_token, 
          refreshToken: data.refresh_token, 
          isAuthenticated: true 
        });
        get().refreshProfile();
      },

      setUser: (user) => {
        set({ user });
      },

      setProfile: (profile) => {
        set({ 
          profile,
          roles: profile.roles || [],
          permissions: profile.permissions || [],
        });
        
        if (profile.theme) {
          set({
            theme: profile.theme.name,
            font: profile.theme.font_main,
            displayFont: profile.theme.font_display || 'Bricolage Grotesque',
            customColors: profile.theme.colors || DEFAULT_COLORS
          });
          get().applyTheme();
        }
      },

      updateTheme: (themeUpdate) => {
        set((state) => ({
          theme: themeUpdate.name || state.theme,
          font: themeUpdate.font_main || state.font,
          displayFont: themeUpdate.font_display || state.displayFont,
          customColors: themeUpdate.colors ? { ...state.customColors, ...themeUpdate.colors } : state.customColors
        }));
        get().applyTheme();
      },

      setCustomColor: (key, color) => {
        set((state) => ({
          customColors: { ...state.customColors, [key]: color }
        }));
        get().applyTheme();
      },

      resetCustomColors: () => {
        set({ customColors: DEFAULT_COLORS });
        get().applyTheme();
      },

      initApp: async () => {
        const { isAuthenticated, accessToken, refreshToken } = get();

        if (isAuthenticated && (!accessToken || !refreshToken)) {
          await get().logout();
          get().applyTheme();
          return;
        }

        if (isAuthenticated) {
          await get().refreshProfile();
        }
        get().applyTheme();
      },

      refreshProfile: async () => {
        const user = get().user;
        if (!user) return;
        
        try {
          const profile = await userApi.getProfile(user.id);
          get().setProfile(profile);
        } catch (error) {
          // If profile fetch fails due to auth, we might want to logout
          if ((error as HttpLikeError).status === 401) {
            get().logout();
          }
        }
      },

      logout: async () => {
        const { accessToken, refreshToken } = get();
        try {
          if (accessToken && refreshToken) {
            await authApi.logout(accessToken, refreshToken);
          }
        } catch {
        } finally {
          set({ 
            user: null, 
            accessToken: null, 
            refreshToken: null, 
            isAuthenticated: false,
            profile: null,
            roles: [],
            permissions: [],
            theme: 'base',
            font: 'Plus Jakarta Sans',
            displayFont: 'Bricolage Grotesque',
            customColors: DEFAULT_COLORS
          });
          get().applyTheme();
        }
      },

      applyTheme: () => {
        const { theme, font, displayFont, customColors } = get();
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.setProperty('--font-main', font);
        document.documentElement.style.setProperty('--font-display', displayFont);
        
        if (theme === 'custom') {
          Object.entries(customColors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--color-${key}`, value);
          });
        } else {
          Object.keys(DEFAULT_COLORS).forEach(key => {
            document.documentElement.style.removeProperty(`--color-${key}`);
          });
        }
      }
    }),
    {
      name: 'atfq-app-storage',
      storage: createJSONStorage(() => localStorage),
      // We don't want to persist the profile picture or other heavy data if not needed, 
      // but for now we persist everything for simplicity as requested.
    }
  )
);
