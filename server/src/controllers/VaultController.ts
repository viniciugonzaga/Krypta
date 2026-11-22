// server/src/controllers/VaultController.ts
// ============================================================
// GET /api/vault/account   (admin_web ou hardware)
//   Equivale ao GET /accounts/:id do contrato. A conta vem do token.
//
// GET /api/vault/activity  (admin_web — Krypta Pro)
//   "Alertas de acesso": últimos logins do dispositivo, falhas de
//   assinatura e ações de segurança do cofre.
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { query } from '../config/database.js';
import { VaultModel } from '../models/VaultModel.js';
import { exigirRecurso } from '../services/VaultRules.js';
import { regrasDe } from '../config/planos.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

const ACOES_COFRE = [
  'HARDWARE_PAIRED',
  'DEVICE_LOGIN',
  'DEVICE_LOGIN_FAILED',
  'VAULT_RECOVERY_LOCAL',
  'VAULT_RECOVERY_COMPLETE',
  'VAULT_KILL_SWITCH',
  'VAULT_RECOVERY_HARDWARE',
  'VAULT_CCP_ROTATED',
  'VAULT_INHERITANCE_ENABLED',
  'VAULT_INHERITANCE_DISABLED',
  'VAULT_INHERITANCE_CLAIMED',
  // v1.1.0
  'VAULT_OPENED_CCP',
  'VAULT_CCP_RESET',
  'VAULT_ABANDON_REQUEST',
  'VAULT_ABANDONED',
  // v1.2.0: quem mexeu no cofre, de onde e o que mudou
  'VAULT_EDITED',
  'VAULT_REMOTE_SETUP',
  'VAULT_REMOTE_OPENED',
  'VAULT_REMOTE_FAILED',
  'VAULT_REMOTE_LOCKED',
  'VAULT_REMOTE_REMOVED',
  'VAULT_SNAPSHOT_CREATED',
  'VAULT_SNAPSHOT_RESTORED',
  'VAULT_SNAPSHOT_DELETED',
];

export const VaultController = {
  account: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const conta = await VaultModel.obterPorId(req.vault!.userId);
    if (!conta) throw new ApiError(404, 'Conta não encontrada.');
    // Junta o que o plano libera, para o front mostrar os recursos certos
    res.json({ success: true, data: { ...conta, plano: req.user!.plan, recursos: regrasDe(req.user!.plan) } });
  }),

  activity: asyncHandler<VaultRequest>(async (req, res: Response) => {
    exigirRecurso(req.user!.plan, 'alertasAcesso'); // Krypta Pro
    const marcadores = ACOES_COFRE.map(() => '?').join(', ');
    const rows = await query<{
      id: string;
      action: string;
      detail: string | null;
      ip_address: string | null;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, action, detail, ip_address, status, created_at
         FROM audit_logs
        WHERE user_id = ? AND action IN (${marcadores})
        ORDER BY created_at DESC
        LIMIT 40`,
      [req.vault!.userId, ...ACOES_COFRE]
    );
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        acao: r.action,
        detalhe: r.detail,
        ip: r.ip_address,
        status: r.status,
        quando: r.created_at,
      })),
    });
  }),
};
