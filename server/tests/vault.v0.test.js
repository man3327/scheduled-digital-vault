import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Vault } from '../src/models/Vault.js';

const app = createApp();
const CSRF = { 'X-Requested-With': 'vault-client' };
let counter = 0;

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: 'vault_test_v0' });
  await Promise.all([User.init(), Vault.init()]);
});
afterEach(() => Promise.all([User.deleteMany({}), Vault.deleteMany({})]));
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ---------- helpers (you do not need to change these) ----------
async function makeUser(name) {
  const email = `${name.toLowerCase()}${++counter}@example.com`;
  const res = await request(app).post('/api/v1/auth/register').set(CSRF)
    .send({ name, email, password: 'password123' });
  return { email, id: res.body.user.id, cookie: res.headers['set-cookie'] };
}
const get = (u, url) => request(app).get(url).set('Cookie', u.cookie);
const post = (u, url) => request(app).post(url).set(CSRF).set('Cookie', u.cookie);
const inOneHour = () => new Date(Date.now() + 3600_000).toISOString();
const newVault = (u, over = {}) =>
  post(u, '/api/v1/vaults').send({ title: 'Research', releaseAt: inOneHour(), ...over });
const share = (owner, vaultId, user) =>
  post(owner, `/api/v1/vaults/${vaultId}/recipients`).send({ email: user.email });
const upload = (u, vaultId, content = 'top secret', name = 'secret.txt') =>
  post(u, `/api/v1/vaults/${vaultId}/files`).attach('file', Buffer.from(content), { filename: name, contentType: 'text/plain' });
const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};
const download = (u, vaultId, fileId) =>
  get(u, `/api/v1/vaults/${vaultId}/files/${fileId}/download`).buffer(true).parse(binary);
const errCode = (res) => JSON.parse(res.body.toString()).error.code;
const pastRelease = (vaultId) => Vault.updateOne({ _id: vaultId }, { releaseAt: new Date(Date.now() - 1000) });

describe('V0 - The Tiny Vault', () => {
  it('[10 XP] creating a vault needs login, and returns the vault owned by me', async () => {
    const alice = await makeUser('Alice');
    const anon = await request(app).post('/api/v1/vaults').set(CSRF).send({ title: 'x', releaseAt: inOneHour() });
    expect(anon.status).toBe(401);
    const res = await newVault(alice);
    expect(res.status).toBe(201);
    expect(res.body.vault).toMatchObject({ title: 'Research', ownerId: alice.id, recipientCount: 0 });
    expect(res.body.vault.files).toEqual([]);
  });

  it('[10 XP] bad input gives 400, including unknown fields like ownerId (mass assignment)', async () => {
    const alice = await makeUser('Alice');
    for (const bad of [{ title: '' }, { releaseAt: 'tomorrow' }, { ownerId: alice.id }]) {
      const res = await newVault(alice, bad);
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect((await post(alice, '/api/v1/vaults').send({ releaseAt: inOneHour() })).status).toBe(400);
  });

  it('[10 XP] a release time in the past is a business-rule error: 400 RELEASE_IN_PAST', async () => {
    const alice = await makeUser('Alice');
    const res = await newVault(alice, { releaseAt: new Date(Date.now() - 60_000).toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RELEASE_IN_PAST');
  });

  it('[10 XP] my list shows vaults I own AND vaults shared with me, never anyone else\'s', async () => {
    const [alice, bob, carol] = [await makeUser('Alice'), await makeUser('Bob'), await makeUser('Carol')];
    const a = (await newVault(alice)).body.vault.id;
    const b = (await newVault(bob)).body.vault.id;
    const c = (await newVault(carol)).body.vault.id;
    await share(bob, b, alice);
    const res = await get(alice, '/api/v1/vaults');
    expect(res.status).toBe(200);
    const ids = res.body.vaults.map((v) => v.id).sort();
    expect(ids).toEqual([a, b].sort());
    expect(ids).not.toContain(c);
  });

  it('[10 XP] a stranger gets 404 (not 403); a malformed id gets 400', async () => {
    const [alice, eve] = [await makeUser('Alice'), await makeUser('Eve')];
    const id = (await newVault(alice)).body.vault.id;
    const res = await get(eve, `/api/v1/vaults/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect((await get(alice, '/api/v1/vaults/not-an-id')).status).toBe(400);
    expect((await get(alice, '/api/v1/vaults/507f1f77bcf86cd799439011')).status).toBe(404);
  });

  it('[15 XP] owner adds a recipient by email: no duplicates, unknown email 404, adding yourself 400', async () => {
    const [alice, bob] = [await makeUser('Alice'), await makeUser('Bob')];
    const id = (await newVault(alice)).body.vault.id;
    expect((await get(bob, `/api/v1/vaults/${id}`)).status).toBe(404); // not shared yet
    const first = await share(alice, id, bob);
    expect(first.status).toBe(200);
    expect(first.body.vault.recipientCount).toBe(1);
    expect((await share(alice, id, bob)).body.vault.recipientCount).toBe(1); // still 1
    expect((await get(bob, `/api/v1/vaults/${id}`)).status).toBe(200); // now visible
    const ghost = await post(alice, `/api/v1/vaults/${id}/recipients`).send({ email: 'ghost@example.com' });
    expect(ghost.status).toBe(404);
    expect((await share(alice, id, alice)).status).toBe(400);
  });

  it('[10 XP] only the owner can add recipients: a recipient gets 403, a stranger gets 404', async () => {
    const [alice, bob, carol] = [await makeUser('Alice'), await makeUser('Bob'), await makeUser('Carol')];
    const id = (await newVault(alice)).body.vault.id;
    await share(alice, id, bob);
    expect((await share(bob, id, carol)).status).toBe(403);
    expect((await share(carol, id, bob)).status).toBe(404);
  });

  it('[15 XP] owner uploads a file; the response shows metadata but never the storage key', async () => {
    const [alice, bob, carol] = [await makeUser('Alice'), await makeUser('Bob'), await makeUser('Carol')];
    const id = (await newVault(alice)).body.vault.id;
    await share(alice, id, bob);
    const res = await upload(alice, id);
    expect(res.status).toBe(201);
    expect(res.body.vault.files).toHaveLength(1);
    expect(res.body.vault.files[0]).toMatchObject({ originalName: 'secret.txt', sizeBytes: 10 });
    expect(JSON.stringify(res.body)).not.toContain('storageKey');
    expect((await upload(bob, id)).status).toBe(403); // recipients cannot upload
    expect((await upload(carol, id)).status).toBe(404); // strangers cannot even see the vault
    expect((await post(alice, `/api/v1/vaults/${id}/files`).send({})).status).toBe(400); // no file attached
  });

  it('[25 XP] BEFORE release: a recipient (and even the owner) gets 403, and no file content is leaked', async () => {
    const [alice, bob] = [await makeUser('Alice'), await makeUser('Bob')];
    const id = (await newVault(alice)).body.vault.id;
    await share(alice, id, bob);
    const fileId = (await upload(alice, id)).body.vault.files[0].id;
    for (const who of [bob, alice]) {
      const res = await download(who, id, fileId);
      expect(res.status).toBe(403);
      expect(errCode(res)).toBe('RELEASE_NOT_REACHED');
      expect(res.body.toString()).not.toContain('top secret');
    }
  });

  it('[25 XP] AFTER release: recipient and owner both download the exact bytes', async () => {
    const [alice, bob] = [await makeUser('Alice'), await makeUser('Bob')];
    const id = (await newVault(alice)).body.vault.id;
    await share(alice, id, bob);
    const fileId = (await upload(alice, id)).body.vault.files[0].id;
    await pastRelease(id);
    for (const who of [bob, alice]) {
      const res = await download(who, id, fileId);
      expect(res.status).toBe(200);
      expect(res.body.toString()).toBe('top secret');
      expect(res.headers['content-disposition']).toContain('secret.txt');
      expect(res.headers['content-type']).toMatch(/octet-stream/);
    }
  });

  it('[20 XP] strangers cannot download even after release, and a file id from ANOTHER vault gets 404', async () => {
    const [alice, bob, eve] = [await makeUser('Alice'), await makeUser('Bob'), await makeUser('Eve')];
    const v1 = (await newVault(alice)).body.vault.id;
    const v2 = (await newVault(alice)).body.vault.id;
    await share(alice, v1, bob);
    await share(alice, v2, bob);
    const f1 = (await upload(alice, v1, 'one')).body.vault.files[0].id;
    const f2 = (await upload(alice, v2, 'two', 'two.txt')).body.vault.files[0].id;
    await pastRelease(v1);
    await pastRelease(v2);
    expect((await download(eve, v1, f1)).status).toBe(404); // stranger
    const wrongRoute = await download(bob, v1, f2); // vault 2's file via vault 1's route
    expect(wrongRoute.status).toBe(404);
    expect(wrongRoute.body.toString()).not.toContain('two');
  });

  it('[10 XP] no response ever contains storageKey (create, list, get, upload)', async () => {
    const alice = await makeUser('Alice');
    const created = await newVault(alice);
    const id = created.body.vault.id;
    const up = await upload(alice, id);
    const list = await get(alice, '/api/v1/vaults');
    const one = await get(alice, `/api/v1/vaults/${id}`);
    for (const res of [created, up, list, one]) expect(JSON.stringify(res.body)).not.toContain('storageKey');
  });
});