// server/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import planRoutes from './plan.routes.js';
import hardwareRoutes from './hardware.routes.js';
import vaultRoutes from './vault.routes.js';
import orderRoutes from './order.routes.js';
import deviceRoutes from './device.routes.js';
import contactRoutes from './contact.routes.js';
import onboardingRoutes from './onboarding.routes.js';
import clientRoutes from './client.routes.js';

const router = Router();

// ---- Site ----
router.use('/auth', authRoutes); // login do portal + login do dispositivo
router.use('/users', userRoutes);
router.use('/plans', planRoutes);
router.use('/orders', orderRoutes); // compras (plano e dispositivo)
router.use('/devices', deviceRoutes); // dispositivos comprados
router.use('/contact', contactRoutes); // formulário de contato (público)
router.use('/onboarding', onboardingRoutes); // questionário de boas-vindas + plano recomendado
router.use('/client', clientRoutes); // de onde vem a requisição (web, mobile, pwa, desktop)

// ---- Cofre (API zero-knowledge) ----
router.use('/hardware', hardwareRoutes); // pareamento
router.use('/vault', vaultRoutes); // conta do cofre (+ backup, recuperação e herança nas Partes 4-6)

export default router;
