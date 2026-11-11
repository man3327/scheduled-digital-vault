// Runs before any test. It sets env vars BEFORE the app imports config/env.js.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';