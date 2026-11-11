import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Shape of EVERY error response: { error: { code, message, details?, requestId } }
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found', requestId: req.id },
  });
}

// Express recognises an error handler by its 4 parameters, so keep `next` even if unused.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request';
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'MALFORMED_JSON';
    message = 'Malformed JSON body';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'BODY_TOO_LARGE';
    message = 'Request body too large';
  }

  // Unexpected errors: log details server-side, but NEVER leak them to the client.
  if (status >= 500) {
    logger.error('request.failed', { requestId: req.id, error: err.message, stack: err.stack });
  }

  res.status(status).json({
    error: { code, message, ...(details && { details }), requestId: req.id },
  });
}