// server/src/controllers/VaultAcessoController.ts
// ============================================================
// ACESSO AO COFRE EM SITUAÇÕES ESPECIAIS
//
//  1) Abrir o cofre em OUTRO aparelho (Krypta Pro), só leitura
//     POST /api/vault/backup/ccp      (token do SITE) { prova_cont_dono }
//     → devolve o backup CIFRADO. Quem abre é o navegador, com a CCP.
//       O servidor continua sem ver nada. Fica registrado nos alertas e por e-mail.
//
//  2) "Esqueci a CCP, mas estou com o dispositivo" (todos os planos)
//     POST /api/vault/ccp/reset       (token do DISPOSITIVO)
//       { password, prova_cont_dono_nova, version_counter, payload_cifrado }
//     Precisa do dispositivo (que tem a chave do cofre) + a senha do site.
//     Nada se perde: o dispositivo refaz o envelope com a CCP nova.
//
//  3) "Perdi a CCP e o dispositivo" → ABANDONAR O COFRE (todos os planos)
//     POST /api/vault/abandon/request (token do SITE) { password }  → código por e-mail
//     POST /api/vault/abandon/confirm (token do SITE) { codigo }    → cofre apagado
//     Sem a CCP nem o dispositivo, ninguém (nem o Krypta) consegue abrir o
//     backup. Ele é descartado e a conta volta a "aguardando pareamento",
//     pronta para um cofre novo. A conta, o plano e as compras continuam.
// ============================================================
import type { Response } from 'express';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decodificarPayload, validarProva, validarVersionCounter } from '../utils/vaultValidators.js';
import { hashComPepper } from '../utils/pepper.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { query } from '../config/database.js';
import { VaultModel } from '../models/VaultModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { UserModel } from '../models/UserModel.js';
import { EmailService } from '../services/EmailService.js';
import { descreverCliente } from '../middlewares/cliente.js';
import { conferirProvaDono, exigirConta, exigirEspaco, exigirRecurso, resultadoOuErro } from '../services/VaultRules.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

const MINUTOS_CODIGO = 15;
const MAX_TENTATIVAS = 5;

async function exigirSenha(userId: string, senha: unknown) {
  if (typeof senha !== 'string' || !senha) throw new ApiError(400, 'Digite a senha da sua conta para confirmar.');
  const user = await UserModel.findById(userId);
  if (!user) throw new ApiError(404, 'Conta não encontrada.');
  if (!(await comparePassword(senha, user.password_hash))) throw new ApiError(401, 'Senha incorreta.');
  return user;
}

export const VaultAcessoController = {
  // ------------------------------------------------------------
  // 1) POST /api/vault/backup/ccp   (Pro) — ver o cofre em outro aparelho
  // ------------------------------------------------------------
  abrirComCcp: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    exigirRecurso(req.user!.plan, 'multiAparelho');
    const prova = validarProva(req.body?.prova_cont_dono);

    const conta = await exigirConta(userId);
    if (conta.status === 'PENDENTE_PAREAMENTO') throw new ApiError(409, 'Este cofre ainda não foi ativado.');
    await conferirProvaDono(userId, prova);

    const backup = await VaultModel.obterBackupCifrado(userId);
    if (!backup) throw new ApiError(404, 'O cofre ainda não tem backup. Abra o Krypta no dispositivo pareado uma vez.');

    await AuditModel.log({
      userId,
      action: 'VAULT_OPENED_CCP',
      detail: `Cofre aberto com a CCP em outro aparelho (${descreverCliente(req.cliente)}, só leitura)`,
      ip: req.ip,
      status: 'warning',
    });
    const user = req.user!;
    EmailService.notifyVaultEvent(user.email, user.name, 'Seu cofre foi aberto em outro aparelho', `Seu cofre foi aberto com a chave de contingência (CCP) ${descreverCliente(req.cliente)}, em modo só leitura.`);

    res.json({
      success: true,
      data: {
        payload_cifrado: backup.payload.toString('base64'),
        version_counter: backup.version_counter,
        atualizado_em: backup.atualizado_em,
      },
    });
  }),

  // ------------------------------------------------------------
  // 2) POST /api/vault/ccp/reset   (dispositivo + senha) — CCP nova
  // ------------------------------------------------------------
  resetCcp: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const user = await exigirSenha(userId, req.body?.password);
    const provaNova = validarProva(req.body?.prova_cont_dono_nova, 'prova_cont_dono_nova');
    const versionCounter = validarVersionCounter(req.body?.version_counter);
    const payload = decodificarPayload(req.body?.payload_cifrado);
    exigirEspaco(user.plan, payload);

    const r = await VaultModel.redefinirCcpPeloDispositivo({
      userId,
      publicKey: req.vault!.publicKey!,
      novoHash: await hashComPepper(provaNova),
      payload,
      versionCounter,
    });
    const data = resultadoOuErro(r, (s) => `Cofre no estado ${s}: a CCP nova exige cofre ATIVO.`);

    await AuditModel.log({ userId, action: 'VAULT_CCP_RESET', detail: 'CCP nova criada pelo dispositivo (a anterior foi esquecida)', ip: req.ip, status: 'warning' });
    EmailService.notifyVaultEvent(user.email, user.name, 'Sua chave de contingência foi trocada', 'Uma nova chave de contingência (CCP) foi criada no dispositivo do seu cofre. A CCP antiga não vale mais.');

    res.json({ success: true, data });
  }),

  // ------------------------------------------------------------
  // 3a) POST /api/vault/abandon/request   { password } → código por e-mail
  // ------------------------------------------------------------
  pedirAbandono: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const user = await exigirSenha(userId, req.body?.password);
    const conta = await exigirConta(userId);
    if (conta.status === 'PENDENTE_PAREAMENTO') throw new ApiError(409, 'Não há cofre ativo para abandonar.');

    const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await query('UPDATE users SET abandono_codigo = ?, abandono_expira = ?, abandono_tentativas = 0 WHERE id = ?', [
      await hashPassword(codigo),
      new Date(Date.now() + MINUTOS_CODIGO * 60_000),
      userId,
    ]);
    const enviado = await EmailService.sendAbandonCode(user.email, codigo, user.name).catch(() => false);
    await AuditModel.log({ userId, action: 'VAULT_ABANDON_REQUEST', detail: 'Pedido para abandonar o cofre (código enviado por e-mail)', ip: req.ip, status: 'warning' });

    res.json({ success: true, data: { enviado, expiraEmMinutos: MINUTOS_CODIGO } });
  }),

  // ------------------------------------------------------------
  // 3b) POST /api/vault/abandon/confirm   { codigo } → cofre descartado
  // ------------------------------------------------------------
  confirmarAbandono: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const codigo = String(req.body?.codigo ?? '').replace(/\D/g, '');
    if (codigo.length !== 6) throw new ApiError(400, 'O código tem 6 números.');

    const rows = await query<{ abandono_codigo: string | null; abandono_expira: Date | null; abandono_tentativas: number }>(
      'SELECT abandono_codigo, abandono_expira, abandono_tentativas FROM users WHERE id = ?',
      [userId]
    );
    const r = rows[0];
    if (!r?.abandono_codigo || !r.abandono_expira || new Date(r.abandono_expira) < new Date()) {
      throw new ApiError(400, 'Código vencido ou não solicitado. Peça um novo.');
    }
    if (r.abandono_tentativas >= MAX_TENTATIVAS) {
      await query('UPDATE users SET abandono_codigo = NULL, abandono_expira = NULL WHERE id = ?', [userId]);
      throw new ApiError(429, 'Muitas tentativas. Peça um novo código.');
    }
    if (!(await comparePassword(codigo, r.abandono_codigo))) {
      await query('UPDATE users SET abandono_tentativas = abandono_tentativas + 1 WHERE id = ?', [userId]);
      throw new ApiError(401, 'Código incorreto.');
    }

    const conta = await VaultModel.abandonarCofre(userId);
    await AuditModel.log({ userId, action: 'VAULT_ABANDONED', detail: 'Cofre abandonado: backup descartado, dispositivo desvinculado', ip: req.ip, status: 'warning' });
    const user = req.user!;
    EmailService.notifyVaultEvent(user.email, user.name, 'Seu cofre foi abandonado', 'O cofre antigo foi descartado e sua conta está pronta para um cofre novo. Sua conta, plano e compras continuam.');

    res.json({ success: true, data: conta });
  }),
};
