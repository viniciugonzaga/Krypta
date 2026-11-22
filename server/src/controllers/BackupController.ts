// server/src/controllers/BackupController.ts
// ============================================================
// PARTE 4 — BACKUP CIFRADO DO COFRE (token "hardware")
//
//  PUT /api/vault/backup            { version_counter, payload_cifrado }
//      Estados: ATIVA, RECUPERACAO_LOCAL
//      409 se a versão não for MAIOR que a guardada (anti-rollback)
//
//  GET /api/vault/backup
//      Estados: RECUPERACAO_LOCAL, RECUPERACAO_HARDWARE
//      Em ATIVA é SEMPRE 403: o ESP32 é a fonte da verdade (RN04)
//
//  GET /api/vault/backup/metadata
//      Só versão e data, nunca o conteúdo
//
// O servidor guarda bytes cifrados que ele não consegue abrir.
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decodificarPayload, validarVersionCounter } from '../utils/vaultValidators.js';
import {
  ESTADOS_DOWNLOAD,
  ESTADOS_ESCRITA,
  ESTADOS_METADADOS,
  estaEm,
} from '../config/estados.js';
import { VaultModel } from '../models/VaultModel.js';
import { exigirConta, exigirEspaco, resultadoOuErro } from '../services/VaultRules.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';
import { AuditModel } from '../models/AuditModel.js';
import { descreverCliente } from '../middlewares/cliente.js';
import { lerResumo, textoResumo } from './VaultRemotoController.js';

export const BackupController = {
  // ------------------------------------------------------------
  // PUT /api/vault/backup
  // ------------------------------------------------------------
  enviar: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const versionCounter = validarVersionCounter(req.body?.version_counter);
    const payload = decodificarPayload(req.body?.payload_cifrado);
    exigirEspaco(req.user!.plan, payload); // Free 64 KB · Pro 1 MB

    const r = await VaultModel.salvarBackup({
      userId: req.vault!.userId,
      payload,
      versionCounter,
      estadosPermitidos: ESTADOS_ESCRITA,
    });

    // Estado proibido para upload é 403 (contrato), não 409
    if (r.resultado === 'ESTADO') {
      throw new ApiError(403, `Cofre no estado ${r.status}: sincronização não permitida.`);
    }

    const data = resultadoOuErro(r, (s) => `Cofre no estado ${s}.`);

    // v1.2.0: relatório do que mudou (só contagens; o conteúdo segue cifrado)
    const resumo = lerResumo(req.body?.resumo);
    if (resumo) {
      await AuditModel.log({
        userId: req.vault!.userId,
        action: 'VAULT_EDITED',
        detail: `Cofre editado no dispositivo pareado ${descreverCliente(req.cliente)}: ${textoResumo(resumo)} (versão ${data.version_counter})`,
        ip: req.ip,
        status: 'success',
      });
    }
    res.json({ success: true, data });
  }),

  // ------------------------------------------------------------
  // GET /api/vault/backup
  // ------------------------------------------------------------
  baixar: asyncHandler<VaultRequest>(async (req, res: Response) => {
    // O token vale 15 min; o estado real vem do banco a cada requisição
    const conta = await exigirConta(req.vault!.userId);
    if (!estaEm(conta.status, ESTADOS_DOWNLOAD)) {
      throw new ApiError(403, 'Download do backup não permitido neste estado do cofre.');
    }

    const backup = await VaultModel.obterBackup(conta.id);
    if (!backup) throw new ApiError(404, 'Nenhum backup encontrado.');

    res.json({
      success: true,
      data: {
        payload_cifrado: Buffer.from(backup.payload_cifrado).toString('base64'),
        version_counter: backup.version_counter,
        atualizado_em: backup.atualizado_em,
      },
    });
  }),

  // ------------------------------------------------------------
  // GET /api/vault/backup/metadata
  // ------------------------------------------------------------
  metadados: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const conta = await exigirConta(req.vault!.userId);
    if (!estaEm(conta.status, ESTADOS_METADADOS)) {
      throw new ApiError(403, 'Consulta não permitida neste estado do cofre.');
    }

    const meta = await VaultModel.obterMetadadosBackup(conta.id);
    if (!meta) throw new ApiError(404, 'Nenhum backup encontrado.');

    res.json({ success: true, data: meta });
  }),
};
