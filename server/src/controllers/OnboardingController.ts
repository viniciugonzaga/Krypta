// server/src/controllers/OnboardingController.ts
// ============================================================
//   GET  /api/onboarding   → { concluido, respostas, recomendacao }
//   POST /api/onboarding   → salva as respostas e devolve a recomendação
// ============================================================
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middlewares/auth.js';
import { query } from '../config/database.js';
import { AuditModel } from '../models/AuditModel.js';
import { recomendar, validarRespostas, type RespostasOnboarding } from '../services/Recomendacao.js';

export const OnboardingController = {
  async obter(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const u = req.user! as any;
      let respostas: RespostasOnboarding | null = null;
      try {
        respostas = u.onboarding_respostas ? JSON.parse(u.onboarding_respostas) : null;
      } catch {
        respostas = null;
      }
      res.json({
        success: true,
        data: {
          concluido: !!u.onboarding_concluido_em,
          respostas,
          recomendacao: respostas && !respostas.pulou ? recomendar(respostas) : null,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async salvar(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const respostas = validarRespostas(req.body);
      const recomendacao = respostas.pulou ? null : recomendar(respostas);

      await query(
        'UPDATE users SET onboarding_respostas = ?, onboarding_recomendacao = ?, onboarding_concluido_em = ? WHERE id = ?',
        [JSON.stringify(respostas), recomendacao?.plano ?? null, new Date(), user.id]
      );
      await AuditModel.log({
        userId: user.id,
        action: 'ONBOARDING',
        detail: respostas.pulou ? 'Questionário de boas-vindas pulado' : `Questionário respondido: recomendado ${recomendacao?.plano === 'pro' ? 'Krypta Pro' : 'Krypta Free'}`,
      });

      res.json({ success: true, data: { recomendacao } });
    } catch (err) {
      next(err);
    }
  },
};
