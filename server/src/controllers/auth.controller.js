import * as authService from '../services/auth.service.js';
import { COOKIE_NAME, cookieOptions } from '../utils/cookies.js';

export async function register(req, res) {
    const user = await authService.register(req.body);
    const token = authService.signToken(user);
   // res.cookie(COOKIE_NAME, token, cookieOptions());
    res.status(201).json({ user: authService.toPublic(user) });
}