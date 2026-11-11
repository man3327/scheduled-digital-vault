// Errors we throw on purpose. The error handler turns these into clean JSON responses.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message = 'Bad request', code = 'BAD_REQUEST', details) =>
  new AppError(400, code, message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have permission', code = 'FORBIDDEN') =>
  new AppError(403, code, message);
export const notFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);