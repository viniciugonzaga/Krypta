// server/src/routes/order.routes.ts
import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.get('/', authMiddleware, OrderController.listar);
router.post('/', authMiddleware, OrderController.criar);

export default router;
