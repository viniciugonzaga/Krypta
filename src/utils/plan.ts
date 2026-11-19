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