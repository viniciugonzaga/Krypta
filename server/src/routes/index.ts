// server/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import planRoutes from './plan.routes.js';
import hardwareRoutes from './hardware.routes.js';
import vaultRoutes from './vault.routes.js';

const router = Router();

// ---- Site ----
router.use('/auth', authRoutes); // login do portal + login do dispositivo
router.use('/users', userRoutes);
router.use('/plans', planRoutes);

// ---- Cofre (API zero-knowledge) ----
router.use('/hardware', hardwareRoutes); // pareamento
router.use('/vault', vaultRoutes); // conta do cofre (+ backup, recuperação e herança nas Partes 4-6)

export default router;
