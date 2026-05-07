import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAppStore } from '@/stores/app.store';
import type { 
  UpdateEmailRequest, 
  UpdateUsernameRequest, 
  UpdatePasswordRequest,
  DeleteAccountRequest
} from '../types';

export const useAuthManagement = () => {
  const { setUser, logout } = useAppStore();

  const updateEmailMutation = useMutation({
    mutationFn: (data: UpdateEmailRequest) => authApi.updateEmail(data),
    onSuccess: (_, variables) => {
      const user = useAppStore.getState().user;
      if (user) {
        setUser({ ...user, email: variables.new_email });
      }
    },
  });

  const updateUsernameMutation = useMutation({
    mutationFn: (data: UpdateUsernameRequest) => authApi.updateUsername(data),
    onSuccess: (_, variables) => {
      const user = useAppStore.getState().user;
      if (user) {
        setUser({ ...user, username: variables.new_username });
      }
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: UpdatePasswordRequest) => authApi.updatePassword(data),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (data: DeleteAccountRequest) => authApi.deleteAccount(data),
    onSuccess: () => {
      logout();
    },
  });

  const enableMfaMutation = useMutation({
    mutationFn: (method: 'TOTP' | 'SMS') => authApi.enableMfa({ method }),
  });

  const disableMfaMutation = useMutation({
    mutationFn: () => authApi.disableMfa(),
  });

  return {
    updateEmail: updateEmailMutation.mutateAsync,
    isUpdatingEmail: updateEmailMutation.isPending,
    updateUsername: updateUsernameMutation.mutateAsync,
    isUpdatingUsername: updateUsernameMutation.isPending,
    updatePassword: updatePasswordMutation.mutateAsync,
    isUpdatingPassword: updatePasswordMutation.isPending,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isDeletingAccount: deleteAccountMutation.isPending,
    enableMfa: enableMfaMutation.mutateAsync,
    isEnablingMfa: enableMfaMutation.isPending,
    disableMfa: disableMfaMutation.mutateAsync,
    isDisablingMfa: disableMfaMutation.isPending,
  };
};
