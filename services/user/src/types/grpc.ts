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
  dark_theme?: boolean;
  language?: string;
}

// ── Response types (matching proto messages) ─────────────────────────────────

export interface ProfileResponse {
  id: string;
  profile_picture: string;
  dark_theme: boolean;
  language: string;
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
