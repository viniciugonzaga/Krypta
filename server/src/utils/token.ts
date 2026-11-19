// server/src/utils/token.ts
// ============================================================
// Dois tipos (escopos) de token, ambos JWT HS256:
//
//  • admin_web  → login no SITE (email + senha). 24h + refresh token.
//                 Abre perfil, planos, pareamento, Kill Switch...
//                 NUNCA abre o conteúdo do cofre.
//  • hardware   → login do DISPOSITIVO (assinatura Ed25519). 15 min.
//                 Abre as rotas do cofre. Fica preso à public_key:
//                 se a chave mudar (Kill Switch, herança), morre na hora.
// ============================================================
import jwt, { type SignOptions, type JwtPayload as BaseJwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export type TokenScope = 'admin_web' | 'hardware';

export interface KryptaJwtPayload extends BaseJwtPayload {
  userId: string;
  jti: string;
  /** Tokens antigos (antes da integração) não têm "tipo": valem como admin_web */
  tipo?: 'admin_web';
}

export interface HardwareJwtPayload extends BaseJwtPayload {
  userId: string;
  publicKey: string;
  tipo: 'hardware';
}

export type AnyJwtPayload = KryptaJwtPayload | HardwareJwtPayload;

// Algoritmo fixado: nunca aceitar o que o próprio token declarar
const VERIFY_OPTIONS = { algorithms: ['HS256'] as jwt.Algorithm[] };

// ------------------------------------------------------------
// PORTAL (admin_web)
// ------------------------------------------------------------
export function generateAccessToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const payload: KryptaJwtPayload = { userId, jti, tipo: 'admin_web' };

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return { token: jwt.sign(payload, env.JWT_SECRET, options), jti };
}

// ------------------------------------------------------------
// DISPOSITIVO (hardware)
// ------------------------------------------------------------
export function generateHardwareToken(userId: string, publicKey: string): { token: string; expiresAt: Date } {
  const payload: HardwareJwtPayload = { userId, publicKey, tipo: 'hardware' };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.HARDWARE_TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
  });
  const exp = (jwt.decode(token) as BaseJwtPayload).exp ?? 0;
  return { token, expiresAt: new Date(exp * 1000) };
}

// ------------------------------------------------------------
// VERIFICAÇÃO
// ------------------------------------------------------------
/** Verifica assinatura e validade. Lança erro do jsonwebtoken se inválido/expirado. */
export function verifyAnyToken(token: string): AnyJwtPayload {
  return jwt.verify(token, env.JWT_SECRET, VERIFY_OPTIONS) as AnyJwtPayload;
}

/** Escopo do token (tokens sem "tipo" são do portal) */
export function scopeOf(payload: AnyJwtPayload): TokenScope {
  return payload.tipo === 'hardware' ? 'hardware' : 'admin_web';
}

/** Mantido para compatibilidade com o código existente */
export function verifyAccessToken(token: string): KryptaJwtPayload {
  return verifyAnyToken(token) as KryptaJwtPayload;
}

export function generateRefreshToken(): string {
  return `krypta_rf_${crypto.randomUUID()}_${crypto.randomBytes(16).toString('hex')}`;
}

export function generateRecoveryCode(): string {
  const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${part1}-${part2}`;
}
