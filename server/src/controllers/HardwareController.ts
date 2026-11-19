// server/src/controllers/HardwareController.ts
// ============================================================
// POST /api/hardware/pair — primeiro pareamento do ESP32.
// Token: admin_web (o dono logado no site). A conta vem do TOKEN,
// nunca do body: ninguém escolhe qual conta parear.
//
// Body: { public_key, prova_cont_dono, dispositivo_serial? }
//   dispositivo_serial ausente → dispositivo de SOFTWARE (Free e Pro)
//   dispositivo_serial "KRY-..." → unidade FÍSICA comprada (só Pro)
// 200:  objeto conta com status "ATIVA"
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validarProva, validarPublicKey } from '../utils/vaultValidators.js';
import { hashComPepper } from '../utils/pepper.js';
import { VaultModel } from '../models/VaultModel.js';
import { AuditModel } from '../models/AuditModel.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';
import { resolverDispositivoFisico } from '../services/VaultRules.js';

export const HardwareController = {
  pair: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const publicKey = validarPublicKey(req.body?.public_key);
    const prova = validarProva(req.body?.prova_cont_dono);

    const conta = await VaultModel.obterPorId(userId);
    if (!conta) throw new ApiError(404, 'Conta não encontrada.');

    if (conta.status !== 'PENDENTE_PAREAMENTO') {
      throw new ApiError(
        409,
        `Cofre no estado ${conta.status}: o pareamento só é permitido em contas sem dispositivo.`
      );
    }

    // RN01: uma chave = uma conta
    if (await VaultModel.obterPorPublicKey(publicKey)) {
      throw new ApiError(409, 'Este dispositivo já está vinculado a outra conta (RN01).');
    }
    // Chave banida por Kill Switch nunca volta
    if (await VaultModel.chaveRevogada(publicKey)) {
      throw new ApiError(409, 'Este dispositivo foi revogado e não pode ser vinculado novamente.');
    }

    // Origem do dispositivo: software ou uma unidade comprada (Pro)
    const dispositivoId = await resolverDispositivoFisico(userId, req.user!.plan, req.body?.dispositivo_serial);

    // Guarda só o bcrypt(pepper(prova)): vazar o banco não permite usar a prova
    const hashContDono = await hashComPepper(prova);

    const resultado = await VaultModel.parearHardware({ userId, publicKey, hashContDono, dispositivoId });
    if (resultado === 'DISPOSITIVO_INDISPONIVEL') {
      throw new ApiError(409, 'O dispositivo escolhido não está mais disponível para pareamento.');
    }
    if (resultado === 'CHAVE_EM_USO') {
      throw new ApiError(409, 'Este dispositivo já está vinculado a outra conta (RN01).');
    }
    if (resultado === 'ESTADO_INVALIDO') {
      throw new ApiError(409, 'A conta não está mais pendente de pareamento.');
    }

    await AuditModel.log({
      userId,
      action: 'HARDWARE_PAIRED',
      detail: dispositivoId ? `Dispositivo físico pareado (${req.body.dispositivo_serial})` : 'Dispositivo de software pareado',
      ip: req.ip,
    });

    const atualizada = await VaultModel.obterPorId(userId);
    res.json({ success: true, data: atualizada });
  }),
};
