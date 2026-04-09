import type * as grpc from '@grpc/grpc-js';

export interface GrpcError {
  code: grpc.status;
  details: string;
}

export type GrpcCallback<T> = (error: GrpcError | null, response?: T) => void;

export interface GrpcCall<T> {
  request: T;
}

// ── Request types (matching proto messages) ──────────────────────────────────

export interface Empty {}

export interface UserRequest {
  id: string;
}

export interface ThemeRequest {
  id: string;
}

export interface CreateUserRequest {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

export interface UsernameRequest {
  username: string;
}

export interface EmailRequest {
  email: string;
}

export interface RoleRequest {
  user_id: string;
  role_id: string;
}

export interface UpdateUserRequest {
  id: string;
  firstname?: string;
  lastname?: string;
  profile_picture?: string;
  language?: string;
}

export interface CreateThemeRequest {
  user_id: string;
  name: string;
  color_bg: string;
  color_main: string;
  color_caret: string;
  color_text: string;
  color_sub: string;
  color_sub_alt: string;
  color_error: string;
  color_extra_error: string;
}

export interface UpdateThemeRequest {
  id: string;
  user_id: string;
  name?: string;
  color_bg?: string;
  color_main?: string;
  color_caret?: string;
  color_text?: string;
  color_sub?: string;
  color_sub_alt?: string;
  color_error?: string;
  color_extra_error?: string;
}

export interface DeleteThemeRequest {
  id: string;
  user_id: string;
}

export interface SetActiveThemeRequest {
  user_id: string;
  theme_id: string;
}

// ── Response types (matching proto messages) ─────────────────────────────────

export interface ThemeResponse {
  id: string;
  user_id: string;
  name: string;
  color_bg: string;
  color_main: string;
  color_caret: string;
  color_text: string;
  color_sub: string;
  color_sub_alt: string;
  color_error: string;
  color_extra_error: string;
}

export interface ThemeListResponse {
  themes: ThemeResponse[];
}

export interface ProfileResponse {
  id: string;
  profile_picture: string;
  language: string;
  active_theme?: ThemeResponse | null;
}

export interface UserResponse {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  profile: ProfileResponse | null;
  roles: string[];
  permissions: string[];
}

export interface UserListResponse {
  users: UserResponse[];
}
