import type { Response, NextFunction } from 'express';
import { UserModel, type UserPlan } from '../models/UserModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { ApiError } from '../utils/ApiError.js';
import type { AuthedRequest } from '../middlewares/auth.js';
import { serializeUser } from './AuthController.js';

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
    features: ['Cofre digital de credenciais', 'Senha Mestre', 'Criptografia', 'Gerenciamento básico de senhas', 'Aplicativo Krypta', 'Acesso pelo software', 'Capacidade limitada de armazenamento'],
  },
  {
    tier: 'essential',
    name: 'Krypta Essencial',
    price: 10,
    priceLabel: 'R$10',
    period: 'por mês',
    description: 'Proteção essencial para suas credenciais, com autenticação simples e criptografia de ponta.',
    features: ['Cofre de credenciais', 'Senha Mestre', 'Criptografia AES-256-GCM', 'Gerenciamento de credenciais', 'Aplicativo Krypta', 'Acesso pelo software'],
    highlighted: true,
  },
  {
    tier: 'advanced',
    name: 'Krypta Avançado',
    price: 15,
    priceLabel: 'R$15',
    period: 'por mês',
    description: 'Adiciona camadas extras de segurança para proteger credenciais importantes.',
    features: ['Tudo do Essencial', 'Autenticação multifator', 'Chave de segurança física', 'Alertas de acesso', 'Proteção reforçada para credenciais'],
  },
  {
    tier: 'max',
    name: 'Krypta Máximo',
    price: 25,
    priceLabel: 'R$25',
    period: 'por mês',
    description: 'O nível máximo de proteção, com múltiplas formas de autenticação e recursos avançados.',
    features: ['Tudo do Avançado', 'Bloqueio remoto', 'Verificações rigorosas de acesso', 'Recursos de emergência', 'Herança Digital'],
  },
  {
    tier: 'custom',
    name: 'Krypta Personalizado',
    price: 10,
    priceLabel: 'R$10',
    period: 'por mês',
    description: 'Configure os recursos de segurança, privacidade e autenticação conforme suas necessidades.',
    features: ['Escolha os métodos de autenticação', 'Defina os recursos de segurança', 'Adapte o Krypta às suas necessidades', 'Personalize o nível de proteção'],
  },
];

export const PlanController = {
  async list(_req: AuthedRequest, res: Response) {
    res.json({ success: true, data: PLANS });
  },

  async changePlan(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { tier } = req.body;

      console.log(`\n🔄 [BACKEND] Solicitando troca de plano para: ${tier} | Usuário: ${user.id}`);

      const plan = PLANS.find((p) => p.tier === tier);
      if (!plan) throw new ApiError(400, 'Plano inválido.');

      // Atualiza o banco de dados
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