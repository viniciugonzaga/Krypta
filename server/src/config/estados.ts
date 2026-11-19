// server/src/config/estados.ts
// ============================================================
// MATRIZ DE ESTADOS DO COFRE — ÚNICA fonte das regras
// "no estado X, pode fazer Y". Models e controllers importam daqui.
// Mudar uma regra = mudar este arquivo.
//
// Fluxo:
//   (cadastro)            → PENDENTE_PAREAMENTO
//   PENDENTE_PAREAMENTO   → ATIVA                 (POST /hardware/pair)
//   ATIVA                 → RECUPERACAO_LOCAL     (esqueci a senha mestre)
//   RECUPERACAO_*         → ATIVA                 (recuperação concluída)
//   ATIVA / RECUPERACAO_* → REVOGADA              (Kill Switch)
//   REVOGADA              → RECUPERACAO_HARDWARE  (novo dispositivo)
//   qualquer exceto PEND. → RECUPERACAO_HARDWARE  (resgate de herança)
// ============================================================

export const ESTADOS_COFRE = [
  'PENDENTE_PAREAMENTO',
  'ATIVA',
  'REVOGADA',
  'RECUPERACAO_LOCAL',
  'RECUPERACAO_HARDWARE',
] as const;

export type EstadoCofre = (typeof ESTADOS_COFRE)[number];

const lista = (...estados: EstadoCofre[]): readonly EstadoCofre[] => Object.freeze(estados);

/** Login por hardware (challenge/verify) */
export const ESTADOS_LOGIN_HARDWARE = lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE');
/** PUT /backup */
export const ESTADOS_ESCRITA = lista('ATIVA', 'RECUPERACAO_LOCAL');
/** GET /backup — nunca em ATIVA: o ESP32 é a fonte da verdade (RN04) */
export const ESTADOS_DOWNLOAD = lista('RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE');
/** GET /backup/metadata */
export const ESTADOS_METADADOS = lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE');
/** POST /account/kill-switch */
export const ESTADOS_KILL_SWITCH = lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE');
/** POST /recovery/complete */
export const ESTADOS_RECUPERACAO = lista('RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE');
/** POST /inheritance/claim */
export const ESTADOS_RESGATE = lista('ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE', 'REVOGADA');

export function estaEm(estado: string, permitidos: readonly EstadoCofre[]): boolean {
  return (permitidos as readonly string[]).includes(estado);
}
