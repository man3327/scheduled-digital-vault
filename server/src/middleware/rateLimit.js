import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs, limit) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test', // never throttle automated tests
    handler: (req, res) =>
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.', requestId: req.id },
      }),
  });

// 30 attempts per IP per 15 minutes: slows down password guessing
export const authLimiter = make(15 * 60 * 1000, 30);