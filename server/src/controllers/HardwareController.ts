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
import { exigirEspaco, resolverDispositivoFisico } from '../services/VaultRules.js';
import nacl from 'tweetnacl';
import type { Request } from 'express';
import { decodificarAssinatura, decodificarPayload } from '../utils/vaultValidators.js';
import { DeviceModel, codigoConfirmacao } from '../models/DeviceModel.js';

const SERIAL_RE = /^KRY-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

/** Mensagem que o ESP32 assina para provar que tem a chave privada */
export const mensagemAnuncio = (serial: string) => new TextEncoder().encode(`krypta-announce-v1:${serial}`);

export const HardwareController = {
  /**
   * POST /api/hardware/announce  (público — chamado pelo ESP32 ao ligar)
   *   { serial, public_key, assinatura }
   *   assinatura = Ed25519 dos bytes de "krypta-announce-v1:<serial>"
   *
   * → { estado, codigo }
   *   estado: AGUARDANDO_PAREAMENTO | PAREADO | REVOGADO
   *   codigo: 6 dígitos que o dono confere na tela do dispositivo e no site
   *
   * Não pareia nada: só registra a chave. O pareamento continua sendo feito
   * pelo dono logado no site (POST /api/hardware/pair), depois de conferir o código.
   */
  announce: asyncHandler(async (req: Request, res: Response) => {
    const serial = String(req.body?.serial ?? '').trim().toUpperCase();
    if (!SERIAL_RE.test(serial)) throw new ApiError(400, 'Número de série inválido (formato KRY-XXXX-XXXX-XXXX).');
    const publicKey = validarPublicKey(req.body?.public_key);
    const assinatura = decodificarAssinatura(req.body?.assinatura);

    const chave = new Uint8Array(Buffer.from(publicKey, 'base64'));
    if (!nacl.sign.detached.verify(mensagemAnuncio(serial), assinatura, chave)) {
      throw new ApiError(401, 'Assinatura do dispositivo inválida.');
    }

    // Mesma resposta para série inexistente: não revela quais séries existem
    const d = await DeviceModel.obterPorSerial(serial);
    if (!d) throw new ApiError(404, 'Dispositivo não encontrado. Confira o número de série.');

    const codigo = codigoConfirmacao(publicKey);

    if (d.status === 'REVOGADO') {
      await DeviceModel.registrarContato(d.id);
      return res.json({ success: true, data: { estado: 'REVOGADO', codigo } });
    }
    if (d.status === 'PAREADO') {
      if (d.public_key !== publicKey) {
        throw new ApiError(409, 'Este número de série já está pareado com outra chave.');
      }
      await DeviceModel.registrarContato(d.id);
      return res.json({ success: true, data: { estado: 'PAREADO', codigo } });
    }

    // EM_TRANSPORTE ou DISPONIVEL: guarda a chave para o dono parear no site
    if (await VaultModel.chaveRevogada(publicKey)) {
      throw new ApiError(409, 'Esta chave foi revogada. Gere uma chave nova no dispositivo (comando "reset").');
    }
    if (await VaultModel.obterPorPublicKey(publicKey)) {
      throw new ApiError(409, 'Esta chave já está vinculada a outra conta.');
    }
    if (d.chave_anunciada !== publicKey) {
      await AuditModel.log({ userId: d.user_id, action: 'DEVICE_ANNOUNCED', detail: `Dispositivo ${serial} ligado (código ${codigo})`, ip: req.ip });
    }
    await DeviceModel.registrarAnuncio(d.id, publicKey);
    res.json({ success: true, data: { estado: 'AGUARDANDO_PAREAMENTO', codigo } });
  }),

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
    // Opcional: backup inicial já cifrado pelo navegador (pareamento com o hardware real)
    let backupInicial: Buffer | null = null;
    if (req.body?.backup_inicial != null) {
      backupInicial = decodificarPayload(req.body.backup_inicial);
      exigirEspaco(req.user!.plan, backupInicial);
    }

    const hashContDono = await hashComPepper(prova);

    const resultado = await VaultModel.parearHardware({ userId, publicKey, hashContDono, dispositivoId, backupInicial });
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
