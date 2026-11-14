import { env } from '../config/env.js';

export const COOKIE_NAME = 'vault_token';

const base = {
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  secure: env.COOKIE_SECURE, // true in production (HTTPS only)
  sameSite: 'strict', // the browser won't send it on cross-site requests
  path: '/',
};

export const cookieOptions = () => ({ ...base, maxAge: 24 * 60 * 60 * 1000 });
export const clearCookieOptions = () => base;