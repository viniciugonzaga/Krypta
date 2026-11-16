// Helpers das suítes novas: conta pareada com sessão de hardware aberta.
const nacl = require('tweetnacl');
const crypto = require('crypto');
const { derivarProva } = require('./ccp');

const BASE = process.env.API_URL || 'http://localhost:3000';
const SENHA = 'senha12345';
const b64 = (buf) => Buffer.from(buf).toString('base64');
const u8 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function req(metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function loginHardware(par) {
  const publicKey = b64(par.publicKey);
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: publicKey } });
  const assinatura = b64(nacl.sign.detached(u8(ch.body.nonce), par.secretKey));
  return (await req('POST', '/auth/verify', { corpo: { public_key: publicKey, assinatura } })).body.token;
}

// Todas as contas de teste usam este domínio: a limpeza apaga por ele.
async function contaPareada(prefixo) {
  const email = `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@race.example.test`;
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: SENHA } });
  const admin = (await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: SENHA } })).body.token;
  const par = nacl.sign.keyPair();
  const publicKey = b64(par.publicKey);
  const prova = derivarProva(crypto.randomBytes(16).toString('base64url'), c.body.id);
  const p = await req('POST', '/hardware/pair', { token: admin, corpo: { public_key: publicKey, prova_cont_dono: prova } });
  if (p.status !== 200) throw new Error(`pareamento falhou (${p.status})`);
  const hw = await loginHardware(par);
  return { id: c.body.id, email, admin, hw, par, publicKey, prova };
}

module.exports = { req, b64, u8, loginHardware, contaPareada };
