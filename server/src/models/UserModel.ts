// server/src/models/UserModel.ts
import { query } from '../config/database.js';
import type { EstadoCofre } from '../config/estados.js';

// Agora só existem dois planos: Free e Pro.
export type UserPlan = 'free' | 'pro';

// Planos antigos que foram unificados no Krypta Pro.
// Mantidos aqui só para converter registros antigos do banco.
export const LEGACY_PAID_PLANS = ['essential', 'advanced', 'max', 'custom'] as const;

export function normalizePlan(plan: string | null | undefined): UserPlan {
  if (!plan) return 'free';
  const p = plan.toLowerCase().trim();
  if (p === 'pro' || (LEGACY_PAID_PLANS as readonly string[]).includes(p)) return 'pro';
  return 'free';
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  plan: UserPlan;
  /** Status da conta NO SITE (login no portal) */
  status: 'ATIVA' | 'SUSPENSA' | 'REVOGADA' | 'PENDENTE_VERIFICACAO';
  role: 'user' | 'admin';
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  login_attempts: number;
  locked_until: Date | null;
  /** Identificador legível do dispositivo, derivado da chave real no pareamento */
  hardware_uuid: string | null;
  /** Chave pública Ed25519 REAL do ESP32 (base64, 44 caracteres). Null = sem dispositivo */
  public_key_ed25519: string | null;
  /** Estado do COFRE / dispositivo (separado do status do site) */
  estado_cofre: EstadoCofre;
  /** Origem do dispositivo pareado: SOFTWARE ou FISICO (comprado) */
  tipo_dispositivo: 'SOFTWARE' | 'FISICO' | null;
  /** Unidade física pareada (tabela dispositivos) */
  dispositivo_id: string | null;
  /** bcrypt(pepper(prova da CCP)) — nunca sai do servidor */
  hash_cont_dono: string | null;
  /** bcrypt(pepper(prova da CCH)) — null = herança desativada */
  hash_cont_herdeiro: string | null;
  /** Última atividade do dispositivo (renova o prazo de 365 dias) */
  ultimo_sincronismo: Date;
  recovery_code: string | null;
  recovery_code_expires_at: Date | null;
}

// Garante que qualquer plano antigo vindo do banco saia como 'pro'
function normalizeRow(row: UserRow | undefined): UserRow | null {
  if (!row) return null;
  return { ...row, plan: normalizePlan(row.plan) };
}

// Colunas que o update() aceita (evita SQL com nome de coluna vindo de fora)
const UPDATABLE_COLUMNS = new Set<keyof UserRow>([
  'name',
  'email',
  'password_hash',
  'plan',
  'status',
  'role',
  'avatar_url',
  'last_login_at',
  'login_attempts',
  'locked_until',
  'recovery_code',
  'recovery_code_expires_at',
]);

export const UserModel = {
  async findById(id: string): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return normalizeRow(rows[0]);
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [
      String(email ?? '').toLowerCase(),
    ]);
    return normalizeRow(rows[0]);
  },

  async create(user: {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    plan?: UserPlan;
    status?: UserRow['status'];
    role?: UserRow['role'];
  }): Promise<UserRow> {
    // A conta nasce SEM dispositivo: estado_cofre = PENDENTE_PAREAMENTO (default do banco).
    // A chave pública só entra no pareamento real (POST /api/hardware/pair).
    await query(
      `INSERT INTO users
        (id, name, email, password_hash, plan, status, role, login_attempts, locked_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email.toLowerCase().trim(),
        user.password_hash,
        normalizePlan(user.plan ?? 'free'),
        user.status ?? 'ATIVA',
        user.role ?? 'user',
        0,
        null,
      ]
    );
    const created = await this.findById(user.id);
    if (!created) throw new Error('Falha ao criar usuário.');
    return created;
  },

  /**
   * Atualiza dados da conta do SITE.
   * As colunas do cofre (chave, estado_cofre, provas) NÃO passam por aqui:
   * elas só mudam pelo VaultModel, com as regras da matriz de estados.
   */
  async update(id: string, patch: Partial<UserRow>): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(patch)) {
      if (!UPDATABLE_COLUMNS.has(key as keyof UserRow)) continue;
      fields.push(`\`${key}\` = ?`);
      values.push(key === 'plan' ? normalizePlan(value as string) : value);
    }

    if (fields.length === 0) return this.findById(id);
    values.push(id);

    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const result: any = await query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async count(): Promise<number> {
    const rows = await query<{ total: number }>('SELECT COUNT(*) as total FROM users');
    return rows[0]?.total ?? 0;
  },
};
