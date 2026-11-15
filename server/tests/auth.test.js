import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const app = createApp();
const CSRF = { 'X-Requested-With': 'vault-client' };
const creds = { name: 'Alice', email: 'alice@example.com', password: 'password123' };
const SECRET = process.env.JWT_SECRET;

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: 'vault_test_boss_auth' });
  await User.init();
});
afterEach(() => User.deleteMany({}));
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const register = () => request(app).post('/api/v1/auth/register').set(CSRF).send(creds);
const login = (body) => request(app).post('/api/v1/auth/login').set(CSRF).send(body);
const logout = (cookie) => request(app).post('/api/v1/auth/logout').set(CSRF).set('Cookie', cookie);
const meWithToken = (token) => request(app).get('/api/v1/auth/me').set('Cookie', `vault_token=${token}`);
const meWithCookie = (cookie) => request(app).get('/api/v1/auth/me').set('Cookie', cookie);

describe('Level 2.4 - BOSS: The Impersonator', () => {
  it('[20 XP] ATTACK 1: NoSQL injection in the email field is rejected', async () => {
    await register();
    const res = await login({ email: { $ne: null }, password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('[20 XP] ATTACK 2: NoSQL injection in the password field is rejected', async () => {
    await register();
    const res = await login({ email: creds.email, password: { $ne: '' } });
    expect(res.status).toBe(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('[15 XP] ATTACK 3: a token signed with the WRONG secret is rejected', async () => {
    const reg = await register();
    const token = jwt.sign({ sub: reg.body.user.id, tv: 0 }, 'a-different-secret-a-different-secret-12', { expiresIn: '1h' });
    expect((await meWithToken(token)).status).toBe(401);
  });

  it('[15 XP] ATTACK 4: an unsigned token (alg "none") is rejected', async () => {
    const reg = await register();
    const token = jwt.sign({ sub: reg.body.user.id, tv: 0 }, '', { algorithm: 'none' });
    expect((await meWithToken(token)).status).toBe(401);
  });

  it('[15 XP] ATTACK 5: an EXPIRED token is rejected', async () => {
    const reg = await register();
    const token = jwt.sign({ sub: reg.body.user.id, tv: 0 }, SECRET, { expiresIn: -10 });
    expect((await meWithToken(token)).status).toBe(401);
  });

  it('[15 XP] ATTACK 6: a valid token for a user who no longer exists is rejected', async () => {
    const reg = await register();
    const cookie = reg.headers['set-cookie'];
    expect((await meWithCookie(cookie)).status).toBe(200);
    await User.deleteMany({});
    expect((await meWithCookie(cookie)).status).toBe(401);
  });

  it('[20 XP] ATTACK 7: a token claiming a FUTURE tokenVersion is rejected (exact match required)', async () => {
    const reg = await register();
    const token = jwt.sign({ sub: reg.body.user.id, tv: 5 }, SECRET, { expiresIn: '1h' });
    expect((await meWithToken(token)).status).toBe(401);
  });

  it('[15 XP] ATTACK 8: replaying an old cookie after logout AND a fresh login still fails', async () => {
    const reg = await register();
    const oldCookie = reg.headers['set-cookie'];
    await logout(oldCookie);
    const fresh = await login({ email: creds.email, password: creds.password });
    const newCookie = fresh.headers['set-cookie'];
    expect((await meWithCookie(newCookie)).status).toBe(200);
    expect((await meWithCookie(oldCookie)).status).toBe(401);
  });

  it('[20 XP] ATTACK 9: two simultaneous logouts with the same cookie leave the account safe and usable', async () => {
    const reg = await register();
    const cookie = reg.headers['set-cookie'];
    const results = await Promise.all([logout(cookie), logout(cookie)]);
    for (const r of results) expect([200, 401]).toContain(r.status);
    expect((await meWithCookie(cookie)).status).toBe(401);
    const again = await login({ email: creds.email, password: creds.password });
    expect(again.status).toBe(200);
    expect((await meWithCookie(again.headers['set-cookie'])).status).toBe(200);
  });

  it('[10 XP] ATTACK 10: unknown fields in the login body are rejected', async () => {
    await register();
    const res = await login({ email: creds.email, password: creds.password, role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('[10 XP] ATTACK 11: login treats email case-insensitively (no duplicate-identity tricks)', async () => {
    await register();
    const res = await login({ email: 'ALICE@Example.COM', password: creds.password });
    expect(res.status).toBe(200);
  });

  it('[10 XP] ATTACK 12: a gigantic password is refused quickly instead of burning CPU', async () => {
    await register();
    const start = Date.now();
    const res = await login({ email: creds.email, password: 'x'.repeat(90000) });
    expect(res.status).toBe(400);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});