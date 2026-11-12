import { query } from '../config/database.js';

export type UserPlan = 'free' | 'essential' | 'advanced' | 'max' | 'custom';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  plan: UserPlan;
  status: 'ATIVA' | 'SUSPENSA' | 'REVOGADA' | 'PENDENTE_VERIFICACAO';
  role: 'user' | 'admin';
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  login_attempts: number;
  locked_until: Date | null;
  hardware_uuid: string | null;
  public_key_ed25519: string | null;
  recovery_code: string | null;
  recovery_code_expires_at: Date | null;
}

export const UserModel = {
  async findById(id: string): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
    return rows[0] ?? null;
  },

  async create(user: {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    plan?: UserPlan;
    status?: UserRow['status'];
    role?: UserRow['role'];
    hardware_uuid?: string | null;
    public_key_ed25519?: string | null;
  }): Promise<UserRow> {
    await query(
      `INSERT INTO users
        (id, name, email, password_hash, plan, status, role,
         login_attempts, locked_until,
         hardware_uuid, public_key_ed25519)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email.toLowerCase().trim(),
        user.password_hash,
        user.plan ?? 'free',
        user.status ?? 'ATIVA',
        user.role ?? 'user',
        0,
        null,
        user.hardware_uuid ?? null,
        user.public_key_ed25519 ?? null,
      ]
    );
    const created = await this.findById(user.id);
    if (!created) throw new Error('Falha ao criar usuário.');
    return created;
  },

  async update(id: string, patch: Partial<UserRow>): Promise<UserRow | null> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(patch)) {
      fields.push(`${key} = ?`);
      values.push(value);
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