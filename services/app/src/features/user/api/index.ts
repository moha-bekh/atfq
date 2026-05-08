import { api } from '@/api/client';
import type { 
  Profile, 
  UpdateProfileRequest, 
  UpdateThemeRequest, 
  RoleChangeRequest,
  ReviewRoleRequest,
  RoleRequestsListResponse,
} from '../types';

export const userApi = {
  getProfile: async (id: string): Promise<Profile> => {
    return await api.get(`user/profile/${id}`).json();
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<Profile> => {
    return await api.put('user/profile', { json: data }).json();
  },

  updateTheme: async (data: UpdateThemeRequest): Promise<Profile> => {
    return await api.put('user/profile/theme', { json: data }).json();
  },

  uploadProfilePicture: async (file: File): Promise<Profile> => {
    const formData = new FormData();
    formData.append('image', file);
    return await api.post('user/profile/picture', { body: formData }).json();
  },

  removeProfilePicture: async (): Promise<Profile> => {
    return await api.delete('user/profile/picture').json();
  },

  createRoleRequest: async (data: RoleChangeRequest): Promise<{ request_id: string; status: string }> => {
    return await api.post('user/role-requests', { json: data }).json();
  },

  listRoleRequests: async (): Promise<RoleRequestsListResponse> => {
    return await api.get('user/role-requests').json();
  },

  listAllRoleRequests: async (): Promise<RoleRequestsListResponse> => {
    return await api.get('user/role-requests/history').json();
  },

  listMyRoleRequests: async (): Promise<RoleRequestsListResponse> => {
    return await api.get('user/role-requests/me').json();
  },

  reviewRoleRequest: async (data: ReviewRoleRequest): Promise<Profile> => {
    return await api.post('user/role-requests/review', { json: data }).json();
  },

  cancelRoleRequest: async (requestId: string): Promise<{ request_id: string; status: string }> => {
    return await api.delete(`user/role-requests/${requestId}`).json();
  },

  leaveRole: async (roleName: string): Promise<Profile> => {
    return await api.delete(`user/profile/roles/${roleName}`).json();
  },

  deleteProfile: async (): Promise<void> => {
    await api.delete('user/profile');
  },

  listPermissions: async (): Promise<{ permissions: string[] }> => {
    return await api.get('user/permissions').json();
  }
};
