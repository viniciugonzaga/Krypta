// server/src/controllers/VaultController.ts
// ============================================================
// Rotas do COFRE. Nesta parte só a consulta da conta; as Partes
// 4, 5 e 6 acrescentam backup, recuperação, Kill Switch e herança.
//
// GET /api/vault/account  (admin_web ou hardware)
//   Equivale ao GET /accounts/:id do contrato. A conta vem do
//   token: cada um só enxerga a si mesmo, sem id na URL.
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { VaultModel } from '../models/VaultModel.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

export const VaultController = {
  account: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const conta = await VaultModel.obterPorId(req.vault!.userId);
    if (!conta) throw new ApiError(404, 'Conta não encontrada.');
    res.json({ success: true, data: conta });
  }),
};
