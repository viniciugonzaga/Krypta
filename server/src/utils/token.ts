import jwt, { type SignOptions, type JwtPayload as BaseJwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export interface KryptaJwtPayload extends BaseJwtPayload {
  userId: string;
  jti: string;
}

export function generateAccessToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();

  const payload: KryptaJwtPayload = { userId, jti };

  const options: SignOptions = {
    // Cast necessário porque env.JWT_EXPIRES_IN é string genérica
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  const token = jwt.sign(payload, env.JWT_SECRET, options);

  return { token, jti };
}

export function verifyAccessToken(token: string): KryptaJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as KryptaJwtPayload;
}

export function generateRefreshToken(): string {
  return `krypta_rf_${crypto.randomUUID()}_${crypto.randomBytes(16).toString('hex')}`;
}

export function generateRecoveryCode(): string {
  const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${part1}-${part2}`;
}