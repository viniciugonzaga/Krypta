import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library'; // IMPORTANTE: Adicionar esta importação
import { UserModel } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';
import { AuditModel } from '../models/AuditModel.js';
import { EmailService } from '../services/EmailService.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateRecoveryCode,
} from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Inicializa o cliente do Google usando a variável de ambiente
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function serializeUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    status: u.status,
    role: u.role,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
    lastLoginAt: u.last_login_at,
  };
}

async function createSession(userId: string, req: Request) {
  const { token, jti } = generateAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(
    now.getTime() + env.REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
  );

  await SessionModel.create({
    id: crypto.randomUUID(),
    userId,
    refreshToken,
    jti,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    expiresAt: accessExpires,
    refreshExpiresAt: refreshExpires,
  });

  return { token, refreshToken };
}

export const AuthController = {
  // POST /api/auth/register
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body ?? {};

      if (!name?.trim() || name.trim().length < 2)
        throw new ApiError(400, 'Nome inválido. Mínimo 2 caracteres.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? ''))
        throw new ApiError(400, 'E-mail inválido.');
      if (!password || password.length < 8)
        throw new ApiError(400, 'Senha muito curta. Mínimo 8 caracteres.');

      const existing = await UserModel.findByEmail(email);
      if (existing) throw new ApiError(409, 'E-mail já cadastrado.');

      const userId = crypto.randomUUID();
      const passwordHash = await hashPassword(password);

      const user = await UserModel.create({
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        plan: 'free',
        status: 'ATIVA',
        role: 'user',
        hardware_uuid: `ESP32-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        public_key_ed25519: `ed25519_${crypto.randomUUID().slice(0, 16)}`,
      });

      await AuditModel.log({
        userId: user.id,
        action: 'REGISTER',
        detail: `Nova conta: ${user.email}`,
      });

      const { token, refreshToken } = await createSession(user.id, req);

      res.status(201).json({
        success: true,
        data: {
          user: serializeUser(user),
          token,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body ?? {};

      const user = await UserModel.findByEmail(email);
      if (!user) {
        await AuditModel.log({
          userId: null,
          action: 'LOGIN_FAILED',
          detail: `E-mail inexistente: ${email}`,
          status: 'warning',
        });
        throw new ApiError(401, 'E-mail ou senha incorretos.');
      }

      if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
        const remaining = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / 60000
        );
        throw new ApiError(429, `Conta bloqueada. Tente novamente em ${remaining} min.`);
      }

      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        const attempts = user.login_attempts + 1;
        const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

        await UserModel.update(user.id, {
          login_attempts: shouldLock ? 0 : attempts,
          locked_until: shouldLock
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null,
        });

        await AuditModel.log({
          userId: user.id,
          action: 'LOGIN_FAILED',
          detail: `Senha incorreta (tentativa ${attempts})`,
          status: 'warning',
        });

        if (shouldLock)
          throw new ApiError(429, 'Muitas tentativas. Conta bloqueada por 15 minutos.');
        throw new ApiError(401, 'E-mail ou senha incorretos.');
      }

      if (user.status === 'REVOGADA') throw new ApiError(410, 'Conta revogada permanentemente.');
      if (user.status === 'SUSPENSA') throw new ApiError(423, 'Conta suspensa. Contate o suporte.');
      if (user.status === 'PENDENTE_VERIFICACAO') throw new ApiError(403, 'Verifique seu e-mail.');

      await UserModel.update(user.id, {
        login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      });

      const refreshed = (await UserModel.findById(user.id))!;
      const { token, refreshToken } = await createSession(user.id, req);

      await AuditModel.log({
        userId: user.id,
        action: 'LOGIN',
        detail: 'Login realizado com sucesso',
      });

      res.json({
        success: true,
        data: {
          user: serializeUser(refreshed),
          token,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/social
  async socialLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { provider, token } = req.body ?? {};

      if (!provider || !token) {
        throw new ApiError(400, 'Provedor e token são obrigatórios.');
      }

      let email = '';
      let name = '';

      // Valida o token de acordo com o provedor
      if (provider === 'google') {
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          
          if (!payload || !payload.email) {
            throw new Error('Token inválido');
          }
          email = payload.email;
          name = payload.name || 'Usuário Google';
        } catch (err) {
          throw new ApiError(401, 'Falha na autenticação com o Google. Token inválido.');
        }
      } else {
        throw new ApiError(400, 'Provedor não suportado no momento.');
      }

      let user = await UserModel.findByEmail(email);

      // Se o usuário não existir, cria uma conta automaticamente
      if (!user) {
        const userId = crypto.randomUUID();
        const dummyPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await hashPassword(dummyPassword);

        user = await UserModel.create({
          id: userId,
          name: name,
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          plan: 'free',
          status: 'ATIVA',
          role: 'user',
          hardware_uuid: `ESP32-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          public_key_ed25519: `ed25519_${crypto.randomUUID().slice(0, 16)}`,
        });

        await AuditModel.log({
          userId: user.id,
          action: 'REGISTER_SOCIAL',
          detail: `Nova conta via ${provider}: ${user.email}`,
        });
      }

      if (user.status === 'REVOGADA') throw new ApiError(410, 'Conta revogada permanentemente.');
      if (user.status === 'SUSPENSA') throw new ApiError(423, 'Conta suspensa. Contate o suporte.');

      await UserModel.update(user.id, {
        login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      });

      const refreshed = (await UserModel.findById(user.id))!;
      const { token: jwtToken, refreshToken } = await createSession(user.id, req);

      await AuditModel.log({
        userId: user.id,
        action: 'LOGIN_SOCIAL',
        detail: `Login via ${provider}`,
      });

      res.json({
        success: true,
        data: {
          user: serializeUser(refreshed),
          token: jwtToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body ?? {};
      if (refreshToken) await SessionModel.revoke(refreshToken);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/refresh
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken) throw new ApiError(400, 'refreshToken obrigatório.');

      const session = await SessionModel.findByRefreshToken(refreshToken);
      if (!session || session.status !== 'active')
        throw new ApiError(401, 'Refresh token inválido.');
      if (new Date(session.refresh_expires_at).getTime() < Date.now())
        throw new ApiError(401, 'Refresh token expirado.');

      await SessionModel.revoke(refreshToken);
      const newSession = await createSession(session.user_id, req);

      res.json({
        success: true,
        data: { token: newSession.token, refreshToken: newSession.refreshToken },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/recover
  async requestRecovery(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body ?? {};
      const user = await UserModel.findByEmail(email);

      if (!user) return res.json({ success: true, data: {} });

      const code = generateRecoveryCode();
      await UserModel.update(user.id, {
        recovery_code: code,
        recovery_code_expires_at: new Date(Date.now() + 30 * 60 * 1000),
      });

      await AuditModel.log({
        userId: user.id,
        action: 'RECOVERY_REQUEST',
        detail: 'Código de recuperação gerado',
        status: 'warning',
      });

      await EmailService.sendRecoveryCode(user.email, code, user.name);

      res.json({ success: true, data: {} });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code, newPassword } = req.body ?? {};

      const user = await UserModel.findByEmail(email);
      if (!user) throw new ApiError(404, 'Usuário não encontrado.');
      if (!user.recovery_code || user.recovery_code !== code)
        throw new ApiError(400, 'Código inválido.');
      if (
        !user.recovery_code_expires_at ||
        new Date(user.recovery_code_expires_at).getTime() < Date.now()
      )
        throw new ApiError(400, 'Código expirado.');
      if (!newPassword || newPassword.length < 8)
        throw new ApiError(400, 'Senha muito curta.');

      const passwordHash = await hashPassword(newPassword);
      await UserModel.update(user.id, {
        password_hash: passwordHash,
        recovery_code: null,
        recovery_code_expires_at: null,
        login_attempts: 0,
        locked_until: null,
      });

      await SessionModel.revokeAllForUser(user.id);
      await AuditModel.log({
        userId: user.id,
        action: 'PASSWORD_RESET',
        detail: 'Senha redefinida via código',
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};

export { serializeUser };