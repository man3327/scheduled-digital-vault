import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { conflict } from '../utils/errors.js';

export async function registerUser({ name, email, password }) {
  const existingUser = await User.exists({ email });
  if (existingUser) {
    throw conflict('Email already registered', 'EMAIL_TAKEN');
  }

  const hashedPassword = await bcrypt.hash(password, Number(env.BCRYPT_ROUNDS));

  try {
    const user = await User.create({
      name,
      email,
      hashedPassword,
    });

    return user;
  } catch (err) {
    if (err.code === 11000) {
      throw conflict('Email already registered', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}
