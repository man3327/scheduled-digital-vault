import { z } from 'zod';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const vaultParams = z.object({ vaultId: objectId });
export const fileParams = z.object({ vaultId: objectId, fileId: objectId });

export const createVaultBody = z.strictObject({
    title: z.string().trim().min(1).max(120),
    releaseAt: z.string().datetime({ offset: true }),
});

export const addRecipientBody = z.strictObject({
    email: z.string().lowercase().trim().email().max(254),
});