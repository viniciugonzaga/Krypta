import { Router } from 'express';
import { PlanController } from '../controllers/PlanController.js';
import { authMiddleware } from '../middlewares/auth.js';
import { limitarLoginPortal } from '../middlewares/rateLimit.js';

const router = Router();

router.get('/', PlanController.list);
router.post('/change', authMiddleware, PlanController.changePlan);
router.post('/cancel', authMiddleware, limitarLoginPortal, PlanController.cancel);

export default router;