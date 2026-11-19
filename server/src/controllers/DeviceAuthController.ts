// server/src/controllers/DeviceAuthController.ts
// ============================================================
// LOGIN DO DISPOSITIVO (challenge-response Ed25519)
//
//  1. POST /api/auth/challenge { public_key }
//       → { nonce }  (32 bytes aleatórios, vale 60 s, uso único)
//  2. O app decodifica o nonce (base64 → bytes) e o ESP32 assina
//     ESSES BYTES com a chave privada (que nunca sai do chip).
//  3. POST /api/auth/verify { public_key, assinatura }
//       → { token, expira_em }  (escopo "hardware", 15 min)
//  4. GET /api/auth/session (Bearer token do dispositivo)
//       → { contaId, tipo, expira_em }
//
// Assinar a STRING base64 em vez dos bytes falha com 401.
// ============================================================
import type { Request, Response } from 'express';
import nacl from 'tweetnacl';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decodificarAssinatura, validarPublicKey } from '../utils/vaultValidators.js';
import { consumirNonce, gerarNonce } from '../utils/nonceStore.js';
import { generateHardwareToken } from '../utils/token.js';
import { ESTADOS_LOGIN_HARDWARE, estaEm } from '../config/estados.js';
import { VaultModel, type ContaCofre } from '../models/VaultModel.js';
import { UserModel } from '../models/UserModel.js';
import { AuditModel } from '../models/AuditModel.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

/** Busca a conta dona da chave e confere se ela pode logar pelo dispositivo */
async function contaApta(publicKey: string): Promise<ContaCofre> {
  const conta = await VaultModel.obterPorPublicKey(publicKey);
  if (!conta) throw new ApiError(404, 'Hardware não reconhecido.');

  if (!estaEm(conta.status, ESTADOS_LOGIN_HARDWARE)) {
    throw new ApiError(403, `Cofre no estado ${conta.status}: login pelo dispositivo não permitido.`);
  }

  // A conta do SITE também precisa estar liberada
  const user = await UserModel.findById(conta.id);
  if (!user) throw new ApiError(404, 'Hardware não reconhecido.');
  if (user.status === 'SUSPENSA') throw new ApiError(423, 'Conta suspensa. Contate o suporte.');
  if (user.status === 'REVOGADA') throw new ApiError(410, 'Conta revogada permanentemente.');

  return conta;
}

export const DeviceAuthController = {
  // ------------------------------------------------------------
  // POST /api/auth/challenge
  // ------------------------------------------------------------
  challenge: asyncHandler(async (req: Request, res: Response) => {
    const publicKey = validarPublicKey(req.body?.public_key);
    await contaApta(publicKey);

    // Pedir outro challenge para a mesma chave invalida o anterior
    res.json({ success: true, data: { nonce: gerarNonce(publicKey) } });
  }),

  // ------------------------------------------------------------
  // POST /api/auth/verify
  // ------------------------------------------------------------
  verify: asyncHandler(async (req: Request, res: Response) => {
    const publicKey = validarPublicKey(req.body?.public_key);
    const assinatura = decodificarAssinatura(req.body?.assinatura);
    const conta = await contaApta(publicKey);

    // Consome o nonce ANTES de verificar: uma tentativa falha também o queima
    const nonce = consumirNonce(publicKey);
    if (!nonce) {
      throw new ApiError(401, 'Nonce inválido ou expirado. Solicite um novo challenge.');
    }

    const mensagem = new Uint8Array(Buffer.from(nonce, 'base64'));
    const chave = new Uint8Array(Buffer.from(publicKey, 'base64'));

    if (!nacl.sign.detached.verify(mensagem, assinatura, chave)) {
      await AuditModel.log({
        userId: conta.id,
        action: 'DEVICE_LOGIN_FAILED',
        detail: 'Assinatura inválida no login do dispositivo',
        ip: req.ip,
        status: 'warning',
      });
      throw new ApiError(401, 'Assinatura inválida.');
    }

    // Login pelo dispositivo prova que o dono segue ativo: renova o prazo (RN11)
    await VaultModel.renovarPrazo(conta.id);

    const { token, expiresAt } = generateHardwareToken(conta.id, publicKey);

    await AuditModel.log({
      userId: conta.id,
      action: 'DEVICE_LOGIN',
      detail: 'Login pelo dispositivo Krypta',
      ip: req.ip,
    });

    res.json({ success: true, data: { token, expira_em: expiresAt.toISOString() } });
  }),

  // ------------------------------------------------------------
  // GET /api/auth/session  (token hardware)
  // ------------------------------------------------------------
  session: (req: VaultRequest, res: Response) => {
    const { userId, tipo, exp } = req.vault!;
    res.json({
      success: true,
      data: {
        contaId: userId,
        tipo,
        expira_em: exp ? new Date(exp * 1000).toISOString() : null,
      },
    });
  },
};
