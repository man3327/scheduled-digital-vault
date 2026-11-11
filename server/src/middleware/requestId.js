import { randomUUID } from 'node:crypto';

// Gives every request a unique id: returned in a header and inside error bodies,
// so you can match a user's error report to your server logs.
export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}