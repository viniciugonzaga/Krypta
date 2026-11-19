// server/src/controllers/ContingencyController.ts
// ============================================================
// PARTE 5 — CONTINGÊNCIA
//
//  "Esqueci a senha mestre" (o dono ESTÁ com o dispositivo):
//   POST /api/vault/recovery/owner     (hardware) { prova_cont_dono }
//        ATIVA → RECUPERACAO_LOCAL (libera baixar o backup)
//   POST /api/vault/recovery/complete  (hardware) sem body
//        RECUPERACAO_* → ATIVA (chamar DEPOIS de gravar no ESP32, RN07)
//
//  "Perdi o dispositivo" (o dono só tem o login do site + a CCP):
//   POST /api/vault/kill-switch        (admin_web) { prova_cont_dono }
//        → REVOGADA, a chave antiga fica banida PARA SEMPRE
//   POST /api/vault/recovery/hardware  (admin_web) { public_key, prova_cont_dono }
//        REVOGADA → RECUPERACAO_HARDWARE com o ESP32 novo
//
//  Trocar a CCP (o dono ESTÁ com o dispositivo):
//   POST /api/vault/rotate-ccp         (hardware)
//        { prova_cont_dono_atual, prova_cont_dono_nova, version_counter, payload_cifrado }
//        Troca a prova e grava o backup com o novo envelope: TUDO OU NADA.
// ============================================================
import type { Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  decodificarPayload,
  validarProva,
  validarPublicKey,
  validarVersionCounter,
} from '../utils/vaultValidators.js';
import { hashComPepper } from '../utils/pepper.js';
import { ESTADOS_KILL_SWITCH, ESTADOS_RECUPERACAO, estaEm } from '../config/estados.js';
import { VaultModel } from '../models/VaultModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { UserModel } from '../models/UserModel.js';
import { EmailService } from '../services/EmailService.js';
import {
  conferirProvaDono,
  exigirConta,
  exigirEspaco,
  exigirRecurso,
  resolverDispositivoFisico,
  resultadoOuErro,
} from '../services/VaultRules.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

export const ContingencyController = {
  // ------------------------------------------------------------
  // POST /api/vault/recovery/owner   ATIVA → RECUPERACAO_LOCAL
  // A chave pública NÃO muda: o dispositivo continua vinculado.
  // ------------------------------------------------------------
  recoveryOwner: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const prova = validarProva(req.body?.prova_cont_dono);

    const conta = await exigirConta(userId);
    if (conta.status !== 'ATIVA') {
      throw new ApiError(409, `Cofre no estado ${conta.status}: a recuperação local exige cofre ATIVO.`);
    }
    await conferirProvaDono(userId, prova);

    const atualizada = await VaultModel.transicionarEstado({ userId, de: ['ATIVA'], para: 'RECUPERACAO_LOCAL' });
    if (!atualizada) throw new ApiError(409, 'O estado do cofre mudou durante a operação.');

    await AuditModel.log({
      userId,
      action: 'VAULT_RECOVERY_LOCAL',
      detail: 'Recuperação local iniciada (esqueci a senha mestre)',
      ip: req.ip,
      status: 'warning',
    });

    res.json({ success: true, data: atualizada });
  }),

  // ------------------------------------------------------------
  // POST /api/vault/recovery/complete   RECUPERACAO_* → ATIVA
  // ------------------------------------------------------------
  recoveryComplete: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const conta = await exigirConta(userId);
    if (!estaEm(conta.status, ESTADOS_RECUPERACAO)) {
      throw new ApiError(409, `Cofre no estado ${conta.status}: não há recuperação em andamento.`);
    }

    const atualizada = await VaultModel.transicionarEstado({ userId, de: ESTADOS_RECUPERACAO, para: 'ATIVA' });
    if (!atualizada) throw new ApiError(409, 'O estado do cofre mudou durante a operação.');

    await AuditModel.log({
      userId,
      action: 'VAULT_RECOVERY_COMPLETE',
      detail: `Recuperação concluída (${conta.status} → ATIVA)`,
      ip: req.ip,
    });

    res.json({ success: true, data: atualizada });
  }),

  // ------------------------------------------------------------
  // POST /api/vault/kill-switch   (token do SITE)
  // ------------------------------------------------------------
  killSwitch: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    exigirRecurso(req.user!.plan, 'killSwitch'); // Krypta Pro
    const prova = validarProva(req.body?.prova_cont_dono);

    const conta = await exigirConta(userId);
    if (!estaEm(conta.status, ESTADOS_KILL_SWITCH)) {
      throw new ApiError(409, `Cofre no estado ${conta.status}: o Kill Switch não se aplica.`);
    }
    await conferirProvaDono(userId, prova);

    const revogada = await VaultModel.revogarConta({
      userId,
      motivo: 'KILL_SWITCH_DONO',
      estadosPermitidos: ESTADOS_KILL_SWITCH,
    });
    if (!revogada) throw new ApiError(409, 'O estado do cofre mudou durante a operação.');

    await AuditModel.log({
      userId,
      action: 'VAULT_KILL_SWITCH',
      detail: 'Kill Switch acionado: dispositivo revogado permanentemente',
      ip: req.ip,
      status: 'warning',
    });

    // Aviso por e-mail (não atrasa nem desfaz a revogação)
    const user = await UserModel.findById(userId);
    if (user) EmailService.notifyKillSwitch(user.email, user.name);

    res.json({ success: true, data: revogada });
  }),

  // ------------------------------------------------------------
  // POST /api/vault/recovery/hardware   (token do SITE)
  // REVOGADA → RECUPERACAO_HARDWARE com o novo ESP32
  // ------------------------------------------------------------
  recoveryHardware: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const publicKey = validarPublicKey(req.body?.public_key);
    const prova = validarProva(req.body?.prova_cont_dono);

    const conta = await exigirConta(userId);
    if (conta.status !== 'REVOGADA') {
      throw new ApiError(
        409,
        `Cofre no estado ${conta.status}: a recuperação de hardware exige o Kill Switch antes.`
      );
    }
    await conferirProvaDono(userId, prova);

    if (await VaultModel.chaveRevogada(publicKey)) {
      throw new ApiError(409, 'Este dispositivo foi revogado e não pode ser vinculado novamente.');
    }
    if (await VaultModel.obterPorPublicKey(publicKey)) {
      throw new ApiError(409, 'Este dispositivo já está vinculado a outra conta (RN01).');
    }
    // O novo dispositivo pode ser de software ou outra unidade comprada (Pro)
    const dispositivoId = await resolverDispositivoFisico(userId, req.user!.plan, req.body?.dispositivo_serial);

    const r = await VaultModel.parearNovoHardware({ userId, publicKey, dispositivoId });
    if (r === 'DISPOSITIVO_INDISPONIVEL') {
      throw new ApiError(409, 'O dispositivo escolhido não está mais disponível para pareamento.');
    }
    if (r !== 'OK') {
      throw new ApiError(409, 'Não foi possível vincular o dispositivo (estado ou chave em conflito).');
    }

    await AuditModel.log({
      userId,
      action: 'VAULT_RECOVERY_HARDWARE',
      detail: 'Novo dispositivo vinculado após Kill Switch',
      ip: req.ip,
      status: 'warning',
    });

    res.json({ success: true, data: await VaultModel.obterPorId(userId) });
  }),

  // ------------------------------------------------------------
  // POST /api/vault/rotate-ccp   (token do DISPOSITIVO)
  // ------------------------------------------------------------
  rotateCcp: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const provaAtual = validarProva(req.body?.prova_cont_dono_atual, 'prova_cont_dono_atual');
    const provaNova = validarProva(req.body?.prova_cont_dono_nova, 'prova_cont_dono_nova');
    if (provaAtual === provaNova) {
      throw new ApiError(400, 'A nova prova de contingência deve ser diferente da atual.');
    }
    const versionCounter = validarVersionCounter(req.body?.version_counter);
    const payload = decodificarPayload(req.body?.payload_cifrado);
    exigirEspaco(req.user!.plan, payload);

    const conta = await exigirConta(userId);
    if (conta.status !== 'ATIVA') {
      throw new ApiError(409, `Cofre no estado ${conta.status}: a troca da CCP exige cofre ATIVO.`);
    }
    // Token do dispositivo sozinho não troca a CCP: exige a prova atual
    const hashAtual = await conferirProvaDono(userId, provaAtual, 'Prova de contingência atual inválida.');
    const novoHash = await hashComPepper(provaNova);

    const r = await VaultModel.rotacionarCcp({ userId, hashAtual, novoHash, payload, versionCounter });
    const data = resultadoOuErro(r, (s) => `Cofre no estado ${s}: a troca da CCP exige cofre ATIVO.`);

    await AuditModel.log({
      userId,
      action: 'VAULT_CCP_ROTATED',
      detail: 'Chave de contingência (CCP) trocada',
      ip: req.ip,
    });

    res.json({ success: true, data });
  }),
};
