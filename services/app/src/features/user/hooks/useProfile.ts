import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api';
import { useAppStore } from '@/stores/app.store';
import type { UpdateProfileRequest, UpdateThemeRequest, RoleChangeRequest } from '../types';

export const useProfile = () => {
  const user = useAppStore((state) => state.user);
  const accessToken = useAppStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => userApi.getProfile(user!.id),
    enabled: !!user?.id && !!accessToken,
  });

  const availablePermissionsQuery = useQuery({
    queryKey: ['permissions', 'available'],
    queryFn: () => userApi.listPermissions(),
    enabled: !!user?.id && !!accessToken,
  });

  const roleRequestsQuery = useQuery({
    queryKey: ['role-requests', 'me', user?.id],
    queryFn: () => userApi.listMyRoleRequests(),
    enabled: !!user?.id && !!accessToken,
  });

  const friendsQuery = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: () => userApi.listFriends(),
    enabled: !!user?.id && !!accessToken,
  });

  useEffect(() => {
    if (!user?.id || !accessToken) return;

    userApi.touchPresence().catch(() => undefined);
    const interval = window.setInterval(() => {
      userApi.touchPresence().catch(() => undefined);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [user?.id, accessToken]);

  useEffect(() => {
    if (profileQuery.data) {
      useAppStore.getState().setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => userApi.updateProfile(data),
    onSuccess: (profile) => {
      useAppStore.getState().setProfile(profile);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: (data: UpdateThemeRequest) => userApi.updateTheme(data),
    onSuccess: (profile) => {
      useAppStore.getState().setProfile(profile);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const uploadPictureMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadProfilePicture(file),
    onSuccess: (profile) => {
      useAppStore.getState().setProfile(profile);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const removePictureMutation = useMutation({
    mutationFn: () => userApi.removeProfilePicture(),
    onSuccess: (profile) => {
      useAppStore.getState().setProfile(profile);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const roleRequestMutation = useMutation({
    mutationFn: (data: RoleChangeRequest) => userApi.createRoleRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests', 'me', user?.id] });
    },
  });

  const cancelRoleRequestMutation = useMutation({
    mutationFn: (requestId: string) => userApi.cancelRoleRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-requests', 'me', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['role-requests', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['role-requests', 'history'] });
    },
  });

  const leaveRoleMutation = useMutation({
    mutationFn: (roleName: string) => userApi.leaveRole(roleName),
    onSuccess: (profile) => {
      useAppStore.getState().setProfile(profile);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: (targetId: string) => userApi.acceptFriendRequest(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (targetId: string) => userApi.sendFriendRequest(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-search'] });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (targetId: string) => userApi.removeFriend(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
    },
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
    profileError: profileQuery.error,
    availablePermissions: availablePermissionsQuery.data?.permissions ?? [],
    isPermissionsLoading: availablePermissionsQuery.isLoading,
    isPermissionsError: availablePermissionsQuery.isError,
    permissionsError: availablePermissionsQuery.error,
    roleRequests: roleRequestsQuery.data?.requests ?? [],
    friends: friendsQuery.data?.friends ?? [],
    isRoleRequestsLoading: roleRequestsQuery.isLoading,
    isRoleRequestsError: roleRequestsQuery.isError,
    isFriendsLoading: friendsQuery.isLoading,
    isFriendsError: friendsQuery.isError,
    isUploading: uploadPictureMutation.isPending,
    isRequestingRole: roleRequestMutation.isPending,
    isCancelingRoleRequest: cancelRoleRequestMutation.isPending,
    isLeavingRole: leaveRoleMutation.isPending,
    isAcceptingFriend: acceptFriendRequestMutation.isPending,
    isSendingFriendRequest: sendFriendRequestMutation.isPending,
    isRemovingFriend: removeFriendMutation.isPending,
    uploadError: uploadPictureMutation.error,
    updateProfile: updateProfileMutation.mutateAsync,
    updateTheme: updateThemeMutation.mutateAsync,
    uploadPicture: uploadPictureMutation.mutateAsync,
    removePicture: removePictureMutation.mutateAsync,
    requestRole: roleRequestMutation.mutateAsync,
    cancelRoleRequest: cancelRoleRequestMutation.mutateAsync,
    leaveRole: leaveRoleMutation.mutateAsync,
    sendFriendRequest: sendFriendRequestMutation.mutateAsync,
    acceptFriendRequest: acceptFriendRequestMutation.mutateAsync,
    removeFriend: removeFriendMutation.mutateAsync,
    deleteProfile: deleteProfileMutation.mutateAsync,
  };
};
