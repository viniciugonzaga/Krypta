// Roda os casos de erro do /auth/* e os de /auth/session. Requer: setup já executado.
const nacl = require('tweetnacl');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../src/config/env');
const keys = require('./.sim-keys.json');

const BASE = process.env.API_URL || 'http://localhost:3000';
const b64 = (buf) => Buffer.from(buf).toString('base64');
const u8 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function req(metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, {
    method: metodo,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

let falhas = 0;
function checar(nome, esperado, r) {
  const ok = r.status === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome} -> esperado ${esperado}, veio ${r.status} ${JSON.stringify(r.body)}`);
}

(async () => {
  const randomKey = () => b64(crypto.randomBytes(32));

  console.log('\n== Casos de erro do /auth/* ==');
  checar('challenge com public_key malformada', 400,
    await req('POST', '/auth/challenge', { corpo: { public_key: 'abc' } }));
  checar('challenge com public_key válida não cadastrada', 404,
    await req('POST', '/auth/challenge', { corpo: { public_key: randomKey() } }));
  checar('verify sem challenge prévio', 401,
    await req('POST', '/auth/verify', { corpo: { public_key: keys.publicKey, assinatura: b64(crypto.randomBytes(64)) } }));
  checar('verify com assinatura malformada', 400,
    await req('POST', '/auth/verify', { corpo: { public_key: keys.publicKey, assinatura: 'abc' } }));

  console.log('\n== Login real (simulando o hardware) ==');
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: keys.publicKey } });
  checar('challenge', 200, ch);
  const assinatura = b64(nacl.sign.detached(u8(ch.body.nonce), u8(keys.secretKey)));
  const v = await req('POST', '/auth/verify', { corpo: { public_key: keys.publicKey, assinatura } });
  checar('verify', 200, v);
  const token = v.body.token;

  console.log('\n== /auth/session ==');
  checar('token hardware válido', 200, await req('GET', '/auth/session', { token }));
  checar('sem header Authorization', 401, await req('GET', '/auth/session'));
  checar('token adulterado', 401, await req('GET', '/auth/session', { token: token + 'x' }));

  const admin = jwt.sign({ contaId: 'x', tipo: 'admin_web' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  checar('token válido com escopo admin_web', 403, await req('GET', '/auth/session', { token: admin }));

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
