import { Router } from 'express';
import { ContactController } from '../controllers/ContactController.js';
import { limitarContato } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/', limitarContato, ContactController.enviar);

export default router;
