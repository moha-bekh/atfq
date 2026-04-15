import type { components } from '@/api/v1';

// On récupère les types générés par OpenAPI quand ils existent
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type RegisterResponse = components["schemas"]["RegisterResponse"];

// Les types suivants ne sont pas encore dans OpenAPI (basés sur les Protos)
export type User = {
  id: string;
  username: string;
  email: string;
};

export type AuthSuccess = {
  access_token: string;
  refresh_token: string;
  user: User;
};

export type MfaRequired = {
  mfa_token: string;
  preferred_method: 'METHOD_TOTP' | 'METHOD_SMS';
};

export type AuthResponse = {
  success?: AuthSuccess;
  mfa_required?: MfaRequired;
};

export type LoginRequest = {
  identifier: {
    email?: string;
    username?: string;
  };
  password: string;
};
