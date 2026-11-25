// server/src/controllers/InheritanceController.ts
// ============================================================
// PARTE 6 — HERANÇA DIGITAL
//
//  POST /api/vault/inheritance/enable   (hardware)
//       { prova_cont_dono_atual, prova_cont_herdeiro, version_counter, payload_cifrado }
//       Ativa a herança (opt-in, RN10) ou troca a CCH. A anterior deixa de valer.
//
//  POST /api/vault/inheritance/disable  (hardware)
//       { prova_cont_dono_atual, version_counter, payload_cifrado }
//       O dono retira o consentimento.
//
//  POST /api/vault/inheritance/claim    (PÚBLICO — o herdeiro não tem conta)
//       { conta_id, prova_cont_herdeiro, public_key }
//       Revoga o dispositivo do dono, vincula o do herdeiro e CONSOME a CCH.
//
// O servidor NUNCA guarda nome/contato do herdeiro (RF11, LGPD): isso fica
// dentro do payload cifrado. A autenticação do herdeiro é a prova da CCH.
// ============================================================
import type { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  decodificarPayload,
  validarProva,
  validarPublicKey,
  validarUuid,
  validarVersionCounter,
} from '../utils/vaultValidators.js';
import { compararComPepper, hashComPepper } from '../utils/pepper.js';
import { VaultModel } from '../models/VaultModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { UserModel } from '../models/UserModel.js';
import { EmailService } from '../services/EmailService.js';
import { conferirProvaDono, exigirConta, exigirEspaco, exigirRecurso, resultadoOuErro } from '../services/VaultRules.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

// Mesma mensagem para TODO tipo de falha no resgate: conta inexistente,
// herança desativada, CCH errada ou já usada. Não revela nada a quem testa.
const ERRO_CREDENCIAIS = 'Credenciais de herança inválidas.';

// Hash "de mentira" para comparar quando não existe CCH: assim o tempo de
// resposta é o mesmo e o timing não revela quais contas têm herança.
let hashFalso: Promise<string> | null = null;
const obterHashFalso = () => (hashFalso ??= hashComPepper('herdeiro-inexistente'));

const mensagemEstado = (s: string) => `Cofre no estado ${s}: alterar a herança exige cofre ATIVO.`;

/** Dono com cofre ATIVO e a prova da CCP correta. Devolve o hash conferido. */
async function exigirDonoAtivo(userId: string, provaAtual: string): Promise<string> {
  const conta = await exigirConta(userId);
  if (conta.status !== 'ATIVA') throw new ApiError(409, mensagemEstado(conta.status));
  return conferirProvaDono(userId, provaAtual, 'Prova de contingência atual inválida.');
}

export const InheritanceController = {
  // ------------------------------------------------------------
  // POST /api/vault/inheritance/enable
  // ------------------------------------------------------------
  enable: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    exigirRecurso(req.user!.plan, 'heranca'); // Krypta Pro
    const provaAtual = validarProva(req.body?.prova_cont_dono_atual, 'prova_cont_dono_atual');
    const provaHerdeiro = validarProva(req.body?.prova_cont_herdeiro, 'prova_cont_herdeiro');
    if (provaAtual === provaHerdeiro) {
      throw new ApiError(400, 'A prova do herdeiro deve ser diferente da prova do dono.');
    }
    const versionCounter = validarVersionCounter(req.body?.version_counter);
    const payload = decodificarPayload(req.body?.payload_cifrado);
    exigirEspaco(req.user!.plan, payload);

    const hashDonoAtual = await exigirDonoAtivo(userId, provaAtual);
    const novoHashHerdeiro = await hashComPepper(provaHerdeiro);

    const r = await VaultModel.definirHerdeiro({
      userId,
      hashDonoAtual,
      novoHashHerdeiro,
      payload,
      versionCounter,
    });
    const data = resultadoOuErro(r, mensagemEstado);

    await AuditModel.log({
      userId,
      action: 'VAULT_INHERITANCE_ENABLED',
      detail: 'Herança digital ativada ou chave do herdeiro trocada',
      ip: req.ip,
    });

    res.json({ success: true, data });
  }),

  // ------------------------------------------------------------
  // POST /api/vault/inheritance/disable
  // ------------------------------------------------------------
  disable: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const provaAtual = validarProva(req.body?.prova_cont_dono_atual, 'prova_cont_dono_atual');
    const versionCounter = validarVersionCounter(req.body?.version_counter);
    const payload = decodificarPayload(req.body?.payload_cifrado);
    exigirEspaco(req.user!.plan, payload);

    const hashDonoAtual = await exigirDonoAtivo(userId, provaAtual);

    const r = await VaultModel.definirHerdeiro({
      userId,
      hashDonoAtual,
      novoHashHerdeiro: null,
      payload,
      versionCounter,
    });
    const data = resultadoOuErro(r, mensagemEstado);

    await AuditModel.log({
      userId,
      action: 'VAULT_INHERITANCE_DISABLED',
      detail: 'Herança digital desativada',
      ip: req.ip,
    });

    res.json({ success: true, data });
  }),

  // ------------------------------------------------------------
  // POST /api/vault/inheritance/claim   (público)
  // ------------------------------------------------------------
  claim: asyncHandler(async (req: Request, res: Response) => {
    const userId = validarUuid(req.body?.conta_id, 'conta_id');
    const provaHerdeiro = validarProva(req.body?.prova_cont_herdeiro, 'prova_cont_herdeiro');
    const publicKey = validarPublicKey(req.body?.public_key);

    // SEMPRE roda um bcrypt, exista CCH ou não (tempo de resposta constante)
    const hash = await VaultModel.obterHashHerdeiro(userId);
    const confere = await compararComPepper(provaHerdeiro, hash ?? (await obterHashFalso()));
    if (!hash || !confere) throw new ApiError(401, ERRO_CREDENCIAIS);

    const r = await VaultModel.resgatar({ userId, hashHerdeiroVerificado: hash, publicKey });

    switch (r.resultado) {
      case 'OK': {
        await AuditModel.log({
          userId,
          action: 'VAULT_INHERITANCE_CLAIMED',
          detail: 'Herança resgatada: dispositivo do dono revogado, dispositivo do herdeiro vinculado',
          ip: req.ip,
          status: 'warning',
        });
        // Avisa o dono (best-effort)
        const dono = await UserModel.findById(userId);
        if (dono) EmailService.notifyInheritanceClaim(dono.email, dono.name);
        // Sem e-mail na resposta: o herdeiro não precisa saber dados do dono
        res.json({ success: true, data: r.conta });
        return;
      }
      case 'SEM_CONTA':
      case 'HERANCA_INDISPONIVEL':
        throw new ApiError(401, ERRO_CREDENCIAIS);
      case 'ESTADO':
        throw new ApiError(409, 'O cofre está num estado que não permite o resgate.');
      case 'CHAVE_REVOGADA':
        throw new ApiError(409, 'Este dispositivo foi revogado e não pode ser vinculado novamente.');
      case 'CHAVE_EM_USO':
        throw new ApiError(409, 'Este dispositivo já está vinculado a uma conta.');
    }
  }),
};
