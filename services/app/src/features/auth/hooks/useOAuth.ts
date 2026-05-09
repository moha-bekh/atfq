import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAppStore } from '@/stores/app.store';
import type { OAuthProvider, OAuthCallbackParams } from '../types';

export function useOAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAppStore(state => state.setAuth);
  const isAuthenticated = useAppStore(state => state.isAuthenticated);

  const { data: linkedProviders, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['linkedProviders'],
    queryFn: () => authApi.getLinkedProviders(),
    enabled: isAuthenticated,
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: OAuthProvider) => authApi.unlinkProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedProviders'] });
    }
  });

  const getOAuthUrl = async (provider: OAuthProvider) => {
    try {
      const { url } = await authApi.getOAuthUrl(provider);
      window.location.href = url;
    } catch {
      navigate('/login', {
        state: { error: `Unable to start ${provider} authentication` },
      });
    }
  };

  const callbackMutation = useMutation({
    mutationFn: ({ provider, params }: { provider: OAuthProvider, params: OAuthCallbackParams }) => 
      authApi.oauthCallback(provider, params),
    onSuccess: (data) => {
      if (data.access_token && data.refresh_token && data.user) {
        const wasAuthenticated = useAppStore.getState().isAuthenticated;
        setAuth({
          user: data.user as any,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        
        // If we were already authenticated, we were likely linking, return to profile
        if (wasAuthenticated) {
          navigate('/profile');
        } else {
          navigate('/');
        }
      }
    },
    onError: async (error: any) => {
      let message = "Authentication failed";
      try {
        const errData = await error.response.json();
        message = errData.error || message;
      } catch (e) {}

      const wasAuthenticated = useAppStore.getState().isAuthenticated;
      if (wasAuthenticated) {
        // Return to profile with error in state
        navigate('/profile', { state: { error: message } });
      } else {
        navigate('/login', { state: { error: message } });
      }
    }
  });

  return {
    getOAuthUrl,
    handleCallback: callbackMutation.mutate,
    isProcessing: callbackMutation.isPending,
    unlinkProvider: unlinkMutation.mutateAsync,
    isUnlinking: unlinkMutation.isPending,
    linkedProviders: linkedProviders?.providers || [],
    isLoadingProviders
  };
}
