import { Router } from 'express';
import { PlanController } from '../controllers/PlanController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.get('/', PlanController.list);
router.post('/change', authMiddleware, PlanController.changePlan);

export default router;