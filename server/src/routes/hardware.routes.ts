// server/src/routes/hardware.routes.ts
import { Router } from 'express';
import { HardwareController } from '../controllers/HardwareController.js';
import { exigirEscopo } from '../middlewares/vaultAuth.js';
import { limitarAnuncio, limitarOperacaoConta } from '../middlewares/rateLimit.js';

const router = Router();

// Só o dono logado no SITE (admin_web) pareia um dispositivo na própria conta.
// Token primeiro, limitador depois: só quem tem login consome tentativas.
// O ESP32 se apresenta ao ligar (número de série + chave pública assinada). Público.
router.post('/announce', limitarAnuncio, HardwareController.announce);

router.post('/pair', exigirEscopo(['admin_web']), limitarOperacaoConta, HardwareController.pair);

export default router;
