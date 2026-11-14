import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const app = createApp();
const CSRF = { 'X-Requested-With': 'vault-client' };
const creds = { name: 'Alice', email: 'alice@example.com', password: 'password123' };

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: 'vault_test_register' });
  await User.init();
});
afterEach(() => User.deleteMany({}));
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const register = (body = creds) => request(app).post('/api/v1/auth/register').set(CSRF).send(body);

describe('Level 2.2 - The Gatekeeper', () => {
  it('[10 XP] valid registration returns 201 and the public user', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
    expect(res.body.user.id).toBeTruthy();
  });

  it('[10 XP] the response never contains the password or the hash', async () => {
    const res = await register();
    expect(JSON.stringify(res.body)).not.toMatch(/password|passwordHash|\$2[aby]\$/i);
  });

  it('[10 XP] sets an HttpOnly, SameSite=Strict session cookie', async () => {
    const res = await register();
    const cookie = (res.headers['set-cookie'] ?? [])[0] ?? '';
    expect(cookie).toMatch(/^vault_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('[15 XP] stores a bcrypt hash, not the password', async () => {
    await register();
    const u = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash');
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(u.passwordHash).not.toContain('password123');
  });

  it('[10 XP] normalizes the email (trim + lowercase)', async () => {
    const res = await register({ ...creds, email: '  ALICE@Example.com ' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  it('[10 XP] a duplicate email gives 409 EMAIL_TAKEN', async () => {
    await register();
    const dup = await register({ ...creds, email: 'ALICE@example.com' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('[15 XP] bad input gives 400 VALIDATION_ERROR (short password, bad email, empty or missing name)', async () => {
    const bads = [
      { ...creds, password: 'short' },
      { ...creds, email: 'not-an-email' },
      { ...creds, name: '' },
      { email: creds.email, password: creds.password },
    ];
    for (const bad of bads) {
      const res = await register(bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('[15 XP] unknown fields are rejected (mass-assignment protection)', async () => {
    const res = await register({ ...creds, role: 'admin', tokenVersion: 99 });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it('[10 XP] a request without the CSRF header is rejected with 403', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(creds);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('[20 XP] BOSS TEST: two simultaneous registrations, same email: exactly one wins', async () => {
    const results = await Promise.all([register(), register()]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(await User.countDocuments()).toBe(1);
  });
});