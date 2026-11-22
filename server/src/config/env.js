import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.preprocess((value) => {
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}, z.boolean());

const numberString = (fallback) =>
  z.preprocess((value) => {
    if (value === undefined) return fallback;
    if (typeof value === 'number') return value;
    return Number(value);
  }, z.number().int().min(4).max(15));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: numberString(12).default(12),
  COOKIE_SECURE: booleanString.default(false),
  STORAGE_DIR: z.string().default('./storage'),
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;