import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/vault.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { createVaultBody, addRecipientBody, vaultParams, fileParams } from '../validators/vault.schema.js';

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

router.use(authenticate); // every route below this line requires login
router.post('/', validate({ body: createVaultBody }), ctrl.create);
router.get('/', ctrl.list);
router.get('/:vaultId', validate({ params: vaultParams }), ctrl.get);
router.post('/:vaultId/recipients', validate({ params: vaultParams, body: addRecipientBody }), ctrl.addRecipient);
router.post('/:vaultId/files', validate({ params: vaultParams }), upload.single('file'), ctrl.upload);
router.get('/:vaultId/files/:fileId/download', validate({ params: fileParams }), ctrl.download);

export default router;