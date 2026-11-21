// GET /api/client/context — o que o servidor sabe sobre quem está chamando.
// Público. O front usa para confirmar o modo (Mobile ou Web) e para mostrar
// "aberto pelo celular" nas sessões.
import { Router, type Request, type Response } from 'express';

const router = Router();

router.get('/context', (req: Request, res: Response) => {
  const cliente = req.cliente ?? 'web';
  const aparelho = req.aparelho ?? 'computador';
  res.json({
    success: true,
    data: {
      cliente,
      aparelho,
      // Celular, tablet e app instalado abrem no modo Mobile; computador e app Windows no Web
      modoRecomendado: cliente === 'pwa' || cliente === 'mobile' || aparelho !== 'computador' ? 'mobile' : 'web',
    },
  });
});

export default router;
