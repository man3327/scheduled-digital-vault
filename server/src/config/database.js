import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  logger.info('mongo.connected');
}

export const disconnectDatabase = () => mongoose.disconnect();