import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

await connectDatabase();

const server = createApp().listen(env.PORT, () => {
  logger.info('api.listening', { port: env.PORT });
});

// Graceful shutdown: finish in-flight requests, then close the DB.
async function shutdown(signal) {
  logger.info('api.stopping', { signal });
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));