import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be max 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores allowed"),
  
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
