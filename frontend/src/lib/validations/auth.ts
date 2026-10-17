import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

/** An admin adding someone from /admin. Sign-up is invite-only. */
export const inviteUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  role: z.enum(['user', 'admin']),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
