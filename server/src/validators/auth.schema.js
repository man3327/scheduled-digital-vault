import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);

export const registerBody = z.strictObject({
  name: z.string().trim().min(1).max(80),
  email,
  password: z.string().min(8).max(128),
});
export const loginBody = z.strictObject({
  email,
  password: z.string().min(1).max(128),
});