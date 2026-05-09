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

export type Friendship = {
  user_id: string;
  friend_id: string;
  requester_id: string;
  addressee_id: string;
  friend_username?: string | null;
  friend_email?: string | null;
  profile_picture_url?: string | null;
  status: 'pending' | 'accepted' | string;
  can_accept: boolean;
  is_online: boolean;
  last_seen_at?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
};

export type FriendListResponse = {
  friends: Friendship[];
};

export type UserSearchResult = {
  id: string;
  username: string;
  email: string;
  profile_picture_url?: string | null;
  friendship_status?: string | null;
  is_friend: boolean;
  is_online: boolean;
};

export type UserSearchResponse = {
  users: UserSearchResult[];
};
