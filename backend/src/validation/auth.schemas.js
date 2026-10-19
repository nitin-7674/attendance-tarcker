const { z } = require('zod');

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z
  .string()
  .min(10, 'Password must contain at least 10 characters.')
  .max(128, 'Password must contain at most 128 characters.');

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .transform((input) => ({
    name: input.name,
    email: input.email,
    password: input.password,
  }));

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

module.exports = { loginSchema, registerSchema };
