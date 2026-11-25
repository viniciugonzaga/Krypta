import type { Response, NextFunction } from 'express';
import { UserModel } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { ApiError } from '../utils/ApiError.js';
import type { AuthedRequest } from '../middlewares/auth.js';

/** "Chrome no Android", "Edge no Windows"... a partir do User-Agent */
function resumirNavegador(ua: string): string {
  const s = ua.toLowerCase();
  const nav = s.includes('edg/') ? 'Edge' : s.includes('samsungbrowser') ? 'Samsung Internet' : s.includes('firefox') ? 'Firefox' : s.includes('chrome') ? 'Chrome' : s.includes('safari') ? 'Safari' : 'Navegador';
  const so = /iphone|ipad/.test(s) ? 'iPhone' : s.includes('android') ? 'Android' : s.includes('windows') ? 'Windows' : s.includes('mac os') ? 'Mac' : s.includes('linux') ? 'Linux' : '';
  return so ? `${nav} no ${so}` : nav;
}
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
      const { name, email, avatar } = req.body;

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

      // v1.3.0: foto de perfil (opcional). Aceita a foto já reduzida pelo app
      // (data:image/jpeg|png|webp;base64, até ~300 KB), um avatar padrão do
      // Krypta ("preset:robo-roxo") ou null para voltar ao avatar padrão.
      if (avatar !== undefined) {
        if (avatar === null || avatar === '') patch.avatar_url = null;
        else if (typeof avatar === 'string' && /^preset:[a-z0-9-]{1,30}$/.test(avatar)) patch.avatar_url = avatar;
        else if (typeof avatar === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) {
          if (avatar.length > 400_000) throw new ApiError(413, 'Foto grande demais. Escolha outra imagem.');
          patch.avatar_url = avatar;
        } else throw new ApiError(400, 'Foto inválida.');
      }

      const updated = await UserModel.update(user.id, patch);
      await AuditModel.log({
        userId: user.id, action: 'PROFILE_UPDATE', detail: avatar !== undefined && name === undefined && email === undefined ? 'Foto de perfil atualizada' : 'Perfil atualizado',
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

  // GET /api/users/me/sessions — onde a conta está aberta (site, celular, app...)
  async listSessions(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const sessoes = await SessionModel.listarAtivas(req.user!.id);
      res.json({
        success: true,
        data: sessoes.map((s) => ({
          id: s.id,
          cliente: s.cliente ?? 'web',
          navegador: resumirNavegador(s.user_agent ?? ''),
          ip: s.ip_address,
          desde: s.created_at,
          atual: !!req.jti && s.access_token_jti === req.jti,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/users/me/sessions/revoke — sai de TODOS os navegadores
  async revokeSessions(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      await SessionModel.revokeAllForUser(user.id);
      await AuditModel.log({
        userId: user.id, action: 'SESSIONS_REVOKED', detail: 'Saiu de todos os dispositivos', status: 'warning',
      });
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