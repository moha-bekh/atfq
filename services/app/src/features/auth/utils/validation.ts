import { z } from 'zod';

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be max 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores allowed");

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number");

export const getPasswordValidationMessage = (password: string) => {
  const result = passwordSchema.safeParse(password);

  if (result.success) return null;

  return result.error.issues[0]?.message ?? "Invalid password";
};

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Username/Email must be at least 3 characters"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const profileUsernameSchema = z.object({
  username: usernameSchema,
});

export const profileEmailSchema = z.object({
  newEmail: emailSchema,
});

export const profilePasswordSchema = (hasCurrentPassword: boolean) => z.object({
  currentPassword: hasCurrentPassword
    ? z.string().min(1, "Current password is required")
    : z.string().optional(),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUsernameInput = z.infer<typeof profileUsernameSchema>;
export type ProfileEmailInput = z.infer<typeof profileEmailSchema>;
export type ProfilePasswordInput = z.infer<ReturnType<typeof profilePasswordSchema>>;
