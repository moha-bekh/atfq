import type { components } from '@/api/v1';

export type Profile = components["schemas"]["ProfileResponse"];
export type Theme = components["schemas"]["ThemeSchema"];
export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"];
export type UpdateThemeRequest = components["schemas"]["UpdateThemeRequest"];
export type RoleChangeRequest = components["schemas"]["RoleChangeRequest"];
export type ReviewRoleRequest = components["schemas"]["ReviewRoleRequest"];
