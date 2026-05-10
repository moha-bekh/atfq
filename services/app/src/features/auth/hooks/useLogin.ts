import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api';
import { useAppStore } from '@/stores/app.store';
import type { LoginRequest } from '../types';
import type { HTTPError } from 'ky';

export function useLogin(onMfaRequired?: (id: string) => void) {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAppStore(state => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data: any) => {
      if (data.access_token && data.refresh_token && data.user) {
        setAuth({
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        
        // Redirige vers la page d'où l'utilisateur venait, ou par défaut vers /wiki
        const from = (location.state as any)?.from?.pathname || '/wiki';
        navigate(from, { replace: true });
      } else if (data.status === "MFA_REQUIRED") {
        if (onMfaRequired && data.mfa_login_id) {
          onMfaRequired(data.mfa_login_id);
        } else if (onMfaRequired) {
          // Fallback if the backend uses a different field name for the ID
          onMfaRequired(data.login_request_id || "pending");
        }
      }
    },
    onError: async (error: Error | HTTPError) => {
      if (!('response' in error)) {
        error.message = error.message || "Authentication failed";
        return;
      }

      try {
        const errorData = await error.response.json() as any;
        // On attache le message d'erreur du backend à l'objet error pour React Query
        error.message = errorData.error || "Authentication failed";
      } catch (e) {
        error.message = "An unexpected error occurred";
      }
    }
  });
}
