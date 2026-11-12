import { query } from '../config/database.js';

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token: string;
  access_token_jti: string | null;
  user_agent: string | null;
  ip_address: string | null;
  status: 'active' | 'expired' | 'revoked';
  created_at: Date;
  expires_at: Date;
  refresh_expires_at: Date;
}

export const SessionModel = {
  async create(data: {
    id: string;
    userId: string;
    refreshToken: string;
    jti: string | null;
    userAgent?: string;
    ip?: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
  }): Promise<void> {
    await query(
      `INSERT INTO sessions
        (id, user_id, refresh_token, access_token_jti, user_agent, ip_address, expires_at, refresh_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id, data.userId, data.refreshToken, data.jti,
        data.userAgent ?? null, data.ip ?? null,
        data.expiresAt, data.refreshExpiresAt,
      ]
    );
  },

  async findByRefreshToken(refreshToken: string): Promise<SessionRow | null> {
    const rows = await query<SessionRow>(
      'SELECT * FROM sessions WHERE refresh_token = ? LIMIT 1',
      [refreshToken]
    );
    return rows[0] ?? null;
  },

  async revoke(refreshToken: string): Promise<void> {
    await query(
      "UPDATE sessions SET status = 'revoked' WHERE refresh_token = ?",
      [refreshToken]
    );
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await query(
      "UPDATE sessions SET status = 'revoked' WHERE user_id = ? AND status = 'active'",
      [userId]
    );
  },

  async deleteExpired(): Promise<void> {
    await query('DELETE FROM sessions WHERE refresh_expires_at < NOW()');
  },
};