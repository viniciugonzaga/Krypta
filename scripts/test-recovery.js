// Testa recuperação local, Kill Switch e recuperação de hardware de ponta a ponta.
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

async function criarConta(prefixo, { parear }) {
  const email = `${prefixo}-${Date.now()}@krypta.dev`;
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: SENHA } });
  const admin = (await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: SENHA } })).body.token;
  const conta = { id: c.body.id, admin };
  if (!parear) return conta;

  conta.prova = derivarProva(crypto.randomBytes(16).toString('base64url'), conta.id);
  conta.par = nacl.sign.keyPair();
  conta.publicKey = b64(conta.par.publicKey);
  const p = await req('POST', '/hardware/pair', {
    token: admin,
    corpo: { public_key: conta.publicKey, prova_cont_dono: conta.prova },
  });
  if (p.status !== 200) throw new Error(`setup falhou no pareamento (${p.status})`);
  return conta;
}

async function loginHardware(par) {
  const publicKey = b64(par.publicKey);
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: publicKey } });
  if (ch.status !== 200) return { status: ch.status, token: null };
  const assinatura = b64(nacl.sign.detached(u8(ch.body.nonce), par.secretKey));
  const v = await req('POST', '/auth/verify', { corpo: { public_key: publicKey, assinatura } });
  return { status: v.status, token: v.body.token };
}

(async () => {
  const A = await criarConta('rec-a', { parear: true });
  const hw = (await loginHardware(A.par)).token;
  const base = Math.floor(Date.now() / 1000);
  const vault1 = b64(crypto.randomBytes(256));
  const vault2 = b64(crypto.randomBytes(256));
  const provaErrada = derivarProva('ccp-errada', A.id);

  const put = (token, v, payload) => req('PUT', '/backup', { token, corpo: { version_counter: v, payload_cifrado: payload } });
  const get = (token) => req('GET', '/backup', { token });
  const owner = (token, prova) => req('POST', '/recovery/owner', { token, corpo: { prova_cont_dono: prova } });
  const kill = (token, prova) => req('POST', '/account/kill-switch', { token, corpo: { prova_cont_dono: prova } });
  const recHw = (token, pk, prova) => req('POST', '/recovery/hardware', { token, corpo: { public_key: pk, prova_cont_dono: prova } });
  const complete = (token) => req('POST', '/recovery/complete', { token });

  console.log('\n== Preparação ==');
  checar('backup inicial em ATIVA', 200, await put(hw, base, vault1));
  checar('download em ATIVA bloqueado (RN04)', 403, await get(hw));

  console.log('\n== Recuperação local (esqueci a senha mestre) ==');
  checar('sem token', 401, await owner(undefined, A.prova));
  checar('token admin_web barrado (exige hardware)', 403, await owner(A.admin, A.prova));
  checar('CCP em texto claro no lugar da prova', 400, await owner(hw, 'minhaccp'));
  checar('prova errada', 401, await owner(hw, provaErrada));
  const rl = await owner(hw, A.prova);
  checar('prova correta', 200, rl);
  verificar('status virou RECUPERACAO_LOCAL', rl.body.status === 'RECUPERACAO_LOCAL');
  checar('recuperação repetida', 409, await owner(hw, A.prova));
  const dl = await get(hw);
  checar('download liberado em RECUPERACAO_LOCAL', 200, dl);
  verificar('payload baixado igual ao enviado', dl.body.payload_cifrado === vault1);
  checar('upload do novo envelope em RECUPERACAO_LOCAL', 200, await put(hw, base + 1, vault2));
  const c1 = await complete(hw);
  checar('concluir recuperação', 200, c1);
  verificar('status voltou a ATIVA', c1.body.status === 'ATIVA');
  checar('download bloqueado de novo', 403, await get(hw));
  checar('concluir sem recuperação em andamento', 409, await complete(hw));

  console.log('\n== Kill Switch ==');
  checar('sem token', 401, await kill(undefined, A.prova));
  checar('token hardware barrado (exige admin_web)', 403, await kill(hw, A.prova));
  checar('prova errada', 401, await kill(A.admin, provaErrada));
  const ks = await kill(A.admin, A.prova);
  checar('prova correta', 200, ks);
  verificar('status REVOGADA e public_key zerada', ks.body.status === 'REVOGADA' && ks.body.public_key === null);
  checar('kill switch repetido', 409, await kill(A.admin, A.prova));
  checar('login com a chave revogada', 404,
    await req('POST', '/auth/challenge', { corpo: { public_key: A.publicKey } }));
  checar('token antigo não sincroniza (status vem do banco)', 403, await put(hw, base + 2, vault2));
  checar('token antigo não baixa', 403, await get(hw));

  console.log('\n== Chave banida ==');
  const C = await criarConta('rec-c', { parear: false });
  checar('chave revogada reaproveitada em outra conta', 409,
    await req('POST', '/hardware/pair', {
      token: C.admin,
      corpo: { public_key: A.publicKey, prova_cont_dono: derivarProva('qualquer', C.id) },
    }));

  console.log('\n== Recuperação de hardware (conta REVOGADA) ==');
  const novo = nacl.sign.keyPair();
  const pkNovo = b64(novo.publicKey);
  checar('sem token', 401, await recHw(undefined, pkNovo, A.prova));
  checar('token hardware barrado (exige admin_web)', 403, await recHw(hw, pkNovo, A.prova));
  checar('public_key malformada', 400, await recHw(A.admin, 'abc', A.prova));
  checar('prova errada', 401, await recHw(A.admin, pkNovo, provaErrada));
  checar('chave revogada como "novo" hardware', 409, await recHw(A.admin, A.publicKey, A.prova));
  const rh = await recHw(A.admin, pkNovo, A.prova);
  checar('novo hardware vinculado', 200, rh);
  verificar('status RECUPERACAO_HARDWARE', rh.body.status === 'RECUPERACAO_HARDWARE');
  checar('repetir (conta já não está REVOGADA)', 409, await recHw(A.admin, pkNovo, A.prova));

  const login2 = await loginHardware(novo);
  verificar('novo hardware consegue login em RECUPERACAO_HARDWARE', login2.status === 200 && !!login2.token);
  const dl2 = await get(login2.token);
  checar('novo hardware baixa o backup', 200, dl2);
  verificar('baixou a última versão enviada (vault2)', dl2.body.payload_cifrado === vault2);
  checar('upload bloqueado até concluir a recuperação', 403, await put(login2.token, base + 2, vault1));
  checar('concluir recuperação de hardware', 200, await complete(login2.token));
  checar('upload liberado após concluir', 200, await put(login2.token, base + 2, vault1));
  checar('download bloqueado de novo', 403, await get(login2.token));

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
