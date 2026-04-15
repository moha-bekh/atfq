import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../stores/auth.store'; // Import du store
import type { LoginRequest } from '../types';

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth); // On récupère l'action du store

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data: any) => {
      // Les données sont maintenant à plat dans la réponse du Gateway
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
    onError: (error: any) => {
      console.error("Login Failed:", error);
    }
  });
}
