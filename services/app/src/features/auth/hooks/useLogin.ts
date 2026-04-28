import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../stores/auth.store';
import type { LoginRequest } from '../types';
import type { HTTPError } from 'ky';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data: any) => {
      if (data.access_token) {
        setAuth({
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        navigate('/wiki');
      } else if (data.status === "MFA_REQUIRED") {
        console.log("MFA required");
      }
    },
    onError: async (error: HTTPError) => {
      try {
        const errorData = await error.response.json();
        // On attache le message d'erreur du backend à l'objet error pour React Query
        error.message = errorData.error || "Authentication failed";
      } catch (e) {
        error.message = "An unexpected error occurred";
      }
    }
  });
}
