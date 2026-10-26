// Testa PUT/GET /backup. Requer: simulate-hardware.js setup já executado.
const nacl = require('tweetnacl');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET } = require('../src/config/env');
const keys = require('./.sim-keys.json');

const BASE = process.env.API_URL || 'http://localhost:3000';
const b64 = (buf) => Buffer.from(buf).toString('base64');
const u8 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function req(metodo, rota, { corpo, token, bruto } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, {
    method: metodo,
    headers,
    body: bruto !== undefined ? bruto : corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

let falhas = 0;
function checar(nome, esperado, r) {
  const ok = r.status === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome} -> esperado ${esperado}, veio ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
}

async function login() {
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: keys.publicKey } });
  const assinatura = b64(nacl.sign.detached(u8(ch.body.nonce), u8(keys.secretKey)));
  const v = await req('POST', '/auth/verify', { corpo: { public_key: keys.publicKey, assinatura } });
  return v.body.token;
}

(async () => {
  const token = await login();
  const payload = () => b64(crypto.randomBytes(256)); // simula o vault.enc cifrado
  // Base por tempo para o teste ser repetível (a versão só pode crescer).
  const base = Math.floor(Date.now() / 1000);

  const adminTk = (await req('POST', '/auth/admin-login', { corpo: { email: keys.email, senha_administrativa: 'senha12345' } })).body.token;
  const antes = await req('GET', `/accounts/${keys.contaId}`, { token: adminTk });

  console.log('\n== PUT /backup ==');
  checar('versão nova', 200, await req('PUT', '/backup', { token, corpo: { version_counter: base, payload_cifrado: payload() } }));
  checar('mesma versão (rollback)', 409, await req('PUT', '/backup', { token, corpo: { version_counter: base, payload_cifrado: payload() } }));
  checar('versão anterior (rollback)', 409, await req('PUT', '/backup', { token, corpo: { version_counter: base - 1, payload_cifrado: payload() } }));
  checar('versão seguinte', 200, await req('PUT', '/backup', { token, corpo: { version_counter: base + 1, payload_cifrado: payload() } }));

  console.log('\n== Validação de entrada ==');
  checar('version_counter 0', 400, await req('PUT', '/backup', { token, corpo: { version_counter: 0, payload_cifrado: payload() } }));
  checar('version_counter string', 400, await req('PUT', '/backup', { token, corpo: { version_counter: '5', payload_cifrado: payload() } }));
  checar('payload não-base64', 400, await req('PUT', '/backup', { token, corpo: { version_counter: base + 2, payload_cifrado: 'isso não é base64!' } }));
  checar('payload ausente', 400, await req('PUT', '/backup', { token, corpo: { version_counter: base + 2 } }));
  checar('JSON malformado (sem stack/HTML)', 400, await req('PUT', '/backup', { token, bruto: '{quebrado' }));
  checar('payload acima do limite', 413, await req('PUT', '/backup', { token, corpo: { version_counter: base + 2, payload_cifrado: b64(crypto.randomBytes(2 * 1024 * 1024)) } }));

  console.log('\n== Autorização ==');
  checar('sem token', 401, await req('PUT', '/backup', { corpo: { version_counter: base + 2, payload_cifrado: payload() } }));
  const admin = jwt.sign({ contaId: keys.contaId, tipo: 'admin_web' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  checar('token admin_web barrado', 403, await req('PUT', '/backup', { token: admin, corpo: { version_counter: base + 2, payload_cifrado: payload() } }));
  checar('GET em conta ATIVA bloqueado (RN04)', 403, await req('GET', '/backup', { token }));

  console.log('\n== TTL (RN11) ==');
  const depois = await req('GET', `/accounts/${keys.contaId}`, { token: adminTk });
  const avancou = new Date(depois.body.ultimo_sincronismo) > new Date(antes.body.ultimo_sincronismo);
  if (!avancou) falhas++;
  console.log(`${avancou ? 'OK   ' : 'FALHA'} ultimo_sincronismo avançou após backup`);

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
