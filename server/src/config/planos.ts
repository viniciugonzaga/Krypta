// server/src/config/planos.ts
// ============================================================
// O QUE CADA PLANO LIBERA NO COFRE — única fonte das regras de plano.
// O front tem o espelho em src/utils/plan.ts (só para mostrar na tela);
// quem DECIDE é sempre o servidor.
//
//  Recurso                               Free        Pro
//  Cofre por software (app/navegador)     ✓           ✓
//  Armazenamento do backup cifrado        64 KB       1 MB
//  Dispositivo físico Krypta (comprado)   —           ✓
//  Recuperação com a CCP                  ✓           ✓
//  Troca da CCP                           ✓           ✓
//  Kill Switch (bloqueio remoto)          —           ✓
//  Herança digital                        —           ✓
//  Alertas de acesso (histórico)          —           ✓
//  Abrir/editar o cofre em outros aparelhos com SENHA   ✓   ✓   (v1.5.0: liberado no Free)
//  PIN de 6 dígitos (e biometria no celular)            —   ✓
//  CCP nova pelo dispositivo / abandonar  ✓           ✓
//
// Para mudar uma regra (ex.: liberar o Kill Switch no Free), troque aqui.
// ============================================================
import { normalizePlan, type UserPlan } from '../models/UserModel.js';

export interface RegrasPlano {
  armazenamentoBytes: number;
  dispositivoFisico: boolean;
  killSwitch: boolean;
  heranca: boolean;
  alertasAcesso: boolean;
  /** Ver o cofre em outro aparelho da mesma conta, com a CCP */
  multiAparelho: boolean;
  /** Senha de acesso para abrir E EDITAR o cofre em qualquer aparelho (v1.5.0: todos os planos) */
  acessoRemoto: boolean;
  /** v1.5.0: PIN de 6 dígitos no lugar da senha (e biometria no celular) — Pro */
  pinCofre: boolean;
  /** Quantos pontos de restauração (cópias do cofre) podem existir */
  pontosRestauracao: number;
  /** Chaves com mais de 3 campos (cartão, endereço, campos extras) */
  camposExtras: boolean;
}

export const REGRAS_PLANO: Record<UserPlan, RegrasPlano> = {
  free: {
    armazenamentoBytes: 64 * 1024,
    dispositivoFisico: false,
    killSwitch: false,
    heranca: false,
    alertasAcesso: false,
    multiAparelho: true, // v1.5.0: ver com a CCP (só leitura) em qualquer aparelho, todos os planos
    acessoRemoto: true,
    pinCofre: false,
    pontosRestauracao: 2,
    camposExtras: false,
  },
  pro: {
    armazenamentoBytes: 1024 * 1024,
    dispositivoFisico: true,
    killSwitch: true,
    heranca: true,
    alertasAcesso: true,
    multiAparelho: true,
    acessoRemoto: true,
    pinCofre: true,
    pontosRestauracao: 20,
    camposExtras: true,
  },
};

export function regrasDe(plan: string | null | undefined): RegrasPlano {
  return REGRAS_PLANO[normalizePlan(plan)];
}

// Preços cobrados (o servidor calcula; nunca confia no valor vindo do navegador)
export const PRECOS = {
  pro: { MENSAL: 25, ANUAL: 225 },
  produtos: {
    'krypta-device-v1': { nome: 'Dispositivo Krypta', preco: 599, maxQuantidade: 5, maxParcelas: 10 },
  },
} as const;

export type ProdutoId = keyof typeof PRECOS.produtos;
