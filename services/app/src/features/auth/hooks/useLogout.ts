import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutAction = useAuthStore((state) => state.logout);

  const logout = async () => {
    // clear Zustand store (calls API if tokens exist)
    await logoutAction();

    // clear React Query cache
    queryClient.clear();

    navigate('/', { replace: true });
  };

  return { logout };
}
