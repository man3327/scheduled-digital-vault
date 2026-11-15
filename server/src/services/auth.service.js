import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { conflict, unauthorized } from '../utils/errors.js';

export async function registerUser({ name, email, password }) {
  if (await User.exists({ email })) throw conflict('Email already registered', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, Number(env.BCRYPT_ROUNDS));

  try {
    return await User.create({ name, email, passwordHash });
  } catch (err) {
    if (err.code === 11000) throw conflict('Email already registered', 'EMAIL_TAKEN');
    throw err;
  }
}

export async function verifyCredentials({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid email or password');

  return user;
}

export async function authenticateToken(token) {
  if (!token) throw unauthorized('Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized('Session expired or invalid');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized('Session expired or invalid');

  if (Number(payload.tv ?? -1) !== Number(user.tokenVersion ?? 0)) {
    throw unauthorized('Session expired or invalid');
  }

  return user;
}

export async function revokeAllTokens(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function register(body) {
  return registerUser(body);
}

export function toPublic(user) {
  return user.toPublic();
}

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: Number(user.tokenVersion ?? 0) }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}