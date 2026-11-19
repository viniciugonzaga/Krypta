// server/src/utils/pepper.ts
// ============================================================
// bcrypt + PEPPER (RNF02) — usado nas PROVAS de contingência
// (CCP do dono e CCH do herdeiro).
//
// O valor passa por HMAC-SHA256 com um segredo do SERVIDOR antes
// do bcrypt. Assim, um vazamento só do banco não basta para testar
// provas offline, e o pré-hash evita o limite de 72 bytes do bcrypt.
//
// ⚠️ A senha de login do SITE continua em utils/hash.ts (bcrypt puro).
// Se aplicássemos o pepper nela, todas as senhas atuais quebrariam.
// ============================================================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';

const ROUNDS = 12;

const preparar = (valor: string) =>
  crypto.createHmac('sha256', env.PASSWORD_PEPPER).update(String(valor)).digest('base64');

export function hashComPepper(valor: string): Promise<string> {
  return bcrypt.hash(preparar(valor), ROUNDS);
}

export function compararComPepper(valor: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(preparar(valor), hash);
}
