import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { requestId } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(helmet()); // secure HTTP headers
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  // Health check: is the process up, and can it reach the database?
  app.get('/health', (req, res) => {
    const dbUp = mongoose.connection.readyState === 1; // 1 = connected
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  });

  // Order matters: these two must stay LAST.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}