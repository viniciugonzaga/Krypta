import { Router } from 'express';
import { UserController } from '../controllers/UserController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);
router.get('/me', UserController.me);
router.put('/me', UserController.updateMe);
router.post('/me/change-password', UserController.changePassword);
router.delete('/me', UserController.deleteMe);
router.get('/me/audit', UserController.getAuditLogs);

export default router;