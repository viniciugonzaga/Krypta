// server/src/models/VaultModel.ts
// ============================================================
// SQL do COFRE (equivale aos repositories da API original:
// contaRepository, backupRepository, ccpRepository e herancaRepository).
// Só SQL: sem validação, sem regra de negócio, sem HTTP.
//
// Nenhuma consulta daqui devolve hash_cont_dono, hash_cont_herdeiro
// nem password_hash, exceto as funções dedicadas a conferir credencial.
//
// Diferenças em relação ao PostgreSQL original:
//   • "contas" virou a tabela "users" (mesma conta do site)
//   • public_key → users.public_key_ed25519
//   • status     → users.estado_cofre
//   • RETURNING  → UPDATE condicional + affectedRows + SELECT
//   • ON CONFLICT DO UPDATE WHERE → SELECT ... FOR UPDATE + INSERT/UPDATE
//
// TRAVAS: toda operação que mexe no backup, nas provas ou na chave
// começa com "SELECT ... FROM users WHERE id = ? FOR UPDATE". Isso
// enfileira as operações da MESMA conta: um Kill Switch e um PUT /backup
// chegando juntos nunca se atropelam.
// ============================================================
import crypto from 'crypto';
import { execute, query, isDuplicateError, withTransaction, type Tx } from '../config/database.js';
import { estaEm, ESTADOS_RESGATE, type EstadoCofre } from '../config/estados.js';

/** "Objeto conta" do contrato da API */
export interface ContaCofre {
  id: string;
  email: string;
  public_key: string | null;
  status: EstadoCofre;
  hardware_uuid: string | null;
  /** De onde veio o dispositivo pareado: SOFTWARE (app/navegador) ou FISICO (comprado) */
  tipo_dispositivo: 'SOFTWARE' | 'FISICO' | null;
  /** Número de série do dispositivo físico comprado (null se for software) */
  dispositivo_serial: string | null;
  heranca_ativa: boolean;
  ultimo_sincronismo: Date;
  criado_em: Date;
}

interface ContaRow {
  id: string;
  email: string;
  public_key: string | null;
  status: EstadoCofre;
  hardware_uuid: string | null;
  tipo_dispositivo: 'SOFTWARE' | 'FISICO' | null;
  dispositivo_serial: string | null;
  heranca_ativa: number;
  ultimo_sincronismo: Date;
  criado_em: Date;
}

const CAMPOS = `
  id,
  email,
  public_key_ed25519 AS public_key,
  estado_cofre AS status,
  hardware_uuid,
  tipo_dispositivo,
  (SELECT d.serial FROM dispositivos d WHERE d.id = users.dispositivo_id) AS dispositivo_serial,
  (hash_cont_herdeiro IS NOT NULL) AS heranca_ativa,
  ultimo_sincronismo,
  created_at AS criado_em`;

function mapear(row: ContaRow | undefined): ContaCofre | null {
  if (!row) return null;
  return { ...row, heranca_ativa: !!row.heranca_ativa };
}

/** Identificador legível de um dispositivo de SOFTWARE, derivado da chave (ex.: SW-7F3A9C1B) */
export function hardwareUuidDe(publicKey: string): string {
  return `SW-${crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 8).toUpperCase()}`;
}

export type ResultadoPareamento = 'OK' | 'ESTADO_INVALIDO' | 'CHAVE_EM_USO' | 'DISPOSITIVO_INDISPONIVEL';

export interface BackupGravado {
  version_counter: number;
  atualizado_em: Date;
}

/** Resultado das operações que gravam backup dentro de uma transação */
export type ResultadoGravacao =
  | ({ resultado: 'OK' } & BackupGravado)
  | { resultado: 'SEM_CONTA' }
  | { resultado: 'ESTADO'; status: EstadoCofre }
  | { resultado: 'HASH_MUDOU' }
  | { resultado: 'VERSAO' };

export type ResultadoResgate =
  | { resultado: 'OK'; conta: { id: string; status: EstadoCofre; public_key: string } }
  | { resultado: 'SEM_CONTA' | 'HERANCA_INDISPONIVEL' | 'ESTADO' | 'CHAVE_EM_USO' | 'CHAVE_REVOGADA' };

interface LinhaTravada {
  estado_cofre: EstadoCofre;
  dispositivo_id: string | null;
  public_key_ed25519: string | null;
  hash_cont_dono: string | null;
  hash_cont_herdeiro: string | null;
}

/** Trava a linha da conta até o fim da transação */
async function travarConta(tx: Tx, userId: string): Promise<LinhaTravada | null> {
  const rows = await tx.query<LinhaTravada>(
    `SELECT estado_cofre, dispositivo_id, public_key_ed25519, hash_cont_dono, hash_cont_herdeiro
       FROM users WHERE id = ? FOR UPDATE`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Grava o backup com ANTI-ROLLBACK: só aceita version_counter
 * ESTRITAMENTE maior que o guardado. Também renova o prazo de
 * inatividade (RN11) na mesma transação.
 * Precisa ser chamada com a conta já travada (travarConta).
 */
async function gravarBackupTx(
  tx: Tx,
  userId: string,
  payload: Buffer,
  versionCounter: number
): Promise<BackupGravado | null> {
  const atual = await tx.query<{ version_counter: number }>(
    'SELECT version_counter FROM backups WHERE user_id = ? FOR UPDATE',
    [userId]
  );
  const agora = new Date();

  if (atual[0]) {
    if (atual[0].version_counter >= versionCounter) return null; // anti-rollback
    await tx.execute(
      'UPDATE backups SET payload_cifrado = ?, version_counter = ?, atualizado_em = ? WHERE user_id = ?',
      [payload, versionCounter, agora, userId]
    );
  } else {
    await tx.execute(
      'INSERT INTO backups (id, user_id, payload_cifrado, version_counter, atualizado_em) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), userId, payload, versionCounter, agora]
    );
  }

  await tx.execute('UPDATE users SET ultimo_sincronismo = ? WHERE id = ?', [agora, userId]);
  return { version_counter: versionCounter, atualizado_em: agora };
}

/**
 * Vincula a chave à conta dentro de uma transação (conta já travada).
 * dispositivoId = unidade FÍSICA comprada; null = dispositivo de SOFTWARE.
 */
async function vincularChaveTx(
  tx: Tx,
  params: { userId: string; publicKey: string; dispositivoId: string | null; novoEstado: EstadoCofre; hashContDono?: string }
): Promise<'OK' | 'DISPOSITIVO_INDISPONIVEL'> {
  let hardwareUuid = hardwareUuidDe(params.publicKey);
  const agora = new Date();

  if (params.dispositivoId) {
    const d = await tx.query<{ serial: string; status: string; user_id: string }>(
      'SELECT serial, status, user_id FROM dispositivos WHERE id = ? FOR UPDATE',
      [params.dispositivoId]
    );
    if (!d[0] || d[0].user_id !== params.userId || d[0].status !== 'DISPONIVEL') return 'DISPOSITIVO_INDISPONIVEL';
    hardwareUuid = d[0].serial;
    await tx.execute(
      `UPDATE dispositivos SET status = 'PAREADO', public_key = ?, pareado_em = ? WHERE id = ?`,
      [params.publicKey, agora, params.dispositivoId]
    );
  }

  await tx.execute(
    `UPDATE users
        SET public_key_ed25519 = ?, hardware_uuid = ?, estado_cofre = ?,
            tipo_dispositivo = ?, dispositivo_id = ?,
            hash_cont_dono = COALESCE(?, hash_cont_dono), ultimo_sincronismo = ?
      WHERE id = ?`,
    [
      params.publicKey,
      hardwareUuid,
      params.novoEstado,
      params.dispositivoId ? 'FISICO' : 'SOFTWARE',
      params.dispositivoId,
      params.hashContDono ?? null,
      agora,
      params.userId,
    ]
  );
  return 'OK';
}

/** Marca como REVOGADO o dispositivo físico atual da conta (se houver) */
async function revogarDispositivoTx(tx: Tx, dispositivoId: string | null): Promise<void> {
  if (!dispositivoId) return;
  await tx.execute(`UPDATE dispositivos SET status = 'REVOGADO', revogado_em = ? WHERE id = ?`, [new Date(), dispositivoId]);
}

export const VaultModel = {
  // ============================================================
  // LEITURA
  // ============================================================
  async obterPorId(userId: string): Promise<ContaCofre | null> {
    const rows = await query<ContaRow>(`SELECT ${CAMPOS} FROM users WHERE id = ? LIMIT 1`, [userId]);
    return mapear(rows[0]);
  },

  async obterPorPublicKey(publicKey: string): Promise<ContaCofre | null> {
    const rows = await query<ContaRow>(
      `SELECT ${CAMPOS} FROM users WHERE public_key_ed25519 = ? LIMIT 1`,
      [publicKey]
    );
    return mapear(rows[0]);
  },

  /** Só para conferir a prova da CCP. Nunca vai para a resposta HTTP. */
  async obterHashContDono(userId: string): Promise<string | null> {
    const rows = await query<{ hash_cont_dono: string | null }>(
      'SELECT hash_cont_dono FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    return rows[0]?.hash_cont_dono ?? null;
  },

  /** Só para conferir a prova da CCH. Nunca vai para a resposta HTTP. */
  async obterHashHerdeiro(userId: string): Promise<string | null> {
    const rows = await query<{ hash_cont_herdeiro: string | null }>(
      'SELECT hash_cont_herdeiro FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    return rows[0]?.hash_cont_herdeiro ?? null;
  },

  async chaveRevogada(publicKey: string): Promise<boolean> {
    const rows = await query('SELECT 1 FROM chaves_revogadas WHERE public_key = ? LIMIT 1', [publicKey]);
    return rows.length > 0;
  },

  // ============================================================
  // PAREAMENTO: PENDENTE_PAREAMENTO → ATIVA  (Parte 3)
  // ============================================================
  async parearHardware(params: {
    userId: string;
    publicKey: string;
    hashContDono: string;
    /** Unidade física comprada (null = dispositivo de software) */
    dispositivoId?: string | null;
    /**
     * Backup inicial cifrado NO NAVEGADOR (envelope da CCP). Usado quando o
     * cofre é pareado com o hardware real: o ESP32 ainda não envia backup,
     * então a CCP já consegue recuperar o cofre desde o primeiro minuto.
     */
    backupInicial?: Buffer | null;
  }): Promise<ResultadoPareamento> {
    try {
      return await withTransaction(async (tx): Promise<ResultadoPareamento> => {
        const conta = await travarConta(tx, params.userId);
        if (!conta || conta.estado_cofre !== 'PENDENTE_PAREAMENTO') return 'ESTADO_INVALIDO';
        const r = await vincularChaveTx(tx, {
          userId: params.userId,
          publicKey: params.publicKey,
          dispositivoId: params.dispositivoId ?? null,
          novoEstado: 'ATIVA',
          hashContDono: params.hashContDono,
        });
        if (r !== 'OK') throw new DispositivoIndisponivel();
        if (params.backupInicial) {
          const atual = await tx.query<{ version_counter: number }>('SELECT version_counter FROM backups WHERE user_id = ?', [params.userId]);
          await gravarBackupTx(tx, params.userId, params.backupInicial, (atual[0]?.version_counter ?? 0) + 1);
        }
        return 'OK';
      });
    } catch (err) {
      if (err instanceof DispositivoIndisponivel) return 'DISPOSITIVO_INDISPONIVEL';
      if (isDuplicateError(err)) return 'CHAVE_EM_USO';
      throw err;
    }
  },

  /** Login pelo dispositivo renova o prazo de 365 dias (RN11) */
  async renovarPrazo(userId: string): Promise<void> {
    await execute('UPDATE users SET ultimo_sincronismo = ? WHERE id = ?', [new Date(), userId]);
  },

  /** Transição simples de estado: só aplica se o estado atual estiver em "de" */
  async transicionarEstado(params: {
    userId: string;
    de: readonly EstadoCofre[];
    para: EstadoCofre;
  }): Promise<ContaCofre | null> {
    if (params.de.length === 0) return null;
    const marcadores = params.de.map(() => '?').join(', ');
    const r = await execute(
      `UPDATE users SET estado_cofre = ? WHERE id = ? AND estado_cofre IN (${marcadores})`,
      [params.para, params.userId, ...params.de]
    );
    if (r.affectedRows === 0) return null;
    return this.obterPorId(params.userId);
  },

  // ============================================================
  // BACKUP  (Parte 4)
  // ============================================================
  /** PUT /backup: estado e versão conferidos com a conta travada */
  async salvarBackup(params: {
    userId: string;
    payload: Buffer;
    versionCounter: number;
    estadosPermitidos: readonly EstadoCofre[];
  }): Promise<ResultadoGravacao> {
    return withTransaction(async (tx): Promise<ResultadoGravacao> => {
      const conta = await travarConta(tx, params.userId);
      if (!conta) return { resultado: 'SEM_CONTA' };
      if (!estaEm(conta.estado_cofre, params.estadosPermitidos)) {
        return { resultado: 'ESTADO', status: conta.estado_cofre };
      }
      const gravado = await gravarBackupTx(tx, params.userId, params.payload, params.versionCounter);
      if (!gravado) throw new VersaoRecusada(); // força ROLLBACK
      return { resultado: 'OK', ...gravado };
    }).catch(tratarVersaoRecusada);
  },

  async obterBackup(
    userId: string
  ): Promise<{ payload_cifrado: Buffer; version_counter: number; atualizado_em: Date } | null> {
    const rows = await query<{ payload_cifrado: Buffer; version_counter: number; atualizado_em: Date }>(
      'SELECT payload_cifrado, version_counter, atualizado_em FROM backups WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] ?? null;
  },

  async obterMetadadosBackup(userId: string): Promise<BackupGravado | null> {
    const rows = await query<BackupGravado>(
      'SELECT version_counter, atualizado_em FROM backups WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] ?? null;
  },

  // ============================================================
  // CONTINGÊNCIA  (Parte 5)
  // ============================================================
  /** Kill Switch: bane a chave para sempre e revoga o cofre, numa transação */
  async revogarConta(params: {
    userId: string;
    motivo: 'KILL_SWITCH_DONO' | 'KILL_SWITCH_HERDEIRO';
    estadosPermitidos: readonly EstadoCofre[];
  }): Promise<ContaCofre | null> {
    const ok = await withTransaction(async (tx) => {
      const conta = await travarConta(tx, params.userId);
      if (!conta || !conta.public_key_ed25519 || !estaEm(conta.estado_cofre, params.estadosPermitidos)) {
        return false;
      }
      await tx.execute(
        'INSERT INTO chaves_revogadas (id, public_key, user_id, motivo, revogada_em) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), conta.public_key_ed25519, params.userId, params.motivo, new Date()]
      );
      await revogarDispositivoTx(tx, conta.dispositivo_id);
      await tx.execute(
        `UPDATE users SET estado_cofre = 'REVOGADA', public_key_ed25519 = NULL,
                          tipo_dispositivo = NULL, dispositivo_id = NULL
          WHERE id = ?`,
        [params.userId]
      );
      return true;
    });
    return ok ? this.obterPorId(params.userId) : null;
  },

  /** Recuperação de hardware: dispositivo novo (software ou comprado) numa conta REVOGADA */
  async parearNovoHardware(params: {
    userId: string;
    publicKey: string;
    dispositivoId?: string | null;
  }): Promise<ResultadoPareamento> {
    try {
      return await withTransaction(async (tx): Promise<ResultadoPareamento> => {
        const conta = await travarConta(tx, params.userId);
        if (!conta || conta.estado_cofre !== 'REVOGADA') return 'ESTADO_INVALIDO';
        const r = await vincularChaveTx(tx, {
          userId: params.userId,
          publicKey: params.publicKey,
          dispositivoId: params.dispositivoId ?? null,
          novoEstado: 'RECUPERACAO_HARDWARE',
        });
        if (r !== 'OK') throw new DispositivoIndisponivel();
        return 'OK';
      });
    } catch (err) {
      if (err instanceof DispositivoIndisponivel) return 'DISPOSITIVO_INDISPONIVEL';
      if (isDuplicateError(err)) return 'CHAVE_EM_USO';
      throw err;
    }
  },

  /**
   * Troca da CCP + backup com o novo Envelope da CCP, TUDO OU NADA.
   * hashAtual = hash que o controller conferiu; se mudou no meio, nada acontece.
   */
  async rotacionarCcp(params: {
    userId: string;
    hashAtual: string;
    novoHash: string;
    payload: Buffer;
    versionCounter: number;
  }): Promise<ResultadoGravacao> {
    return withTransaction(async (tx): Promise<ResultadoGravacao> => {
      const conta = await travarConta(tx, params.userId);
      if (!conta) return { resultado: 'SEM_CONTA' };
      if (conta.estado_cofre !== 'ATIVA') return { resultado: 'ESTADO', status: conta.estado_cofre };
      if (conta.hash_cont_dono !== params.hashAtual) return { resultado: 'HASH_MUDOU' };

      const gravado = await gravarBackupTx(tx, params.userId, params.payload, params.versionCounter);
      if (!gravado) throw new VersaoRecusada();

      await tx.execute('UPDATE users SET hash_cont_dono = ? WHERE id = ?', [params.novoHash, params.userId]);
      return { resultado: 'OK', ...gravado };
    }).catch(tratarVersaoRecusada);
  },

  /**
   * "Esqueci a CCP, mas estou com o dispositivo": grava a CCP nova SEM a prova
   * da antiga. Quem chama já provou ter o dispositivo (token hardware) E a senha
   * do site. O dispositivo tem a chave do cofre, então ele mesmo refaz o envelope.
   */
  async redefinirCcpPeloDispositivo(params: {
    userId: string;
    publicKey: string;
    novoHash: string;
    payload: Buffer;
    versionCounter: number;
  }): Promise<ResultadoGravacao> {
    return withTransaction(async (tx): Promise<ResultadoGravacao> => {
      const conta = await travarConta(tx, params.userId);
      if (!conta) return { resultado: 'SEM_CONTA' };
      if (conta.estado_cofre !== 'ATIVA') return { resultado: 'ESTADO', status: conta.estado_cofre };
      if (conta.public_key_ed25519 !== params.publicKey) return { resultado: 'HASH_MUDOU' };

      const gravado = await gravarBackupTx(tx, params.userId, params.payload, params.versionCounter);
      if (!gravado) throw new VersaoRecusada();

      await tx.execute('UPDATE users SET hash_cont_dono = ? WHERE id = ?', [params.novoHash, params.userId]);
      return { resultado: 'OK', ...gravado };
    }).catch(tratarVersaoRecusada);
  },

  /**
   * ABANDONAR O COFRE ("perdi a CCP e o dispositivo").
   * O backup cifrado é apagado (sem a CCP ninguém o abriria), a chave do
   * dispositivo é banida e a conta volta a PENDENTE_PAREAMENTO, pronta para
   * um cofre novo. Herança, prova da CCP e dispositivo vinculado são limpos.
   * Um dispositivo FÍSICO comprado volta a DISPONIVEL (pode ser pareado de novo
   * depois do comando "reset" no firmware).
   */
  async abandonarCofre(userId: string): Promise<ContaCofre | null> {
    await withTransaction(async (tx) => {
      const conta = await travarConta(tx, userId);
      if (!conta) return;
      if (conta.public_key_ed25519) {
        await tx.execute(
          'INSERT IGNORE INTO chaves_revogadas (id, public_key, user_id, motivo, revogada_em) VALUES (?, ?, ?, ?, ?)',
          [crypto.randomUUID(), conta.public_key_ed25519, userId, 'ABANDONO', new Date()]
        );
      }
      if (conta.dispositivo_id) {
        await tx.execute(
          "UPDATE dispositivos SET status = 'DISPONIVEL', public_key = NULL, chave_anunciada = NULL, pareado_em = NULL WHERE id = ?",
          [conta.dispositivo_id]
        );
      }
      await tx.execute('DELETE FROM backups WHERE user_id = ?', [userId]);
      await tx.execute(
        `UPDATE users SET estado_cofre = 'PENDENTE_PAREAMENTO', public_key_ed25519 = NULL, hardware_uuid = NULL,
                          tipo_dispositivo = NULL, dispositivo_id = NULL, hash_cont_dono = NULL, hash_cont_herdeiro = NULL,
                          abandono_codigo = NULL, abandono_expira = NULL, abandono_tentativas = 0
          WHERE id = ?`,
        [userId]
      );
    });
    return this.obterPorId(userId);
  },

  /** Backup cifrado para quem provou a CCP (abrir o cofre em outro aparelho, só leitura) */
  async obterBackupCifrado(userId: string): Promise<{ payload: Buffer; version_counter: number; atualizado_em: Date } | null> {
    const rows = await query<{ payload_cifrado: Buffer; version_counter: number; atualizado_em: Date }>(
      'SELECT payload_cifrado, version_counter, atualizado_em FROM backups WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const r = rows[0];
    return r ? { payload: r.payload_cifrado, version_counter: r.version_counter, atualizado_em: r.atualizado_em } : null;
  },

  // ============================================================
  // HERANÇA  (Parte 6)
  // ============================================================
  /**
   * Ativa, troca ou remove (novoHashHerdeiro = null) a CCH e grava o backup
   * com o Envelope do Herdeiro atualizado, na MESMA transação.
   */
  async definirHerdeiro(params: {
    userId: string;
    hashDonoAtual: string;
    novoHashHerdeiro: string | null;
    payload: Buffer;
    versionCounter: number;
  }): Promise<ResultadoGravacao> {
    return withTransaction(async (tx): Promise<ResultadoGravacao> => {
      const conta = await travarConta(tx, params.userId);
      if (!conta) return { resultado: 'SEM_CONTA' };
      if (conta.estado_cofre !== 'ATIVA') return { resultado: 'ESTADO', status: conta.estado_cofre };
      if (conta.hash_cont_dono !== params.hashDonoAtual) return { resultado: 'HASH_MUDOU' };

      const gravado = await gravarBackupTx(tx, params.userId, params.payload, params.versionCounter);
      if (!gravado) throw new VersaoRecusada();

      await tx.execute('UPDATE users SET hash_cont_herdeiro = ? WHERE id = ?', [
        params.novoHashHerdeiro,
        params.userId,
      ]);
      return { resultado: 'OK', ...gravado };
    }).catch(tratarVersaoRecusada);
  },

  /**
   * Resgate pelo herdeiro, numa transação só:
   *   1. bane a chave do dono (KILL_SWITCH_HERDEIRO)
   *   2. vincula o dispositivo do herdeiro
   *   3. leva o cofre a RECUPERACAO_HARDWARE
   *   4. CONSOME a CCH (uso único)
   */
  async resgatar(params: {
    userId: string;
    hashHerdeiroVerificado: string;
    publicKey: string;
  }): Promise<ResultadoResgate> {
    try {
      return await withTransaction(async (tx): Promise<ResultadoResgate> => {
        const conta = await travarConta(tx, params.userId);
        if (!conta) return { resultado: 'SEM_CONTA' };

        if (!conta.hash_cont_herdeiro || conta.hash_cont_herdeiro !== params.hashHerdeiroVerificado) {
          return { resultado: 'HERANCA_INDISPONIVEL' };
        }
        if (!estaEm(conta.estado_cofre, ESTADOS_RESGATE)) return { resultado: 'ESTADO' };
        // O dispositivo do herdeiro não pode ser o mesmo que está sendo revogado
        if (params.publicKey === conta.public_key_ed25519) return { resultado: 'CHAVE_EM_USO' };

        const rev = await tx.query('SELECT 1 FROM chaves_revogadas WHERE public_key = ? LIMIT 1', [
          params.publicKey,
        ]);
        if (rev.length > 0) return { resultado: 'CHAVE_REVOGADA' };

        if (conta.public_key_ed25519) {
          await tx.execute(
            `INSERT INTO chaves_revogadas (id, public_key, user_id, motivo, revogada_em)
             VALUES (?, ?, ?, 'KILL_SWITCH_HERDEIRO', ?)`,
            [crypto.randomUUID(), conta.public_key_ed25519, params.userId, new Date()]
          );
        }
        await revogarDispositivoTx(tx, conta.dispositivo_id);
        // O herdeiro chega com um dispositivo de software (o dele) e consome a CCH
        await tx.execute(
          `UPDATE users
             SET public_key_ed25519 = ?, hardware_uuid = ?,
                 estado_cofre = 'RECUPERACAO_HARDWARE', hash_cont_herdeiro = NULL,
                 tipo_dispositivo = 'SOFTWARE', dispositivo_id = NULL
           WHERE id = ?`,
          [params.publicKey, hardwareUuidDe(params.publicKey), params.userId]
        );
        return {
          resultado: 'OK',
          conta: { id: params.userId, status: 'RECUPERACAO_HARDWARE', public_key: params.publicKey },
        };
      });
    } catch (err) {
      // Chave já vinculada a OUTRA conta (RN01), pega pelo UNIQUE do banco
      if (isDuplicateError(err)) return { resultado: 'CHAVE_EM_USO' };
      throw err;
    }
  },
};

// ------------------------------------------------------------
// A versão recusada precisa DESFAZER tudo (inclusive o que já foi
// escrito antes na transação). Lançamos este erro para o
// withTransaction dar ROLLBACK e convertemos em { resultado: 'VERSAO' }.
// ------------------------------------------------------------
class DispositivoIndisponivel extends Error {
  constructor() {
    super('dispositivo indisponível');
    this.name = 'DispositivoIndisponivel';
  }
}

class VersaoRecusada extends Error {
  constructor() {
    super('version_counter recusado');
    this.name = 'VersaoRecusada';
  }
}

function tratarVersaoRecusada(err: unknown): ResultadoGravacao {
  if (err instanceof VersaoRecusada) return { resultado: 'VERSAO' };
  throw err;
}
