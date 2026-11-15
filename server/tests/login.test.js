import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const app = createApp();
const CSRF = { 'X-Requested-With': 'vault-client' };
const creds = { name: 'Alice', email: 'alice@example.com', password: 'password123' };

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: 'vault_test_login' });
  await User.init();
});
afterEach(() => User.deleteMany({}));
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const register = () => request(app).post('/api/v1/auth/register').set(CSRF).send(creds);
const login = (body = { email: creds.email, password: creds.password }) =>
  request(app).post('/api/v1/auth/login').set(CSRF).send(body);
const logout = (cookie) => request(app).post('/api/v1/auth/logout').set(CSRF).set('Cookie', cookie);
const me = (cookie) => {
  const r = request(app).get('/api/v1/auth/me');
  return cookie ? r.set('Cookie', cookie) : r;
};

describe('Level 2.3 - The Bouncer', () => {
  it('[10 XP] login with correct credentials returns 200 and the public user', async () => {
    await register();
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
  });

  it('[10 XP] login sets an HttpOnly, SameSite=Strict session cookie', async () => {
    await register();
    const res = await login();
    const cookie = (res.headers['set-cookie'] ?? [])[0] ?? '';
    expect(cookie).toMatch(/^vault_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('[15 XP] login response never contains the password or the hash', async () => {
    await register();
    const res = await login();
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/password|passwordHash|\$2[aby]\$/i);
  });

  it('[10 XP] wrong password gives 401 UNAUTHENTICATED', async () => {
    await register();
    const res = await login({ email: creds.email, password: 'wrongwrong1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('[15 XP] unknown email and wrong password give the IDENTICAL message', async () => {
    await register();
    const wrongPw = await login({ email: creds.email, password: 'wrongwrong1' });
    const noUser = await login({ email: 'ghost@example.com', password: 'whatever123' });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(noUser.body.error.message).toBe(wrongPw.body.error.message);
  });

  it('[10 XP] a short wrong password is a 401, not a 400 (do not reveal the password policy)', async () => {
    await register();
    const res = await login({ email: creds.email, password: 'x' });
    expect(res.status).toBe(401);
  });

  it('[10 XP] /me without a cookie gives 401', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('[10 XP] /me with a valid cookie returns the user', async () => {
    const reg = await register();
    const res = await me(reg.headers['set-cookie']);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('alice@example.com');
  });

  it('[10 XP] a tampered token is rejected', async () => {
    const res = await me('vault_token=abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('[15 XP] logout revokes the old cookie', async () => {
    const reg = await register();
    const oldCookie = reg.headers['set-cookie'];
    expect((await logout(oldCookie)).status).toBe(200);
    expect((await me(oldCookie)).status).toBe(401);
  });

  it('[10 XP] logout tells the browser to clear the cookie', async () => {
    const reg = await register();
    const res = await logout(reg.headers['set-cookie']);
    const cookie = (res.headers['set-cookie'] ?? [])[0] ?? '';
    expect(cookie).toMatch(/^vault_token=;/);
  });

  it('[20 XP] BOSS: log in again after a logout, and the NEW session can be revoked too', async () => {
    const reg = await register();
    const cookie0 = reg.headers['set-cookie'];
    await logout(cookie0);

    const second = await login();
    const cookie1 = second.headers['set-cookie'];
    expect((await me(cookie1)).status).toBe(200); // the new session works

    await logout(cookie1);
    expect((await me(cookie1)).status).toBe(401); // and dies on logout
    expect((await me(cookie0)).status).toBe(401); // the first one stays dead
  });
});