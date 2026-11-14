import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017', { dbName: 'vault_test_user' });
  await User.init(); // builds the indexes, including the unique one
});
afterEach(() => User.deleteMany({}));
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const make = (over = {}) => ({
  name: 'Alice',
  email: 'alice@example.com',
  passwordHash: 'x'.repeat(60),
  ...over,
});

describe('Level 2.1 - The Registry', () => {
  it('[10 XP] saves a valid user with createdAt and updatedAt', async () => {
    const u = await User.create(make());
    expect(u.createdAt).toBeInstanceOf(Date);
    expect(u.updatedAt).toBeInstanceOf(Date);
  });

  it('[10 XP] stores email trimmed and lowercase', async () => {
    const u = await User.create(make({ email: '  ALICE@Example.com ' }));
    expect(u.email).toBe('alice@example.com');
  });

  it('[15 XP] the DATABASE rejects a duplicate email (even with different casing)', async () => {
    await User.create(make());
    await expect(User.create(make({ email: 'ALICE@example.com' }))).rejects.toMatchObject({ code: 11000 });
  });

  it('[10 XP] requires name, email and passwordHash', async () => {
    for (const missing of ['name', 'email', 'passwordHash']) {
      const data = make();
      delete data[missing];
      await expect(new User(data).validate()).rejects.toThrow();
    }
  });

  it('[15 XP] passwordHash is NOT loaded unless explicitly requested', async () => {
    await User.create(make());
    const plain = await User.findOne({ email: 'alice@example.com' });
    expect(plain.passwordHash).toBeUndefined();
    const withHash = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash');
    expect(withHash.passwordHash).toHaveLength(60);
  });

  it('[10 XP] tokenVersion starts at 0', async () => {
    const u = await User.create(make());
    expect(u.tokenVersion).toBe(0);
  });

  it('[15 XP] toPublic() returns ONLY id, name, email, createdAt', async () => {
    const u = await User.create(make());
    const pub = u.toPublic();
    expect(Object.keys(pub).sort()).toEqual(['createdAt', 'email', 'id', 'name']);
    expect(typeof pub.id).toBe('string');
  });
});