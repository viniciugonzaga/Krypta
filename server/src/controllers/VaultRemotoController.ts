// server/src/controllers/VaultRemotoController.ts
// ============================================================
// v1.2.0 — COFRE EM QUALQUER APARELHO + PONTOS DE RESTAURAÇÃO
//
// A) SENHA DE ACESSO AO COFRE (v1.5.0: todos os planos com SENHA; PIN de 6 dígitos só no Pro)
//    O usuário cria um PIN de 6 dígitos (ou uma senha) UMA vez, provando a CCP.
//    Depois, em qualquer aparelho logado na conta, o PIN abre o cofre com
//    leitura E edição, sem precisar da CCP.
//
//    GET  /api/vault/remoto                 (site)   estado + salt
//    POST /api/vault/remoto/preparar        (site)   { prova_cont_dono }
//         → { salt, segredo, payload_cifrado }   (o navegador abre com a CCP)
//    POST /api/vault/remoto/ativar          (site)   { prova_cont_dono, prova_pin, envelope, tipo }
//    POST /api/vault/remoto/abrir           (site)   { prova_pin }
//         → { token_cofre, envelope, segredo, salt, payload_cifrado, version_counter }
//    POST /api/vault/remoto/remover         (site)   { password }
//    GET  /api/vault/remoto/backup          (site + X-Krypta-Cofre)
//    PUT  /api/vault/remoto/backup          (site + X-Krypta-Cofre) { version_counter, payload_cifrado, resumo }
//
//    O que o servidor vê: a PROVA do PIN (bcrypt+pepper), o envelope cifrado
//    e o segredo dele mesmo (cifrado com o pepper). Nunca o PIN nem a chave.
//    5 PINs errados → bloqueia. Desbloquear = configurar de novo com a CCP.
//
// B) PONTOS DE RESTAURAÇÃO ("salvar estado do cofre") — todos os planos
//    GET  /api/vault/pontos                          (site)
//    POST /api/vault/pontos                          (site) { prova_cont_dono, nome }
//    POST /api/vault/pontos/:id/restaurar            (site) { prova_cont_dono }
//    POST /api/vault/pontos/:id/apagar               (site) { prova_cont_dono }
//    Criar, restaurar e apagar exigem a CCP. Antes de restaurar, o estado
//    atual vira um ponto automático (dá para desfazer a restauração).
//
// C) SINCRONIA DO DISPOSITIVO PAREADO
//    GET  /api/vault/backup/sync?desde=N    (dispositivo)
//    Se outro aparelho editou o cofre, o dispositivo puxa a versão nova.
// ============================================================
import type { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decodificarPayload, validarProva, validarUuid, validarVersionCounter } from '../utils/vaultValidators.js';
import { compararComPepper, hashComPepper } from '../utils/pepper.js';
import { comparePassword } from '../utils/hash.js';
import { abrirSegredo, geracaoDe, gerarTokenCofre, novoSegredo, verificarTokenCofre, MINUTOS_TOKEN_COFRE } from '../utils/cofreRemoto.js';
import { VaultModel } from '../models/VaultModel.js';
import { CofreRemotoModel } from '../models/CofreRemotoModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { UserModel } from '../models/UserModel.js';
import { EmailService } from '../services/EmailService.js';
import { descreverCliente } from '../middlewares/cliente.js';
import { regrasDe } from '../config/planos.js';
import { conferirProvaDono, exigirConta, exigirEspaco, exigirRecurso, resultadoOuErro } from '../services/VaultRules.js';
import type { VaultRequest } from '../middlewares/vaultAuth.js';

export const MAX_ERROS_PIN = 5;

// ------------------------------------------------------------
// Validações
// ------------------------------------------------------------
function validarEnvelope(valor: unknown): string {
  if (typeof valor !== 'string' || valor.length > 512) throw new ApiError(400, 'envelope inválido.');
  try {
    const e = JSON.parse(valor) as { iv?: unknown; ct?: unknown };
    if (typeof e.iv !== 'string' || typeof e.ct !== 'string') throw new Error();
  } catch {
    throw new ApiError(400, 'envelope inválido.');
  }
  return valor;
}

export interface ResumoAlteracao {
  adicionadas: number;
  editadas: number;
  removidas: number;
}

/** Só CONTAGENS: nomes de serviço nunca chegam ao servidor (zero-knowledge) */
export function lerResumo(valor: unknown): ResumoAlteracao | null {
  if (!valor || typeof valor !== 'object') return null;
  const v = valor as Record<string, unknown>;
  const n = (x: unknown) => (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 100_000 ? (x as number) : 0);
  const r = { adicionadas: n(v.adicionadas), editadas: n(v.editadas), removidas: n(v.removidas) };
  return r.adicionadas + r.editadas + r.removidas > 0 ? r : null;
}

export function textoResumo(r: ResumoAlteracao): string {
  const partes: string[] = [];
  if (r.adicionadas) partes.push(`${r.adicionadas} adicionada${r.adicionadas > 1 ? 's' : ''}`);
  if (r.editadas) partes.push(`${r.editadas} editada${r.editadas > 1 ? 's' : ''}`);
  if (r.removidas) partes.push(`${r.removidas} removida${r.removidas > 1 ? 's' : ''}`);
  return partes.join(', ');
}

function validarNome(valor: unknown): string {
  const nome = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (!nome) return `Ponto de ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`.slice(0, 60);
  if (nome.length > 60) throw new ApiError(400, 'O nome do ponto tem no máximo 60 caracteres.');
  return nome;
}

async function exigirAtiva(userId: string) {
  const conta = await exigirConta(userId);
  if (conta.status !== 'ATIVA') {
    throw new ApiError(409, conta.status === 'PENDENTE_PAREAMENTO' ? 'Este cofre ainda não foi ativado.' : `O cofre está em ${conta.status}: resolva isso no dispositivo antes.`);
  }
  return conta;
}

function backupJson(b: { payload: Buffer; version_counter: number; atualizado_em: Date }) {
  return { payload_cifrado: Buffer.from(b.payload).toString('base64'), version_counter: b.version_counter, atualizado_em: b.atualizado_em };
}

// ------------------------------------------------------------
// Middleware: token do cofre (header X-Krypta-Cofre), depois do token do site
// ------------------------------------------------------------
const SESSAO_COFRE_FIM = 'A sessão do cofre terminou. Digite a senha de acesso de novo.';

export async function exigirSessaoCofre(req: VaultRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const bruto = req.headers['x-krypta-cofre'];
    if (typeof bruto !== 'string' || !bruto) throw new ApiError(401, SESSAO_COFRE_FIM, { motivo: 'COFRE_REMOTO' });
    let p;
    try {
      p = verificarTokenCofre(bruto);
    } catch {
      throw new ApiError(401, SESSAO_COFRE_FIM, { motivo: 'COFRE_REMOTO' });
    }
    const userId = req.vault!.userId;
    if (p.userId !== userId || !req.jti || p.sid !== req.jti) throw new ApiError(401, SESSAO_COFRE_FIM, { motivo: 'COFRE_REMOTO' });
    const acesso = await CofreRemotoModel.obter(userId);
    if (!acesso?.ativo || acesso.bloqueado || geracaoDe(acesso.criado_em) !== p.g) {
      throw new ApiError(401, SESSAO_COFRE_FIM, { motivo: 'COFRE_REMOTO' });
    }
    exigirRecurso(req.user!.plan, 'acessoRemoto');
    next();
  } catch (err) {
    next(err);
  }
}

export const VaultRemotoController = {
  // ============================================================
  // A) SENHA DE ACESSO
  // ============================================================
  estado: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const a = await CofreRemotoModel.obter(userId);
    res.json({
      success: true,
      data: {
        disponivel: regrasDe(req.user!.plan).acessoRemoto,
        pinPermitido: regrasDe(req.user!.plan).pinCofre,
        configurado: !!a?.ativo,
        bloqueado: !!a?.bloqueado,
        tipo: a?.ativo ? a.tipo : null,
        salt: a?.ativo && !a.bloqueado ? a.salt : null,
        tentativasRestantes: a?.ativo ? Math.max(0, MAX_ERROS_PIN - a.tentativas) : MAX_ERROS_PIN,
        criadoEm: a?.ativo ? a.criado_em : null,
        ultimoUso: a?.ultimo_uso ?? null,
      },
    });
  }),

  preparar: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    exigirRecurso(req.user!.plan, 'acessoRemoto');
    const prova = validarProva(req.body?.prova_cont_dono);
    await exigirAtiva(userId);
    await conferirProvaDono(userId, prova, 'Chave de contingência incorreta.');

    const backup = await VaultModel.obterBackupCifrado(userId);
    if (!backup) throw new ApiError(404, 'O cofre ainda não tem backup. Abra o Krypta no dispositivo pareado uma vez.');

    const salt = crypto.randomBytes(16).toString('base64');
    const { segredo, cifrado } = novoSegredo();
    await CofreRemotoModel.preparar(userId, salt, cifrado);

    res.json({ success: true, data: { salt, segredo, ...backupJson(backup) } });
  }),

  ativar: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    exigirRecurso(req.user!.plan, 'acessoRemoto');
    const prova = validarProva(req.body?.prova_cont_dono);
    const provaPin = validarProva(req.body?.prova_pin, 'prova_pin');
    const envelope = validarEnvelope(req.body?.envelope);
    const tipo = req.body?.tipo === 'SENHA' ? 'SENHA' : 'PIN';
    if (tipo === 'PIN' && !regrasDe(req.user!.plan).pinCofre) {
      throw new ApiError(403, 'O PIN de 6 dígitos é do Krypta Pro. No Free, crie uma senha de acesso (8+ caracteres).', { motivo: 'PLANO', recurso: 'pinCofre' });
    }
    await exigirAtiva(userId);
    await conferirProvaDono(userId, prova, 'Chave de contingência incorreta.');

    const ok = await CofreRemotoModel.ativar(userId, tipo, await hashComPepper(provaPin), envelope);
    if (!ok) throw new ApiError(409, 'Configuração expirada. Comece de novo.');

    await AuditModel.log({
      userId,
      action: 'VAULT_REMOTE_SETUP',
      detail: `Senha de acesso ao cofre (${tipo === 'PIN' ? 'PIN de 6 dígitos' : 'senha'}) criada ${descreverCliente(req.cliente)}`,
      ip: req.ip,
      status: 'warning',
    });
    const user = req.user!;
    EmailService.notifyVaultEvent(user.email, user.name, 'Senha de acesso ao cofre criada', `Uma senha de acesso ao cofre foi criada ${descreverCliente(req.cliente)}. Com ela, seus aparelhos logados abrem e editam o cofre. Se não foi você, entre no Krypta e remova o acesso.`);
    res.json({ success: true, data: { configurado: true, tipo } });
  }),

  abrir: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    exigirRecurso(req.user!.plan, 'acessoRemoto');
    const provaPin = validarProva(req.body?.prova_pin, 'prova_pin');
    await exigirAtiva(userId);

    const a = await CofreRemotoModel.obter(userId);
    if (!a?.ativo || !a.hash_prova || !a.envelope) throw new ApiError(404, 'Você ainda não criou a senha de acesso ao cofre.');
    if (a.bloqueado) throw new ApiError(423, 'Senha de acesso bloqueada por tentativas erradas. Crie outra com a chave de contingência.', { motivo: 'BLOQUEADO' });
    // v1.5.0: quem voltou para o Free com um PIN de acesso precisa criar uma senha
    if (a.tipo === 'PIN' && !regrasDe(req.user!.plan).pinCofre) {
      throw new ApiError(403, 'Seu acesso é um PIN, que é do Krypta Pro. Crie uma senha de acesso (8+ caracteres) com a chave de contingência.', { motivo: 'PLANO', recurso: 'pinCofre' });
    }

    const user = req.user!;
    if (!(await compararComPepper(provaPin, a.hash_prova))) {
      const r = await CofreRemotoModel.registrarErro(userId, MAX_ERROS_PIN);
      const restantes = Math.max(0, MAX_ERROS_PIN - r.tentativas);
      await AuditModel.log({
        userId,
        action: r.bloqueado ? 'VAULT_REMOTE_LOCKED' : 'VAULT_REMOTE_FAILED',
        detail: r.bloqueado
          ? `Senha de acesso BLOQUEADA após ${MAX_ERROS_PIN} erros (${descreverCliente(req.cliente)})`
          : `Senha de acesso errada ${descreverCliente(req.cliente)} (${restantes} tentativa(s) restante(s))`,
        ip: req.ip,
        status: r.bloqueado ? 'error' : 'warning',
      });
      if (r.bloqueado) {
        EmailService.notifyVaultEvent(user.email, user.name, 'Senha de acesso ao cofre bloqueada', `Erraram a senha de acesso ao seu cofre ${MAX_ERROS_PIN} vezes ${descreverCliente(req.cliente)}. Ela foi bloqueada. Para usar de novo, crie outra com a sua chave de contingência. Se não foi você, troque a senha da conta.`);
        throw new ApiError(423, 'Senha de acesso bloqueada por tentativas erradas. Crie outra com a chave de contingência.', { motivo: 'BLOQUEADO' });
      }
      throw new ApiError(401, `Senha de acesso incorreta. ${restantes} tentativa(s) antes de bloquear.`, { motivo: 'PIN', restantes: String(restantes) });
    }
    if (!req.jti) throw new ApiError(401, 'Entre de novo na sua conta para abrir o cofre.');

    const backup = await VaultModel.obterBackupCifrado(userId);
    if (!backup) throw new ApiError(404, 'O cofre ainda não tem backup.');
    await CofreRemotoModel.registrarUso(userId);
    const { token, expiraEm } = gerarTokenCofre(userId, req.jti, geracaoDe(a.criado_em));

    await AuditModel.log({ userId, action: 'VAULT_REMOTE_OPENED', detail: `Cofre aberto com a senha de acesso ${descreverCliente(req.cliente)}`, ip: req.ip, status: 'warning' });
    EmailService.notifyVaultEvent(user.email, user.name, 'Seu cofre foi aberto em um aparelho', `Seu cofre foi aberto com a senha de acesso ${descreverCliente(req.cliente)}. Se não foi você, entre no Krypta, remova a senha de acesso e troque a senha da conta.`);

    res.json({
      success: true,
      data: {
        token_cofre: token,
        expira_em: expiraEm,
        minutos: MINUTOS_TOKEN_COFRE,
        envelope: a.envelope,
        segredo: abrirSegredo(a.segredo_cifrado),
        salt: a.salt,
        tipo: a.tipo,
        ...backupJson(backup),
      },
    });
  }),

  remover: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const senha = req.body?.password;
    if (typeof senha !== 'string' || !senha) throw new ApiError(400, 'Digite a senha da sua conta para confirmar.');
    const user = await UserModel.findById(userId);
    if (!user || !(await comparePassword(senha, user.password_hash))) throw new ApiError(401, 'Senha incorreta.');

    await CofreRemotoModel.remover(userId);
    await AuditModel.log({ userId, action: 'VAULT_REMOTE_REMOVED', detail: `Senha de acesso ao cofre removida ${descreverCliente(req.cliente)}`, ip: req.ip, status: 'warning' });
    res.json({ success: true, data: { configurado: false } });
  }),

  baixarRemoto: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    await exigirAtiva(userId);
    const backup = await VaultModel.obterBackupCifrado(userId);
    if (!backup) throw new ApiError(404, 'O cofre ainda não tem backup.');
    res.json({ success: true, data: backupJson(backup) });
  }),

  gravarRemoto: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const versionCounter = validarVersionCounter(req.body?.version_counter);
    const payload = decodificarPayload(req.body?.payload_cifrado);
    exigirEspaco(req.user!.plan, payload);
    const resumo = lerResumo(req.body?.resumo);

    const r = await CofreRemotoModel.gravarRemoto({ userId, payload, versionCounter });
    if (r.resultado === 'ENVELOPE') throw new ApiError(400, 'Um aparelho remoto não pode trocar as chaves de contingência do cofre.');
    if (r.resultado === 'FORMATO') throw new ApiError(409, 'O formato deste cofre não aceita edição remota.');
    if (r.resultado === 'VERSAO') throw new ApiError(409, 'O cofre mudou em outro aparelho. Recarregue e tente de novo.', { motivo: 'VERSAO' });
    const data = resultadoOuErro(r, (s) => `O cofre está em ${s}: edição remota só com o cofre ATIVO.`);

    await AuditModel.log({
      userId,
      action: 'VAULT_EDITED',
      detail: `Cofre editado ${descreverCliente(req.cliente)} com a senha de acesso${resumo ? `: ${textoResumo(resumo)}` : ''} (versão ${data.version_counter})`,
      ip: req.ip,
      status: 'success',
    });
    res.json({ success: true, data });
  }),

  // ============================================================
  // C) SINCRONIA DO DISPOSITIVO PAREADO
  // ============================================================
  sincronizar: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const desde = Number(req.query.desde ?? 0);
    const conta = await exigirConta(userId);
    if (conta.status !== 'ATIVA') throw new ApiError(403, 'Sincronização só com o cofre ATIVO.');
    const meta = await VaultModel.obterMetadadosBackup(userId);
    if (!meta || meta.version_counter <= (Number.isFinite(desde) ? desde : 0)) {
      res.json({ success: true, data: { atualizado: false, version_counter: meta?.version_counter ?? 0 } });
      return;
    }
    const backup = await VaultModel.obterBackupCifrado(userId);
    res.json({ success: true, data: { atualizado: true, ...backupJson(backup!) } });
  }),

  // ============================================================
  // B) PONTOS DE RESTAURAÇÃO
  // ============================================================
  listarPontos: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const pontos = await CofreRemotoModel.listarPontos(userId);
    res.json({
      success: true,
      data: { pontos, limite: regrasDe(req.user!.plan).pontosRestauracao, manuais: pontos.filter((p) => !p.automatico).length },
    });
  }),

  criarPonto: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const prova = validarProva(req.body?.prova_cont_dono);
    const nome = validarNome(req.body?.nome);
    await exigirAtiva(userId);
    await conferirProvaDono(userId, prova, 'Chave de contingência incorreta.');

    const limite = regrasDe(req.user!.plan).pontosRestauracao;
    if ((await CofreRemotoModel.contarManuais(userId)) >= limite) {
      throw new ApiError(409, `Seu plano guarda até ${limite} pontos. Apague um antigo${limite < 20 ? ' ou assine o Krypta Pro (até 20)' : ''}.`, { motivo: 'PLANO', recurso: 'pontosRestauracao' });
    }
    const ponto = await CofreRemotoModel.criarPonto(userId, nome);
    if (!ponto) throw new ApiError(404, 'O cofre ainda não tem backup.');

    await AuditModel.log({ userId, action: 'VAULT_SNAPSHOT_CREATED', detail: `Ponto de restauração "${nome}" salvo (versão ${ponto.versao_origem}) ${descreverCliente(req.cliente)}`, ip: req.ip, status: 'success' });
    res.status(201).json({ success: true, data: ponto });
  }),

  restaurarPonto: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const id = validarUuid(req.params.id);
    const prova = validarProva(req.body?.prova_cont_dono);
    await exigirAtiva(userId);
    await conferirProvaDono(userId, prova, 'Chave de contingência incorreta.');

    const r = await CofreRemotoModel.restaurarPonto(userId, id);
    if (r.resultado === 'SEM_PONTO') throw new ApiError(404, 'Ponto de restauração não encontrado.');
    if (r.resultado === 'FORMATO') throw new ApiError(404, 'O cofre ainda não tem backup.');
    const data = resultadoOuErro(r, (s) => `O cofre está em ${s}: restauração só com o cofre ATIVO.`);
    const nome = 'nome' in r ? r.nome : '';

    await AuditModel.log({ userId, action: 'VAULT_SNAPSHOT_RESTORED', detail: `Cofre voltou ao ponto "${nome}" ${descreverCliente(req.cliente)} (nova versão ${data.version_counter})`, ip: req.ip, status: 'warning' });
    const user = req.user!;
    EmailService.notifyVaultEvent(user.email, user.name, 'Seu cofre foi restaurado', `Seu cofre voltou ao ponto de restauração "${nome}". O estado anterior foi guardado como ponto automático, caso queira desfazer.`);
    res.json({ success: true, data });
  }),

  apagarPonto: asyncHandler<VaultRequest>(async (req, res: Response) => {
    const userId = req.vault!.userId;
    const id = validarUuid(req.params.id);
    const prova = validarProva(req.body?.prova_cont_dono);
    await conferirProvaDono(userId, prova, 'Chave de contingência incorreta.');
    if (!(await CofreRemotoModel.apagarPonto(userId, id))) throw new ApiError(404, 'Ponto de restauração não encontrado.');
    await AuditModel.log({ userId, action: 'VAULT_SNAPSHOT_DELETED', detail: `Ponto de restauração apagado ${descreverCliente(req.cliente)}`, ip: req.ip, status: 'warning' });
    res.json({ success: true, data: { apagado: true } });
  }),
};
