// server/src/utils/cofreRemoto.ts
// ============================================================
// Peças do servidor para a SENHA DE ACESSO AO COFRE (v1.2.0, Krypta Pro)
//
// 1) SEGREDO DO SERVIDOR ("a metade do servidor")
//    32 bytes aleatórios por conta. A chave do envelope do PIN é derivada no
//    NAVEGADOR de (PIN + este segredo). Assim:
//      • quem roubar só o banco NÃO consegue testar PINs offline: o segredo
//        está cifrado com uma chave derivada do PASSWORD_PEPPER (que fica no .env);
//      • o servidor só libera o segredo DEPOIS de conferir o PIN
//        (máx. 5 erros → bloqueia; desbloquear exige a CCP).
//
// 2) TOKEN DO COFRE (header X-Krypta-Cofre)
//    JWT curto (15 min) assinado com uma chave PRÓPRIA (derivada do JWT_SECRET
//    com HKDF). Nunca é confundido com o token do site nem do dispositivo e
//    fica preso à sessão do site que abriu o cofre (sid = jti da sessão).
// ============================================================
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function derivarChave(base: string, info: string): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(base, 'utf8'), Buffer.alloc(0), Buffer.from(info, 'utf8'), 32));
}

const CHAVE_SEGREDO = () => derivarChave(env.PASSWORD_PEPPER, 'krypta-segredo-remoto-v1');
const CHAVE_TOKEN = () => derivarChave(env.JWT_SECRET, 'krypta-token-cofre-remoto-v1');

/** Novo segredo do servidor: devolve o valor (base64) e a forma cifrada para o banco */
export function novoSegredo(): { segredo: string; cifrado: string } {
  const segredo = crypto.randomBytes(32);
  return { segredo: segredo.toString('base64'), cifrado: cifrarSegredo(segredo) };
}

function cifrarSegredo(segredo: Buffer): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', CHAVE_SEGREDO(), iv);
  const ct = Buffer.concat([c.update(segredo), c.final()]);
  return ['v1', iv.toString('base64'), ct.toString('base64'), c.getAuthTag().toString('base64')].join('.');
}

export function abrirSegredo(cifrado: string): string {
  const [v, iv, ct, tag] = cifrado.split('.');
  if (v !== 'v1' || !iv || !ct || !tag) throw new Error('segredo remoto em formato desconhecido');
  const d = crypto.createDecipheriv('aes-256-gcm', CHAVE_SEGREDO(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('base64');
}

export interface TokenCofre {
  userId: string;
  /** jti da sessão do site que abriu o cofre */
  sid: string;
  /** "geração" da senha de acesso: reconfigurar ou remover invalida tokens antigos */
  g: number;
  tipo: 'cofre_remoto';
}

export const MINUTOS_TOKEN_COFRE = 15;

export function gerarTokenCofre(userId: string, sid: string, geracao: number): { token: string; expiraEm: Date } {
  const payload: TokenCofre = { userId, sid, g: geracao, tipo: 'cofre_remoto' };
  const token = jwt.sign(payload, CHAVE_TOKEN(), { algorithm: 'HS256', expiresIn: `${MINUTOS_TOKEN_COFRE}m` });
  return { token, expiraEm: new Date(Date.now() + MINUTOS_TOKEN_COFRE * 60_000) };
}

export function verificarTokenCofre(token: string): TokenCofre {
  const p = jwt.verify(token, CHAVE_TOKEN(), { algorithms: ['HS256'] }) as TokenCofre;
  if (p.tipo !== 'cofre_remoto') throw new Error('tipo inválido');
  return p;
}

/** Geração = instante em que a senha de acesso foi ativada (segundos) */
export function geracaoDe(data: Date | string): number {
  return Math.floor(new Date(data).getTime() / 1000);
}
