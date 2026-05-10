import type { components } from '@/api/v1';

// On récupère les types générés par OpenAPI quand ils existent
export type RegisterRequest = components["schemas"]["RegisterRequest"];

// Les types suivants ne sont pas encore dans OpenAPI (basés sur les Protos)
export type User = {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  has_password: boolean;
  mfa_enabled: boolean;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  status: string;
  access_token?: string | null;
  refresh_token?: string | null;
  mfa_login_id?: string | null;
  user?: User | null;
};

export type AuthSuccess = {
  access_token: string;
  refresh_token: string;
  user: User;
};

export type LogoutRequest = {
  access_token: string;
  refresh_token: string;
};

// OAuth Types
export type OAuthProvider = 'google' | 'github';

export type OAuthUrlResponse = {
  url: string;
};

export type OAuthCallbackParams = {
  code: string;
  state: string;
};

// MFA Types
export type MfaMethod = 'TOTP' | 'SMS';

export type EnableMfaRequest = {
  method: MfaMethod;
};

export type EnableMfaResponse = {
  secret_base32: string;
};

export type VerifyMfaRequest = {
  login_request_id: string;
  code: string;
};

// Account Management Types
export type UpdateEmailRequest = {
  new_email: string;
};

export type UpdateUsernameRequest = {
  new_username: string;
};

export type UpdatePasswordRequest = {
  old_password: string;
  new_password: string;
};

export type DeleteAccountRequest = {
  refresh_token: string;
};

export type RefreshRequest = {
  refresh_token: string;
};
