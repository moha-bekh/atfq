import type { components } from '@/api/v1';

export type Profile = components["schemas"]["ProfileResponse"];
export type Theme = components["schemas"]["ThemeSchema"];
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"];
export type UpdateThemeRequest = components["schemas"]["UpdateThemeRequest"];
export type RoleChangeRequest = components["schemas"]["RoleChangeRequest"];
export type ReviewRoleRequest = components["schemas"]["ReviewRoleRequest"];
export type RoleRequestEntry = components["schemas"]["RoleRequestEntry"];
export type RoleRequestHistoryEntry = RoleRequestEntry & {
  status?: 'pending' | 'approved' | 'rejected' | 'canceled' | string;
  rejection_reason?: string | null;
  updated_at?: string | null;
  user_username?: string | null;
  user_email?: string | null;
};
export type RoleRequestsListResponse = {
  requests: RoleRequestHistoryEntry[];
};
