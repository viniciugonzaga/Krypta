// server/src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { DeviceAuthController } from '../controllers/DeviceAuthController.js';
import { exigirEscopo } from '../middlewares/vaultAuth.js';
import {
  limitarAuthHardware,
  limitarCadastro,
  limitarLoginPortal,
} from '../middlewares/rateLimit.js';

const router = Router();

// ============ PORTAL (site) ============
router.post('/register', limitarCadastro, AuthController.register);
router.post('/login', limitarLoginPortal, AuthController.login);
router.post('/social', limitarLoginPortal, AuthController.socialLogin);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.post('/recover', limitarLoginPortal, AuthController.requestRecovery);
router.post('/reset-password', limitarLoginPortal, AuthController.resetPassword);

// ============ DISPOSITIVO (Ed25519 challenge-response) ============
// 1) o app pede um nonce para a public_key do ESP32
router.post('/challenge', limitarAuthHardware, DeviceAuthController.challenge);
// 2) o ESP32 assina os BYTES do nonce e o app envia a assinatura
router.post('/verify', limitarAuthHardware, DeviceAuthController.verify);
// 3) confere se o token do dispositivo ainda vale
router.get('/session', exigirEscopo(['hardware']), DeviceAuthController.session);

export default router;
