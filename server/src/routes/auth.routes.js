import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { registerBody } from '../validators/auth.schema.js';
const router = Router();
router.post('/register', authLimiter, validate({ body: registerBody }), ctrl.register);

export default router;