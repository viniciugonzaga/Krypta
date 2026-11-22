// src/utils/plan.ts
// Planos do Krypta: apenas Free e Pro.
// Planos antigos (essential, advanced, max, custom) são tratados como Pro,
// para não quebrar usuários que ainda estejam com eles salvos.

export type PlanId = 'free' | 'pro';

const LEGACY_PAID_PLANS = ['essential', 'advanced', 'max', 'custom'];

export function normalizePlan(plan?: string | null): PlanId {
  if (!plan) return 'free';
  const p = String(plan).toLowerCase().trim();
  if (p === 'pro' || LEGACY_PAID_PLANS.includes(p)) return 'pro';
  return 'free';
}

export function isProPlan(plan?: string | null): boolean {
  return normalizePlan(plan) === 'pro';
}

/** Nome curto para badges ("Gratuito" / "Pro") */
export function getPlanLabel(plan?: string | null): string {
  return isProPlan(plan) ? 'Pro' : 'Gratuito';
}

/** Nome completo do plano ("Krypta Free" / "Krypta Pro") */
export function getPlanFullName(plan?: string | null): string {
  return isProPlan(plan) ? 'Krypta Pro' : 'Krypta Free';
}
/**
 * Recursos de cada plano (espelho de server/src/config/planos.ts).
 * Só para exibir na interface: quem bloqueia de verdade é o servidor.
 */
export const RECURSOS_PLANO = {
  free: { armazenamentoKB: 64, dispositivoFisico: false, killSwitch: false, heranca: false, alertasAcesso: false, multiAparelho: false, acessoRemoto: false, pontosRestauracao: 2, camposExtras: false },
  pro: { armazenamentoKB: 1024, dispositivoFisico: true, killSwitch: true, heranca: true, alertasAcesso: true, multiAparelho: true, acessoRemoto: true, pontosRestauracao: 20, camposExtras: true },
} as const;

export function recursosDoPlano(plan?: string | null) {
  return RECURSOS_PLANO[normalizePlan(plan)];
}
