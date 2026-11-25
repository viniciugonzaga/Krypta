import type { Response, NextFunction } from 'express';
import { UserModel, normalizePlan, type UserPlan } from '../models/UserModel.js';
import { OrderModel } from '../models/OrderModel.js';
import { comparePassword } from '../utils/hash.js';
import { AuditModel } from '../models/AuditModel.js';
import { ApiError } from '../utils/ApiError.js';
import type { AuthedRequest } from '../middlewares/auth.js';
import { serializeUser } from './AuthController.js';

// Planos disponíveis: apenas Free e Pro.
// O Krypta Pro reúne todas as vantagens dos antigos Essencial, Avançado,
// Máximo e Personalizado.
const PLANS: Array<{
  tier: UserPlan;
  name: string;
  price: number;
  priceLabel: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    tier: 'free',
    name: 'Krypta Free',
    price: 0,
    priceLabel: 'R$0',
    period: 'por mês',
    description: 'Para quem quer começar a proteger suas credenciais sem precisar do dispositivo físico.',
    features: [
      'Cofre digital de credenciais',
      'Senha Mestre',
      'Criptografia',
      'Gerenciamento básico de senhas',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Cofre em outros aparelhos com senha',
      'Capacidade limitada de armazenamento',
    ],
  },
  {
    tier: 'pro',
    name: 'Krypta Pro',
    price: 25,
    priceLabel: 'R$25',
    period: 'por mês',
    description: 'Todos os recursos do Krypta em um único plano: proteção máxima, autenticação múltipla e controle total.',
    features: [
      'Cofre de credenciais',
      'Senha Mestre',
      'Criptografia AES-256-GCM',
      'Gerenciamento de credenciais',
      'Aplicativo Krypta',
      'Acesso pelo software',
      'Autenticação multifator',
      'PIN de 6 dígitos e biometria no celular',
      'Chave de segurança física',
      'Alertas de acesso',
      'Proteção reforçada para credenciais',
      'Bloqueio remoto',
      'Verificações rigorosas de acesso',
      'Recursos de emergência',
      'Herança Digital',
      'Escolha dos métodos de autenticação',
      'Nível de proteção personalizável',
    ],
    highlighted: true,
  },
];

export const PlanController = {
  /**
   * POST /api/plans/cancel  { password }
   * Cancela o Krypta Pro e volta para o Free. Pede a senha do site para
   * confirmar (evita cancelamento por alguém com o navegador aberto).
   * O cofre continua funcionando; recursos Pro ficam travados para novas ações.
   */
  async cancel(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { password } = req.body ?? {};
      if (typeof password !== 'string' || !password) throw new ApiError(400, 'Digite sua senha para confirmar.');
      if (!(await comparePassword(password, user.password_hash))) throw new ApiError(401, 'Senha incorreta.');
      if (normalizePlan(user.plan) !== 'pro') throw new ApiError(409, 'Você já está no Krypta Free.');

      const updated = await UserModel.update(user.id, { plan: 'free' });
      await OrderModel.cancelarAssinaturas(user.id);
      await AuditModel.log({
        userId: user.id,
        action: 'PLAN_CANCELED',
        detail: 'Assinatura do Krypta Pro cancelada (voltou ao Free)',
        status: 'warning',
      });

      res.json({ success: true, data: serializeUser(updated) });
    } catch (err) {
      next(err);
    }
  },

  async list(_req: AuthedRequest, res: Response) {
    res.json({ success: true, data: PLANS });
  },

  async changePlan(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { tier } = req.body;

      console.log(`\n🔄 [BACKEND] Solicitando troca de plano para: ${tier} | Usuário: ${user.id}`);

      // Só aceita 'free' ou 'pro'. Tiers antigos são recusados.
      const plan = PLANS.find((p) => p.tier === tier);
      if (!plan) throw new ApiError(400, 'Plano inválido.');

      // Virar Pro só pela COMPRA (POST /api/orders), que grava o pedido.
      // Esta rota fica só para voltar ao plano gratuito (cancelamento).
      if (plan.tier === 'pro') {
        throw new ApiError(402, 'Para assinar o Krypta Pro, finalize a compra no checkout.');
      }

      const updated = await UserModel.update(user.id, { plan: plan.tier });

      console.log(`✅ [BACKEND] Banco de dados atualizado. Plano retornado do DB: ${updated?.plan}`);

      await AuditModel.log({
        userId: user.id,
        action: 'PLAN_CHANGED',
        detail: `Plano: ${plan.name}`,
      });

      res.json({ success: true, data: serializeUser(updated) });
    } catch (err) {
      console.error('❌ [BACKEND] Erro ao trocar plano:', err);
      next(err);
    }
  },
};