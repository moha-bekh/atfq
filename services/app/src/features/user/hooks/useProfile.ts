import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api';
import { useAppStore } from '@/stores/app.store';
import type { UpdateProfileRequest, UpdateThemeRequest, RoleChangeRequest } from '../types';

export const useProfile = () => {
  const user = useAppStore((state) => state.user);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => userApi.getProfile(user!.id),
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: (data: UpdateThemeRequest) => userApi.updateTheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const uploadPictureMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadProfilePicture(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const removePictureMutation = useMutation({
    mutationFn: () => userApi.removeProfilePicture(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const roleRequestMutation = useMutation({
    mutationFn: (data: RoleChangeRequest) => userApi.createRoleRequest(data),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: () => userApi.deleteProfile(),
    onSuccess: () => {
      useAppStore.getState().logout();
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    isUploading: uploadPictureMutation.isPending,
    uploadError: uploadPictureMutation.error,
    updateProfile: updateProfileMutation.mutateAsync,
    updateTheme: updateThemeMutation.mutateAsync,
    uploadPicture: uploadPictureMutation.mutateAsync,
    removePicture: removePictureMutation.mutateAsync,
    requestRole: roleRequestMutation.mutateAsync,
    deleteProfile: deleteProfileMutation.mutateAsync,
  };
};
