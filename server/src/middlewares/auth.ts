import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { UserModel, type UserRow } from '../models/UserModel.js';

export interface AuthedRequest extends Request {
  user?: UserRow;
}

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
    } catch {
      throw new ApiError(401, 'Token inválido ou expirado.');
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