import * as vaultService from '../services/vault.service.js';
import { badRequest } from '../utils/errors.js';
import { openFile } from '../utils/storage.js';

export async function create(req, res) {
  const vault = await vaultService.createVault({ user: req.user, ...req.body });
  res.status(201).json({ vault: vault.toPublic() });
}

export async function list(req, res) {
  const vaults = await vaultService.listMyVaults(req.user);
  res.json({ vaults: vaults.map((v) => v.toPublic()) });
}

export async function get(req, res) {
  const vault = await vaultService.getVaultForUser(req.user, req.params.vaultId);
  res.json({ vault: vault.toPublic() });
}

export async function addRecipient(req, res) {
  const vault = await vaultService.addRecipient({
    user: req.user,
    vaultId: req.params.vaultId,
    email: req.body.email,
  });
  res.json({ vault: vault.toPublic() });
}

export async function upload(req, res) {
  // multer puts the uploaded file on req.file; if the client sent none, it is undefined
  if (!req.file) throw badRequest('No file provided (the form field must be named "file")', 'NO_FILE');
  const vault = await vaultService.addFile({ user: req.user, vaultId: req.params.vaultId, file: req.file });
  res.status(201).json({ vault: vault.toPublic() });
}

export async function download(req, res) {
  const { file } = await vaultService.getDownload({
    user: req.user,
    vaultId: req.params.vaultId,
    fileId: req.params.fileId,
  });
  res.attachment(file.originalName); // "save as" header; also sets a Content-Type from the extension...
  res.setHeader('Content-Type', 'application/octet-stream'); // ...so we override it AFTER, with a safe generic type
  res.setHeader('Cache-Control', 'private, no-store');
  const stream = openFile(file.storageKey);
  stream.on('error', () => res.destroy());
  stream.pipe(res); // send the file in chunks
}