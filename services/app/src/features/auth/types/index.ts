import type { components } from '@/api/v1';

// On récupère les types générés par OpenAPI quand ils existent
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type RegisterResponse = components["schemas"]["RegisterResponse"];

// Les types suivants ne sont pas encore dans OpenAPI (basés sur les Protos)
export type User = {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  status: string;
  access_token?: string;
  refresh_token?: string;
  user?: User;
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
