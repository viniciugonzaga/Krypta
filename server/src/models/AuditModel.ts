import { query } from '../config/database.js';
import crypto from 'crypto';

export interface AuditRow {
  id: string;
  user_id: string | null;
  action: string;
  detail: string | null;
  ip_address: string | null;
  status: 'success' | 'warning' | 'error';
  created_at: Date;
}

export const AuditModel = {
  async log(data: {
    userId: string | null;
    action: string;
    detail: string;
    ip?: string;
    status?: 'success' | 'warning' | 'error';
  }): Promise<void> {
    await query(
      `INSERT INTO audit_logs (id, user_id, action, detail, ip_address, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        data.userId,
        data.action,
        data.detail,
        data.ip ?? '127.0.0.1',
        data.status ?? 'success',
      ]
    );
  },

  async findByUser(userId: string, limit = 15): Promise<AuditRow[]> {
    return query<AuditRow>(
      `SELECT * FROM audit_logs WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
  },
};