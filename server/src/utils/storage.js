import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const root = path.resolve(env.STORAGE_DIR);

// Saves file bytes under a RANDOM name and returns that name (the "storage key").
// We never use the user's filename on disk: a name like "../../secret" could escape the folder.
export async function saveFile(buffer) {
  const key = randomUUID();
  await fsp.mkdir(root, { recursive: true });
  await fsp.writeFile(path.join(root, key), buffer);
  return key;
}

// Opens a saved file as a stream (chunks), so big files don't fill memory.
export const openFile = (key) => fs.createReadStream(path.join(root, key));