import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../stores/auth.store';
import type { RegisterInput } from '../utils/validation';

export function useRegister() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  return useMutation({
    mutationFn: (payload: RegisterInput) => {
      // On extrait confirmPassword pour ne pas l'envoyer au backend
      const { confirmPassword, ...registerData } = payload;
      return authApi.register(registerData);
    },
    onSuccess: (data: any) => {
      if (data.access_token) {
        setAuth({
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        navigate('/wiki');
      } else {
        navigate('/login');
      }
    },
    onError: (error: any) => {
      console.error("Registration Failed:", error);
    }
  });
}
