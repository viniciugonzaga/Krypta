// server/src/routes/device.routes.ts
import { Router } from 'express';
import { DeviceController } from '../controllers/DeviceController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.get('/', authMiddleware, DeviceController.listar);
router.post('/:serial/receive', authMiddleware, DeviceController.receber);

export default router;
