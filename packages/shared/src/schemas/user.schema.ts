import { z } from 'zod';

/**
 * User schema
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Create user schema
 */
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Update user schema
 */
export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).nullable().optional(),
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;
