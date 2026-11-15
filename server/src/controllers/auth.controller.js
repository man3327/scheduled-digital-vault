import * as authService from '../services/auth.service.js';
import { COOKIE_NAME, cookieOptions, clearCookieOptions } from '../utils/cookies.js';

export async function register(req, res) {
  const user = await authService.registerUser(req.body);
  res.cookie(COOKIE_NAME, authService.signToken(user), cookieOptions());
  res.status(201).json({ user: user.toPublic() });
}

export async function login(req, res) {
  const user = await authService.verifyCredentials(req.body);
  res.cookie(COOKIE_NAME, authService.signToken(user), cookieOptions());
  res.json({ user: user.toPublic() });
}

export async function logout(req, res) {
  await authService.revokeAllTokens(req.user._id);
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ user: req.user.toPublic() });
}