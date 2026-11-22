import os from 'node:os';
import path from 'node:path';

// Runs before any test, so env vars exist BEFORE config/env.js is imported.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing in tests only
process.env.STORAGE_DIR = path.join(os.tmpdir(), 'vault-test-storage'); // keep test files out of your project