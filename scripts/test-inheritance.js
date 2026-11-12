// Testa a Herança Digital: ativar/trocar/remover a CCH e o resgate pelo herdeiro.
const nacl = require('tweetnacl');
const crypto = require('crypto');
const pool = require('../src/db/connection');
const { derivarProva, derivarProvaHerdeiro } = require('./ccp');

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

async function criarContaPareada(prefixo) {
  const email = `${prefixo}-${Date.now()}@krypta.dev`;
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: SENHA } });
  const admin = (await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: SENHA } })).body.token;
  const par = nacl.sign.keyPair();
  const publicKey = b64(par.publicKey);
  const prova = derivarProva(crypto.randomBytes(16).toString('base64url'), c.body.id);
  const p = await req('POST', '/hardware/pair', { token: admin, corpo: { public_key: publicKey, prova_cont_dono: prova } });
  if (p.status !== 200) throw new Error(`setup falhou no pareamento (${p.status})`);
  return { id: c.body.id, admin, par, publicKey, prova };
}

async function loginHardware(par) {
  const publicKey = b64(par.publicKey);
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: publicKey } });
  if (ch.status !== 200) return null;
  const assinatura = b64(nacl.sign.detached(u8(ch.body.nonce), par.secretKey));
  const v = await req('POST', '/auth/verify', { corpo: { public_key: publicKey, assinatura } });
  return v.body.token || null;
}

const put = (token, v, payload) => req('PUT', '/backup', { token, corpo: { version_counter: v, payload_cifrado: payload } });
const get = (token) => req('GET', '/backup', { token });
const habilitar = (token, atual, herdeiro, v, payload) =>
  req('POST', '/inheritance/enable', {
    token,
    corpo: { prova_cont_dono_atual: atual, prova_cont_herdeiro: herdeiro, version_counter: v, payload_cifrado: payload },
  });
const desabilitar = (token, atual, v, payload) =>
  req('POST', '/inheritance/disable', {
    token,
    corpo: { prova_cont_dono_atual: atual, version_counter: v, payload_cifrado: payload },
  });
const resgatar = (corpo) => req('POST', '/inheritance/claim', { corpo });

const hashHerdeiro = async (id) =>
  (await pool.query('SELECT hash_cont_herdeiro AS h FROM contas WHERE id = $1;', [id])).rows[0].h;
const estadoConta = async (id) =>
  (await pool.query('SELECT status, public_key FROM contas WHERE id = $1;', [id])).rows[0];
const backupNoBanco = async (id) =>
  (await pool.query('SELECT payload_cifrado, version_counter FROM backups WHERE conta_id = $1;', [id])).rows[0];
const igual = (row, v, vault) =>
  row && row.version_counter === v && Buffer.compare(row.payload_cifrado, Buffer.from(vault, 'base64')) === 0;

(async () => {
  const A = await criarContaPareada('her-a'); // dono, com herança
  const B = await criarContaPareada('her-b'); // só fornece uma public_key já em uso
  const C = await criarContaPareada('her-c'); // sem herança; usada para testar estados

  const hw = await loginHardware(A.par);
  const hwC = await loginHardware(C.par);
  const base = Math.floor(Date.now() / 1000);
  const v = Array.from({ length: 5 }, () => b64(crypto.randomBytes(256)));

  const h0 = derivarProvaHerdeiro(crypto.randomBytes(16).toString('base64url'), A.id);
  const h1 = derivarProvaHerdeiro(crypto.randomBytes(16).toString('base64url'), A.id);
  const hErrada = derivarProvaHerdeiro('cch-errada', A.id);
  const provaDonoErrada = derivarProva('ccp-errada', A.id);

  checar('backup inicial', 200, await put(hw, base, v[0]));

  console.log('\n== Ativar a herança (opt-in) ==');
  checar('sem token', 401, await habilitar(undefined, A.prova, h0, base + 1, v[1]));
  checar('token admin_web barrado (exige hardware)', 403, await habilitar(A.admin, A.prova, h0, base + 1, v[1]));
  checar('CCH em texto claro no lugar da prova', 400, await habilitar(hw, A.prova, 'meukit', base + 1, v[1]));
  checar('prova do herdeiro igual à do dono', 400, await habilitar(hw, A.prova, A.prova, base + 1, v[1]));
  checar('prova do dono errada', 401, await habilitar(hw, provaDonoErrada, h0, base + 1, v[1]));
  checar('versão igual à armazenada (anti-rollback)', 409, await habilitar(hw, A.prova, h0, base, v[1]));
  verificar('falha não ativou a herança', (await hashHerdeiro(A.id)) === null);
  verificar('falha não trocou o backup', igual(await backupNoBanco(A.id), base, v[0]));
  checar('ativação válida', 200, await habilitar(hw, A.prova, h0, base + 1, v[1]));
  const hashGuardado = await hashHerdeiro(A.id);
  verificar('servidor guarda bcrypt, não a prova', !!hashGuardado && hashGuardado.startsWith('$2') && hashGuardado !== h0);
  verificar('backup com o novo envelope gravado na mesma operação', igual(await backupNoBanco(A.id), base + 1, v[1]));

  console.log('\n== Trocar e remover a CCH ==');
  checar('troca da CCH (rotação do herdeiro)', 200, await habilitar(hw, A.prova, h1, base + 2, v[2]));
  checar('CCH antiga deixou de valer', 401,
    await resgatar({ conta_id: A.id, prova_cont_herdeiro: h0, public_key: b64(crypto.randomBytes(32)) }));
  checar('remover com prova do dono errada', 401, await desabilitar(hw, provaDonoErrada, base + 3, v[3]));
  checar('remover a herança', 200, await desabilitar(hw, A.prova, base + 3, v[3]));
  verificar('CCH apagada no banco', (await hashHerdeiro(A.id)) === null);
  verificar('backup sem o envelope do herdeiro gravado', igual(await backupNoBanco(A.id), base + 3, v[3]));
  checar('resgate com a herança desativada', 401,
    await resgatar({ conta_id: A.id, prova_cont_herdeiro: h1, public_key: b64(crypto.randomBytes(32)) }));
  checar('reativar a herança', 200, await habilitar(hw, A.prova, h1, base + 4, v[4]));

  console.log('\n== Estados ==');
  await pool.query("UPDATE contas SET status = 'RECUPERACAO_LOCAL' WHERE id = $1;", [C.id]);
  checar('ativar herança fora de ATIVA', 409,
    await habilitar(hwC, C.prova, derivarProvaHerdeiro('qualquer', C.id), base + 1, v[1]));

  console.log('\n== Resgate: validação e sigilo ==');
  const pkNovo = b64(nacl.sign.keyPair().publicKey);
  checar('conta_id malformado', 400, await resgatar({ conta_id: 'abc', prova_cont_herdeiro: h1, public_key: pkNovo }));
  checar('public_key malformada', 400, await resgatar({ conta_id: A.id, prova_cont_herdeiro: h1, public_key: 'abc' }));
  checar('CCH em texto claro', 400, await resgatar({ conta_id: A.id, prova_cont_herdeiro: 'meukit', public_key: pkNovo }));
  const rErrada = await resgatar({ conta_id: A.id, prova_cont_herdeiro: hErrada, public_key: pkNovo });
  checar('CCH errada', 401, rErrada);
  checar('prova do DONO usada como CCH', 401, await resgatar({ conta_id: A.id, prova_cont_herdeiro: A.prova, public_key: pkNovo }));
  const rInexistente = await resgatar({
    conta_id: crypto.randomUUID(),
    prova_cont_herdeiro: derivarProvaHerdeiro('x', A.id),
    public_key: pkNovo,
  });
  checar('conta inexistente', 401, rInexistente);
  const rSemHeranca = await resgatar({
    conta_id: C.id,
    prova_cont_herdeiro: derivarProvaHerdeiro('x', C.id),
    public_key: pkNovo,
  });
  checar('conta sem herança ativada', 401, rSemHeranca);
  verificar(
    'mesma resposta nos três casos (não revela quais contas têm herança)',
    JSON.stringify(rErrada.body) === JSON.stringify(rInexistente.body) &&
      JSON.stringify(rErrada.body) === JSON.stringify(rSemHeranca.body)
  );

  console.log('\n== Resgate: rejeições que não podem alterar a conta ==');
  checar('dispositivo do herdeiro com a mesma chave do dono', 409,
    await resgatar({ conta_id: A.id, prova_cont_herdeiro: h1, public_key: A.publicKey }));
  checar('chave já vinculada a outra conta (RN01)', 409,
    await resgatar({ conta_id: A.id, prova_cont_herdeiro: h1, public_key: B.publicKey }));
  const intacta = await estadoConta(A.id);
  verificar(
    'rejeições não alteraram a conta (tudo ou nada)',
    intacta.status === 'ATIVA' && intacta.public_key === A.publicKey && (await hashHerdeiro(A.id)) !== null
  );

  console.log('\n== Resgate válido ==');
  const novo = nacl.sign.keyPair();
  const pkHerdeiro = b64(novo.publicKey);
  const ok = await resgatar({ conta_id: A.id, prova_cont_herdeiro: h1, public_key: pkHerdeiro });
  checar('resgate com a CCH correta', 200, ok);
  verificar('RECUPERACAO_HARDWARE com a chave do herdeiro', ok.body.status === 'RECUPERACAO_HARDWARE' && ok.body.public_key === pkHerdeiro);
  verificar('resposta não expõe o email do dono', !('email' in ok.body));
  const rev = (await pool.query('SELECT motivo FROM chaves_revogadas WHERE public_key = $1;', [A.publicKey])).rows[0];
  verificar('chave do dono arquivada como KILL_SWITCH_HERDEIRO', !!rev && rev.motivo === 'KILL_SWITCH_HERDEIRO');
  verificar('CCH consumida (uso único)', (await hashHerdeiro(A.id)) === null);
  checar('resgate repetido com a mesma CCH', 401, await resgatar({ conta_id: A.id, prova_cont_herdeiro: h1, public_key: pkHerdeiro }));

  console.log('\n== O dispositivo antigo perdeu o acesso ==');
  checar('sessão antiga não sincroniza', 401, await put(hw, base + 5, v[0]));
  checar('sessão antiga não baixa o backup', 401, await get(hw));
  checar('chave antiga não faz login', 404, await req('POST', '/auth/challenge', { corpo: { public_key: A.publicKey } }));

  console.log('\n== O herdeiro recupera o cofre ==');
  const tkNovo = await loginHardware(novo);
  verificar('dispositivo do herdeiro faz login', !!tkNovo);
  const dl = await get(tkNovo);
  checar('dispositivo do herdeiro baixa o backup', 200, dl);
  verificar('baixou a última versão enviada pelo dono', dl.body.payload_cifrado === v[4]);
  checar('concluir a recuperação', 200, await req('POST', '/recovery/complete', { token: tkNovo }));

  await pool.query("DELETE FROM contas WHERE email LIKE 'her-%@krypta.dev';");

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
