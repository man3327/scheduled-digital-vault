import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { registerBody, loginBody } from '../validators/auth.schema.js';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerBody }), ctrl.register);
router.post('/login', authLimiter, validate({ body: loginBody }), ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export default router;