// server/src/middlewares/vaultAuth.ts
// ============================================================
// Autenticação das rotas do COFRE, por escopo.
//
// Uso:  router.put('/backup', exigirEscopo(['hardware']), ...)
//       router.get('/account', exigirEscopo(['admin_web', 'hardware']), ...)
//
// • admin_web → reaproveita o authMiddleware do portal (sessão, status...).
// • hardware  → confere que a public_key do token AINDA é a chave vigente
//   da conta. Kill Switch, resgate de herança e recuperação de hardware
//   trocam/apagam a chave, então o token do dispositivo antigo morre na
//   hora, mesmo dentro dos 15 minutos.
//
// As mensagens de erro do dispositivo NÃO usam a palavra "Token" de
// propósito: assim o front do portal não tenta renovar a sessão do site
// quando o problema é a sessão do dispositivo.
// ============================================================
import type { Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyAnyToken, scopeOf, type TokenScope } from '../utils/token.js';
import { UserModel } from '../models/UserModel.js';
import { authMiddleware, type AuthedRequest } from './auth.js';

export interface VaultAuth {
  tipo: TokenScope;
  userId: string;
  /** Só em tokens de hardware */
  publicKey?: string;
  /** Expiração do token (epoch em segundos) */
  exp?: number;
}

export interface VaultRequest extends AuthedRequest {
  vault?: VaultAuth;
}

export function exigirEscopo(permitidos: TokenScope[]) {
  return async (req: VaultRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw new ApiError(401, 'Credencial ausente. Faça login no portal ou no dispositivo.');
      }

      let payload;
      try {
        payload = verifyAnyToken(header.slice(7));
      } catch (err) {
        const expired = err instanceof Error && err.name === 'TokenExpiredError';
        // Escopo desconhecido aqui: mensagem neutra que serve aos dois
        throw new ApiError(401, expired ? 'Sessão expirada. Token vencido.' : 'Credencial inválida.');
      }

      const tipo = scopeOf(payload);
      if (!permitidos.includes(tipo)) {
        throw new ApiError(403, 'Escopo do token não permitido para esta rota.');
      }

      // ---------- PORTAL ----------
      if (tipo === 'admin_web') {
        return authMiddleware(req, res, (err?: unknown) => {
          if (err) return next(err);
          req.vault = { tipo, userId: payload.userId, exp: payload.exp };
          next();
        });
      }

      // ---------- DISPOSITIVO ----------
      const publicKey = (payload as { publicKey?: string }).publicKey;
      const user = await UserModel.findById(payload.userId);
      if (!user || !user.public_key_ed25519 || !publicKey || user.public_key_ed25519 !== publicKey) {
        throw new ApiError(401, 'Sessão do dispositivo não é mais válida.');
      }
      if (user.status === 'SUSPENSA') throw new ApiError(423, 'Conta suspensa. Contate o suporte.');
      if (user.status === 'REVOGADA') throw new ApiError(410, 'Conta revogada permanentemente.');

      req.user = user;
      req.vault = { tipo, userId: user.id, publicKey, exp: payload.exp };
      next();
    } catch (err) {
      next(err);
    }
  };
}
