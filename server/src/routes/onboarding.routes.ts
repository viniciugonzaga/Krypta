import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { OnboardingController } from '../controllers/OnboardingController.js';

const router = Router();

router.get('/', authMiddleware, OnboardingController.obter);
router.post('/', authMiddleware, OnboardingController.salvar);

export default router;
