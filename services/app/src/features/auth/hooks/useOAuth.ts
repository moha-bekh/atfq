import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAppStore } from '@/stores/app.store';
import type { OAuthProvider, OAuthCallbackParams } from '../types';

export function useOAuth() {
  const navigate = useNavigate();
  const setAuth = useAppStore(state => state.setAuth);

  const getOAuthUrl = async (provider: OAuthProvider) => {
    try {
      const { url } = await authApi.getOAuthUrl(provider);
      window.location.href = url;
    } catch (error) {
      console.error(`Failed to get ${provider} OAuth URL:`, error);
    }
  };

  const callbackMutation = useMutation({
    mutationFn: ({ provider, params }: { provider: OAuthProvider, params: OAuthCallbackParams }) => 
      authApi.oauthCallback(provider, params),
    onSuccess: (data) => {
      if (data.access_token && data.refresh_token && data.user) {
        setAuth({
          user: data.user as any,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        navigate('/');
      }
    },
    onError: (error: any) => {
      console.error("OAuth Callback Failed:", error);
      navigate('/login');
    }
  });

  return {
    getOAuthUrl,
    handleCallback: callbackMutation.mutate,
    isProcessing: callbackMutation.isPending
  };
}
