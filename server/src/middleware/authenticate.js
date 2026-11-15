import { authenticateToken } from '../services/auth.service.js';
import { COOKIE_NAME } from '../utils/cookies.js';

export async function authenticate(req, res, next) {
  req.user = await authenticateToken(req.cookies?.[COOKIE_NAME]);
  next();
}