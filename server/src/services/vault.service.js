import { Vault } from '../models/Vault.js';
import { User } from '../models/User.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { saveFile } from '../utils/storage.js';

async function loadVaultForMember(user, vaultId) {
  const vault = await Vault.findById(vaultId);
  if (!vault) {
    throw notFound('Vault not found');
  }
  const isOwner = String(vault.ownerId) === String(user._id);
  if (!isOwner && !vault.recipients.includes(user._id)) {
    throw notFound('Vault not found');
  }
  return { vault, isOwner };
}

export async function createVault({ user, title, releaseAt }) {
    const releaseDate = new Date(releaseAt);
    if(isNaN(releaseDate.getTime()) || releaseDate <= new Date()) {
        throw badRequest('releaseAt must be a valid date in the future', 'RELEASE_IN_PAST');
    }
    return await Vault.create({ ownerId: user._id, title, releaseAt: releaseDate });
  }

export async function listMyVaults(user) {
    return Vault.find({
    $or: [
      { ownerId: user._id },
      { recipients: user._id }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(100);
}

export async function getVaultForUser(user, vaultId) {
  return loadVaultForMember(user, vaultId).then(({ vault }) => vault);
}

export async function addRecipient({ user, vaultId, email }) {
    if (user.email === email) {
        throw badRequest('You cannot invite yourself', 'SELF_INVITE');
    }
    const invitedUser = await User.findOne({ email });
    if (!invitedUser) {
        throw notFound('No registered user with that email');
    }

    const { vault, isOwner } = await loadVaultForMember(user, vaultId);
    if (!isOwner) {
        throw forbidden('Only the vault owner can add recipients', 'NOT_OWNER');
    }
    vault.recipients.addToSet(invitedUser._id);
    await vault.save();
    return vault;

}

export async function addFile({ user, vaultId, file }) {

  const { vault, isOwner } = await loadVaultForMember(user, vaultId);
  if (!isOwner) {
    throw forbidden('Only the vault owner can add files', 'NOT_OWNER');
  }

  const storageKey = await saveFile(file.buffer);

  vault.files.push({ originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, storageKey });
  await vault.save();
  return vault;
}

export async function getDownload({ user, vaultId, fileId }) {
  const { vault } = await loadVaultForMember(user, vaultId);
  if (!vault) {
    throw notFound('Vault not found');
  }
  const file = vault.files.id(fileId);
  if (!file) {
    throw notFound('File not found');
  }
  if (vault.releaseAt && new Date() < vault.releaseAt) {
    throw forbidden('Files are not available until the release time', 'RELEASE_NOT_REACHED');
  }
  return { vault, file };
}