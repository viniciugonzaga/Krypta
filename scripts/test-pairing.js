// Testa autenticação do pareamento, formato da prova e isolamento entre contas.
const crypto = require('crypto');
const { derivarProva } = require('./ccp');

const BASE = process.env.API_URL || 'http://localhost:3000';
const SENHA = 'senha12345';
const b64 = (buf) => Buffer.from(buf).toString('base64');

async function req(metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

let falhas = 0;
function checar(nome, esperado, r) {
  const ok = r.status === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome} -> esperado ${esperado}, veio ${r.status} ${JSON.stringify(r.body).slice(0, 110)}`);
}

async function novaConta(prefixo) {
  const email = `${prefixo}-${Date.now()}@krypta.dev`;
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: SENHA } });
  const l = await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: SENHA } });
  return { id: c.body.id, token: l.body.token };
}

(async () => {
  const A = await novaConta('par-a');
  const B = await novaConta('par-b');
  const pkA = b64(crypto.randomBytes(32));
  const provaA = derivarProva(crypto.randomBytes(16).toString('base64url'), A.id);

  console.log('\n== Autenticação do pareamento ==');
  checar('pareamento sem token', 401, await req('POST', '/hardware/pair', { corpo: { public_key: pkA, prova_cont_dono: provaA } }));
  checar('CCP em texto claro no lugar da prova', 400,
    await req('POST', '/hardware/pair', { token: A.token, corpo: { public_key: pkA, prova_cont_dono: 'minhasenha123' } }));
  checar('pareamento válido (conta A)', 200,
    await req('POST', '/hardware/pair', { token: A.token, corpo: { public_key: pkA, prova_cont_dono: provaA } }));
  checar('pareamento repetido (conta A, já ATIVA)', 409,
    await req('POST', '/hardware/pair', { token: A.token, corpo: { public_key: b64(crypto.randomBytes(32)), prova_cont_dono: provaA } }));
  checar('mesma public_key em outra conta (RN01)', 409,
    await req('POST', '/hardware/pair', { token: B.token, corpo: { public_key: pkA, prova_cont_dono: derivarProva('outra-ccp', B.id) } }));

  console.log('\n== Isolamento entre contas ==');
  checar('GET da própria conta', 200, await req('GET', `/accounts/${A.id}`, { token: A.token }));
  checar('GET de conta alheia', 403, await req('GET', `/accounts/${B.id}`, { token: A.token }));
  checar('GET sem token', 401, await req('GET', `/accounts/${A.id}`));

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
