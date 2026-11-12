import type { Response, NextFunction } from 'express';
import { UserModel } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { ApiError } from '../utils/ApiError.js';
import type { AuthedRequest } from '../middlewares/auth.js';
import { serializeUser } from './AuthController.js';

export const UserController = {
  // GET /api/users/me
  async me(req: AuthedRequest, res: Response) {
    res.json({ success: true, data: serializeUser(req.user) });
  },

  // PUT /api/users/me
  async updateMe(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { name, email } = req.body;

      const patch: any = {};
      if (name !== undefined) {
        if (!name.trim() || name.trim().length < 2)
          throw new ApiError(400, 'Nome inválido.');
        patch.name = name.trim();
      }
      if (email !== undefined && email.toLowerCase() !== user.email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new ApiError(400, 'E-mail inválido.');
        const existing = await UserModel.findByEmail(email);
        if (existing && existing.id !== user.id)
          throw new ApiError(409, 'E-mail já cadastrado.');
        patch.email = email.toLowerCase().trim();
      }

      const updated = await UserModel.update(user.id, patch);
      await AuditModel.log({
        userId: user.id, action: 'PROFILE_UPDATE', detail: 'Perfil atualizado',
      });

      res.json({ success: true, data: serializeUser(updated) });
    } catch (err) { next(err); }
  },

  // POST /api/users/me/change-password
  async changePassword(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { currentPassword, newPassword } = req.body;

      const valid = await comparePassword(currentPassword, user.password_hash);
      if (!valid) {
        await AuditModel.log({
          userId: user.id, action: 'PASSWORD_CHANGE_FAILED',
          detail: 'Senha atual incorreta', status: 'warning',
        });
        throw new ApiError(401, 'Senha atual incorreta.');
      }
      if (!newPassword || newPassword.length < 8)
        throw new ApiError(400, 'Nova senha muito curta.');
      if (newPassword === currentPassword)
        throw new ApiError(400, 'A nova senha deve ser diferente.');

      const passwordHash = await hashPassword(newPassword);
      await UserModel.update(user.id, { password_hash: passwordHash });
      await SessionModel.revokeAllForUser(user.id);
      await AuditModel.log({
        userId: user.id, action: 'PASSWORD_CHANGED', detail: 'Senha alterada',
      });

      res.json({ success: true });
    } catch (err) { next(err); }
  },

  // DELETE /api/users/me
  async deleteMe(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { password } = req.body;

      const valid = await comparePassword(password, user.password_hash);
      if (!valid) throw new ApiError(401, 'Senha incorreta.');

      await SessionModel.revokeAllForUser(user.id);
      await AuditModel.log({
        userId: user.id, action: 'ACCOUNT_DELETED', detail: 'Conta excluída',
      });
      await UserModel.delete(user.id);

      res.json({ success: true });
    } catch (err) { next(err); }
  },

  // GET /api/users/me/audit
  async getAuditLogs(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const logs = await AuditModel.findByUser(req.user!.id, 15);
      const mapped = logs.map((l) => ({
        id: l.id,
        userId: l.user_id,
        action: l.action,
        detail: l.detail,
        ip: l.ip_address,
        status: l.status,
        timestamp: l.created_at,
      }));
      res.json({ success: true, data: mapped });
    } catch (err) { next(err); }
  },
};