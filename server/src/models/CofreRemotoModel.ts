// server/src/models/CofreRemotoModel.ts
// ============================================================
// SQL da SENHA DE ACESSO AO COFRE e dos PONTOS DE RESTAURAÇÃO (v1.2.0)
// Tabelas: cofre_acesso_remoto, cofre_pontos (migração 007).
// Só SQL e transações: as regras ficam no VaultRemotoController.
// ============================================================
import crypto from 'crypto';
import { execute, query, withTransaction } from '../config/database.js';
import { gravarBackupTx, travarConta, VersaoRecusada, tratarVersaoRecusada, type ResultadoGravacao } from './VaultModel.js';

export interface AcessoRemoto {
  user_id: string;
  tipo: 'PIN' | 'SENHA';
  salt: string;
  hash_prova: string | null;
  envelope: string | null;
  segredo_cifrado: string;
  tentativas: number;
  bloqueado: boolean;
  ativo: boolean;
  criado_em: Date;
  ultimo_uso: Date | null;
}

export interface PontoRestauracao {
  id: string;
  nome: string;
  versao_origem: number;
  automatico: boolean;
  criado_em: Date;
  tamanho: number;
}

/** Quantos pontos AUTOMÁTICOS (antes de restaurar) ficam guardados */
export const MAX_PONTOS_AUTOMATICOS = 3;

// ------------------------------------------------------------
// vault.enc: o servidor só lê a "casca" JSON (dados continua cifrado)
// ------------------------------------------------------------
export interface CascaVault {
  formato: string;
  dados: { iv: string; ct: string };
  envelope_ccp: unknown;
  envelope_herdeiro?: unknown;
  [k: string]: unknown;
}

export function lerCasca(payload: Buffer): CascaVault | null {
  try {
    const v = JSON.parse(payload.toString('utf8')) as CascaVault;
    if (typeof v?.formato !== 'string' || !v.dados?.iv || !v.dados?.ct || !v.envelope_ccp) return null;
    return v;
  } catch {
    return null;
  }
}

export const CofreRemotoModel = {
  // ============================================================
  // SENHA DE ACESSO
  // ============================================================
  async obter(userId: string): Promise<AcessoRemoto | null> {
    const rows = await query<Omit<AcessoRemoto, 'bloqueado' | 'ativo'> & { bloqueado: number; ativo: number }>(
      'SELECT * FROM cofre_acesso_remoto WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const r = rows[0];
    return r ? { ...r, bloqueado: !!r.bloqueado, ativo: !!r.ativo } : null;
  },

  /** Passo 1 da configuração: novo segredo + salt (ainda inativo). Invalida a senha anterior. */
  async preparar(userId: string, salt: string, segredoCifrado: string): Promise<void> {
    await query(
      `INSERT INTO cofre_acesso_remoto (user_id, tipo, salt, hash_prova, envelope, segredo_cifrado, tentativas, bloqueado, ativo, criado_em)
       VALUES (?, 'PIN', ?, NULL, NULL, ?, 0, 0, 0, ?)
       ON DUPLICATE KEY UPDATE salt = VALUES(salt), hash_prova = NULL, envelope = NULL,
         segredo_cifrado = VALUES(segredo_cifrado), tentativas = 0, bloqueado = 0, ativo = 0, criado_em = VALUES(criado_em)`,
      [userId, salt, segredoCifrado, new Date()]
    );
  },

  /** Passo 2: grava a prova do PIN e o envelope e liga o acesso */
  async ativar(userId: string, tipo: 'PIN' | 'SENHA', hashProva: string, envelope: string): Promise<boolean> {
    const r = await execute(
      `UPDATE cofre_acesso_remoto SET tipo = ?, hash_prova = ?, envelope = ?, ativo = 1, tentativas = 0, bloqueado = 0, criado_em = ?
        WHERE user_id = ? AND ativo = 0`,
      [tipo, hashProva, envelope, new Date(), userId]
    );
    return r.affectedRows > 0;
  },

  /** Conta um erro de PIN. Devolve as tentativas e se bloqueou. */
  async registrarErro(userId: string, maximo: number): Promise<{ tentativas: number; bloqueado: boolean }> {
    // MySQL aplica o SET da esquerda para a direita: "tentativas" já vem somado
    await execute(
      'UPDATE cofre_acesso_remoto SET tentativas = tentativas + 1, bloqueado = (tentativas >= ?) WHERE user_id = ?',
      [maximo, userId]
    );
    const r = await this.obter(userId);
    return { tentativas: r?.tentativas ?? maximo, bloqueado: r?.bloqueado ?? true };
  },

  async registrarUso(userId: string): Promise<void> {
    await query('UPDATE cofre_acesso_remoto SET tentativas = 0, ultimo_uso = ? WHERE user_id = ?', [new Date(), userId]);
  },

  async remover(userId: string): Promise<void> {
    await query('DELETE FROM cofre_acesso_remoto WHERE user_id = ?', [userId]);
  },

  /**
   * Gravação feita por OUTRO aparelho (com a senha de acesso).
   * Só em ATIVA, com anti-rollback, e sem deixar trocar/remover os envelopes
   * da CCP e do herdeiro (um aparelho remoto só muda os DADOS).
   */
  async gravarRemoto(params: { userId: string; payload: Buffer; versionCounter: number }): Promise<ResultadoGravacao | { resultado: 'ENVELOPE' } | { resultado: 'FORMATO' }> {
    return withTransaction(async (tx) => {
      const conta = await travarConta(tx, params.userId);
      if (!conta) return { resultado: 'SEM_CONTA' as const };
      if (conta.estado_cofre !== 'ATIVA') return { resultado: 'ESTADO' as const, status: conta.estado_cofre };

      const atual = await tx.query<{ payload_cifrado: Buffer }>('SELECT payload_cifrado FROM backups WHERE user_id = ? FOR UPDATE', [params.userId]);
      const velho = atual[0] ? lerCasca(Buffer.from(atual[0].payload_cifrado)) : null;
      const novo = lerCasca(params.payload);
      if (!velho || !novo) return { resultado: 'FORMATO' as const };
      if (
        JSON.stringify(velho.envelope_ccp) !== JSON.stringify(novo.envelope_ccp) ||
        JSON.stringify(velho.envelope_herdeiro ?? null) !== JSON.stringify(novo.envelope_herdeiro ?? null)
      ) {
        return { resultado: 'ENVELOPE' as const };
      }

      const gravado = await gravarBackupTx(tx, params.userId, params.payload, params.versionCounter);
      if (!gravado) throw new VersaoRecusada();
      return { resultado: 'OK' as const, ...gravado };
    }).catch(tratarVersaoRecusada);
  },

  // ============================================================
  // PONTOS DE RESTAURAÇÃO
  // ============================================================
  async listarPontos(userId: string): Promise<PontoRestauracao[]> {
    const rows = await query<Omit<PontoRestauracao, 'automatico'> & { automatico: number }>(
      `SELECT id, nome, versao_origem, automatico, criado_em, LENGTH(payload_cifrado) AS tamanho
         FROM cofre_pontos WHERE user_id = ? ORDER BY criado_em DESC`,
      [userId]
    );
    return rows.map((r) => ({ ...r, automatico: !!r.automatico, tamanho: Number(r.tamanho) }));
  },

  async contarManuais(userId: string): Promise<number> {
    const r = await query<{ n: number }>('SELECT COUNT(*) AS n FROM cofre_pontos WHERE user_id = ? AND automatico = 0', [userId]);
    return Number(r[0]?.n ?? 0);
  },

  /** Copia o backup ATUAL (cifrado) para um ponto novo */
  async criarPonto(userId: string, nome: string): Promise<PontoRestauracao | null> {
    return withTransaction(async (tx) => {
      const conta = await travarConta(tx, userId);
      if (!conta) return null;
      const b = await tx.query<{ payload_cifrado: Buffer; version_counter: number }>(
        'SELECT payload_cifrado, version_counter FROM backups WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (!b[0]) return null;
      const id = crypto.randomUUID();
      const agora = new Date();
      await tx.execute(
        'INSERT INTO cofre_pontos (id, user_id, nome, payload_cifrado, versao_origem, automatico, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [id, userId, nome, b[0].payload_cifrado, b[0].version_counter, agora]
      );
      return { id, nome, versao_origem: b[0].version_counter, automatico: false, criado_em: agora, tamanho: Buffer.from(b[0].payload_cifrado).length };
    });
  },

  async apagarPonto(userId: string, id: string): Promise<boolean> {
    const r = await execute('DELETE FROM cofre_pontos WHERE id = ? AND user_id = ?', [id, userId]);
    return r.affectedRows > 0;
  },

  /**
   * Restaura um ponto. Numa transação só:
   *   1. guarda o estado ATUAL como ponto automático ("Antes de restaurar…")
   *   2. troca os DADOS do backup pelos do ponto, mantendo os envelopes ATUAIS
   *      (se a CCP foi trocada depois do ponto, o envelope novo continua valendo)
   *   3. sobe o version_counter (o dispositivo pareado puxa na próxima abertura)
   */
  async restaurarPonto(userId: string, id: string): Promise<(ResultadoGravacao & { nome?: string }) | { resultado: 'SEM_PONTO' } | { resultado: 'FORMATO' }> {
    return withTransaction(async (tx) => {
      const conta = await travarConta(tx, userId);
      if (!conta) return { resultado: 'SEM_CONTA' as const };
      if (conta.estado_cofre !== 'ATIVA') return { resultado: 'ESTADO' as const, status: conta.estado_cofre };

      const p = await tx.query<{ nome: string; payload_cifrado: Buffer }>(
        'SELECT nome, payload_cifrado FROM cofre_pontos WHERE id = ? AND user_id = ? LIMIT 1',
        [id, userId]
      );
      if (!p[0]) return { resultado: 'SEM_PONTO' as const };
      const b = await tx.query<{ payload_cifrado: Buffer; version_counter: number }>(
        'SELECT payload_cifrado, version_counter FROM backups WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (!b[0]) return { resultado: 'FORMATO' as const };

      const atual = Buffer.from(b[0].payload_cifrado);
      const doPonto = Buffer.from(p[0].payload_cifrado);
      const cascaAtual = lerCasca(atual);
      const cascaPonto = lerCasca(doPonto);
      // Formato desconhecido (ex.: firmware futuro): volta o arquivo inteiro
      const novo =
        cascaAtual && cascaPonto
          ? Buffer.from(JSON.stringify({ ...cascaAtual, dados: cascaPonto.dados }), 'utf8')
          : doPonto;

      const agora = new Date();
      await tx.execute(
        'INSERT INTO cofre_pontos (id, user_id, nome, payload_cifrado, versao_origem, automatico, criado_em) VALUES (?, ?, ?, ?, ?, 1, ?)',
        [crypto.randomUUID(), userId, `Antes de restaurar "${p[0].nome}"`.slice(0, 60), atual, b[0].version_counter, agora]
      );
      // Mantém só os últimos automáticos
      const autos = await tx.query<{ id: string }>(
        'SELECT id FROM cofre_pontos WHERE user_id = ? AND automatico = 1 ORDER BY criado_em DESC, id',
        [userId]
      );
      for (const a of autos.slice(MAX_PONTOS_AUTOMATICOS)) {
        await tx.execute('DELETE FROM cofre_pontos WHERE id = ?', [a.id]);
      }

      const gravado = await gravarBackupTx(tx, userId, novo, b[0].version_counter + 1);
      if (!gravado) throw new VersaoRecusada();
      return { resultado: 'OK' as const, nome: p[0].nome, ...gravado };
    }).catch(tratarVersaoRecusada);
  },
};
