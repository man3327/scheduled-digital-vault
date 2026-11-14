import { forbidden } from '../utils/errors.js';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get('x-requested-with') !== 'vault-client') {
    throw forbidden('Missing CSRF header', 'CSRF_REJECTED');
  }
  next();
}