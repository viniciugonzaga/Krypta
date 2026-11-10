// Testa POST /account/rotate-ccp: atomicidade com o backup, invalidação da prova antiga e estados.
const nacl = require('tweetnacl');
const crypto = require('crypto');
const pool = require('../src/db/connection');
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

let falhas = 0;
function checar(nome, esperado, r) {
  const ok = r.status === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome} -> esperado ${esperado}, veio ${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
}
function verificar(nome, cond) {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}`);
}

(async () => {
  const email = `ccp-${Date.now()}@krypta.dev`;
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: SENHA } });
  const id = c.body.id;
  const admin = (await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: SENHA } })).body.token;

  const par = nacl.sign.keyPair();
  const pk = b64(par.publicKey);
  const novaProva = () => derivarProva(crypto.randomBytes(16).toString('base64url'), id);
  const p0 = novaProva();
  const p1 = novaProva();
  const p2 = novaProva();
  const pErrada = derivarProva('ccp-errada', id);

  const pair = await req('POST', '/hardware/pair', { token: admin, corpo: { public_key: pk, prova_cont_dono: p0 } });
  if (pair.status !== 200) throw new Error(`pareamento falhou (${pair.status})`);

  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: pk } });
  const sig = b64(nacl.sign.detached(u8(ch.body.nonce), par.secretKey));
  const hw = (await req('POST', '/auth/verify', { corpo: { public_key: pk, assinatura: sig } })).body.token;

  const base = Math.floor(Date.now() / 1000);
  const vault1 = b64(crypto.randomBytes(256));
  const vault2 = b64(crypto.randomBytes(256));
  const vault3 = b64(crypto.randomBytes(256));

  const rot = (token, atual, nova, v, payload) =>
    req('POST', '/account/rotate-ccp', {
      token,
      corpo: { prova_cont_dono_atual: atual, prova_cont_dono_nova: nova, version_counter: v, payload_cifrado: payload },
    });
  const noBanco = async () =>
    (await pool.query('SELECT payload_cifrado, version_counter FROM backups WHERE conta_id = $1;', [id])).rows[0];
  const igual = (row, v, vault) =>
    row && row.version_counter === v && Buffer.compare(row.payload_cifrado, Buffer.from(vault, 'base64')) === 0;

  console.log('\n== Preparação ==');
  checar('backup inicial', 200, await req('PUT', '/backup', { token: hw, corpo: { version_counter: base, payload_cifrado: vault1 } }));

  console.log('\n== Autenticação e formato ==');
  checar('sem token', 401, await rot(undefined, p0, p1, base + 1, vault2));
  checar('token admin_web barrado (exige hardware)', 403, await rot(admin, p0, p1, base + 1, vault2));
  checar('prova atual em texto claro', 400, await rot(hw, 'minhaccp', p1, base + 1, vault2));
  checar('prova nova em texto claro', 400, await rot(hw, p0, 'minhaccp', base + 1, vault2));
  checar('prova nova igual à atual', 400, await rot(hw, p0, p0, base + 1, vault2));
  checar('version_counter 0', 400, await rot(hw, p0, p1, 0, vault2));
  checar('payload não-base64', 400, await rot(hw, p0, p1, base + 1, 'isso não é base64!'));
  checar('prova atual errada', 401, await rot(hw, pErrada, p1, base + 1, vault2));

  console.log('\n== Tudo ou nada ==');
  checar('versão igual à armazenada (anti-rollback)', 409, await rot(hw, p0, p1, base, vault2));
  verificar('falha não trocou o backup', igual(await noBanco(), base, vault1));
  checar('rotação válida (a prova antiga ainda valia depois da falha de versão)', 200, await rot(hw, p0, p1, base + 1, vault2));
  verificar('backup e versão atualizados na mesma operação', igual(await noBanco(), base + 1, vault2));
  const hash = (await pool.query('SELECT hash_cont_dono FROM contas WHERE id = $1;', [id])).rows[0].hash_cont_dono;
  verificar('servidor guarda bcrypt, não a prova', hash.startsWith('$2') && hash !== p1);
  checar('prova antiga invalidada', 401, await rot(hw, p0, p2, base + 2, vault3));
  checar('prova nova passa a valer como atual', 200, await rot(hw, p1, p2, base + 2, vault3));
  verificar('segunda rotação também gravou o backup', igual(await noBanco(), base + 2, vault3));

  console.log('\n== Estados ==');
  await pool.query("UPDATE contas SET status = 'RECUPERACAO_LOCAL' WHERE id = $1;", [id]);
  checar('conta fora de ATIVA', 409, await rot(hw, p2, p1, base + 3, vault1));
  await pool.query("UPDATE contas SET status = 'REVOGADA' WHERE id = $1;", [id]);
  checar('conta REVOGADA', 409, await rot(hw, p2, p1, base + 3, vault1));

  await pool.query("DELETE FROM contas WHERE email LIKE 'ccp-%@krypta.dev';");

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
