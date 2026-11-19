// server/src/routes/vault.routes.ts
import { Router } from 'express';
import { VaultController } from '../controllers/VaultController.js';
import { exigirEscopo } from '../middlewares/vaultAuth.js';

const router = Router();

// Conta do cofre (site ou dispositivo)
router.get('/account', exigirEscopo(['admin_web', 'hardware']), VaultController.account);

// Parte 4 → PUT /backup, GET /backup, GET /backup/metadata
// Parte 5 → recovery/owner, recovery/complete, kill-switch, recovery/hardware, rotate-ccp
// Parte 6 → inheritance/enable, inheritance/disable, inheritance/claim

export default router;
