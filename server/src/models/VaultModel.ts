// server/src/models/VaultModel.ts
// ============================================================
// SQL do COFRE (equivale ao contaRepository da API original).
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
// ============================================================
import crypto from 'crypto';
import { execute, query, isDuplicateError, withTransaction } from '../config/database.js';
import type { EstadoCofre } from '../config/estados.js';

/** "Objeto conta" do contrato da API */
export interface ContaCofre {
  id: string;
  email: string;
  public_key: string | null;
  status: EstadoCofre;
  hardware_uuid: string | null;
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
  (hash_cont_herdeiro IS NOT NULL) AS heranca_ativa,
  ultimo_sincronismo,
  created_at AS criado_em`;

function mapear(row: ContaRow | undefined): ContaCofre | null {
  if (!row) return null;
  return { ...row, heranca_ativa: !!row.heranca_ativa };
}

/** Identificador legível do ESP32, derivado da chave real (ex.: ESP32-7F3A9C1B) */
export function hardwareUuidDe(publicKey: string): string {
  return `ESP32-${crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 8).toUpperCase()}`;
}

export type ResultadoPareamento = 'OK' | 'ESTADO_INVALIDO' | 'CHAVE_EM_USO';

export const VaultModel = {
  // ------------------------------------------------------------
  // LEITURA
  // ------------------------------------------------------------
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

  async chaveRevogada(publicKey: string): Promise<boolean> {
    const rows = await query('SELECT 1 FROM chaves_revogadas WHERE public_key = ? LIMIT 1', [publicKey]);
    return rows.length > 0;
  },

  // ------------------------------------------------------------
  // PAREAMENTO: PENDENTE_PAREAMENTO → ATIVA
  // O WHERE estado_cofre trava re-pareamento e corridas.
  // ------------------------------------------------------------
  async parearHardware(params: {
    userId: string;
    publicKey: string;
    hashContDono: string;
  }): Promise<ResultadoPareamento> {
    try {
      const r = await execute(
        `UPDATE users
           SET public_key_ed25519 = ?,
               hardware_uuid = ?,
               hash_cont_dono = ?,
               estado_cofre = 'ATIVA',
               ultimo_sincronismo = ?
         WHERE id = ? AND estado_cofre = 'PENDENTE_PAREAMENTO'`,
        [params.publicKey, hardwareUuidDe(params.publicKey), params.hashContDono, new Date(), params.userId]
      );
      return r.affectedRows > 0 ? 'OK' : 'ESTADO_INVALIDO';
    } catch (err) {
      // Corrida: outra conta vinculou a mesma chave entre a checagem e o UPDATE
      if (isDuplicateError(err)) return 'CHAVE_EM_USO';
      throw err;
    }
  },

  // ------------------------------------------------------------
  // TTL (RN11): login por hardware e PUT /backup provam que o dono
  // segue ativo e renovam o prazo de 365 dias.
  // ------------------------------------------------------------
  async renovarPrazo(userId: string): Promise<void> {
    await execute('UPDATE users SET ultimo_sincronismo = ? WHERE id = ?', [new Date(), userId]);
  },

  // ------------------------------------------------------------
  // TRANSIÇÃO GENÉRICA (usada nas Partes 5 e 6)
  // Só aplica se o estado atual estiver em "de".
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // KILL SWITCH (Parte 5): bane a chave para sempre e revoga o cofre,
  // tudo numa transação. FOR UPDATE trava a linha da conta para não
  // deixar um PUT /backup concorrente passar numa conta já revogada.
  // ------------------------------------------------------------
  async revogarConta(params: {
    userId: string;
    motivo: 'KILL_SWITCH_DONO' | 'KILL_SWITCH_HERDEIRO';
    estadosPermitidos: readonly EstadoCofre[];
  }): Promise<ContaCofre | null> {
    const ok = await withTransaction(async (tx) => {
      const rows = await tx.query<{ public_key_ed25519: string | null; estado_cofre: EstadoCofre }>(
        'SELECT public_key_ed25519, estado_cofre FROM users WHERE id = ? FOR UPDATE',
        [params.userId]
      );
      const conta = rows[0];
      if (!conta || !conta.public_key_ed25519 || !params.estadosPermitidos.includes(conta.estado_cofre)) {
        return false;
      }

      await tx.execute(
        'INSERT INTO chaves_revogadas (id, public_key, user_id, motivo, revogada_em) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), conta.public_key_ed25519, params.userId, params.motivo, new Date()]
      );
      await tx.execute(
        `UPDATE users SET estado_cofre = 'REVOGADA', public_key_ed25519 = NULL WHERE id = ?`,
        [params.userId]
      );
      return true;
    });
    return ok ? this.obterPorId(params.userId) : null;
  },

  // ------------------------------------------------------------
  // RECUPERAÇÃO DE HARDWARE (Parte 5): novo ESP32 numa conta REVOGADA
  // ------------------------------------------------------------
  async parearNovoHardware(params: { userId: string; publicKey: string }): Promise<ResultadoPareamento> {
    try {
      const r = await execute(
        `UPDATE users
           SET public_key_ed25519 = ?, hardware_uuid = ?, estado_cofre = 'RECUPERACAO_HARDWARE'
         WHERE id = ? AND estado_cofre = 'REVOGADA'`,
        [params.publicKey, hardwareUuidDe(params.publicKey), params.userId]
      );
      return r.affectedRows > 0 ? 'OK' : 'ESTADO_INVALIDO';
    } catch (err) {
      if (isDuplicateError(err)) return 'CHAVE_EM_USO';
      throw err;
    }
  },
};
