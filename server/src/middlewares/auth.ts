import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { UserModel, type UserRow } from '../models/UserModel.js';
import { SessionModel } from '../models/SessionModel.js';

export interface AuthedRequest extends Request {
  user?: UserRow;
}

// IMPORTANTE: as mensagens de 401 abaixo contêm a palavra "Token".
// O front (src/services/api.ts) usa isso para saber que deve renovar
// o acesso com o refresh token e repetir a requisição.
export async function authMiddleware(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Token de autenticação ausente.');
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      const expired = err instanceof Error && err.name === 'TokenExpiredError';
      throw new ApiError(401, expired ? 'Token expirado. Renove sua sessão.' : 'Token inválido.');
    }

    // Token de sessão encerrada (logout, troca de senha, renovação) não vale mais
    if (payload.jti) {
      const session = await SessionModel.findByJti(payload.jti);
      if (session && session.status !== 'active') {
        throw new ApiError(401, 'Token revogado. Entre novamente.');
      }
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado.');
    if (user.status === 'REVOGADA') throw new ApiError(410, 'Conta revogada permanentemente.');
    if (user.status === 'SUSPENSA') throw new ApiError(423, 'Conta suspensa. Contate o suporte.');
    if (user.status === 'PENDENTE_VERIFICACAO') throw new ApiError(403, 'Verifique sua conta.');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Acesso restrito a administradores.'));
  }
  next();
}