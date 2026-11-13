// Testa a rotina de TTL (RN11). Manipula datas direto no banco; notificador falso injetado.
const nacl = require('tweetnacl');
const crypto = require('crypto');
const pool = require('../src/db/connection');
const ttlService = require('../src/services/ttlService');
const { derivarProva } = require('./ccp');

const BASE = process.env.API_URL || 'http://localhost:3000';
const b64 = (buf) => Buffer.from(buf).toString('base64');
const u8 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

let falhas = 0;
let n = 0;
function verificar(nome, cond) {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}`);
}

async function contaInativa(dias) {
  const r = await pool.query(
    `INSERT INTO contas (email, senha_admin_hash, ultimo_sincronismo)
     VALUES ($1, 'x', CURRENT_TIMESTAMP - make_interval(days => $2::int))
     RETURNING id;`,
    [`ttl-${Date.now()}-${n++}@krypta.dev`, dias]
  );
  return r.rows[0].id;
}
const existe = async (id) => (await pool.query('SELECT 1 FROM contas WHERE id = $1;', [id])).rowCount > 0;
const avisos = async (id) =>
  (await pool.query('SELECT nivel FROM avisos_ttl WHERE conta_id = $1 ORDER BY nivel;', [id])).rows.map((r) => r.nivel);

function notificador(retorno = true) {
  return {
    chamadas: [],
    async enviarAvisoInatividade(args) { this.chamadas.push(args); return retorno; },
  };
}
const niveisEnviados = (nt, id) => nt.chamadas.filter((c) => c.contaId === id).map((c) => c.nivel).join();

async function req(metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  console.log('\n== Quem recebe qual aviso ==');
  const recente = await contaInativa(100);
  const d30 = await contaInativa(340);
  const d15 = await contaInativa(352);
  const h48 = await contaInativa(363);
  let nt = notificador();
  await ttlService.executarVarredura({ notificador: nt });
  verificar('100 dias: nenhum aviso', niveisEnviados(nt, recente) === '');
  verificar('340 dias: D30', niveisEnviados(nt, d30) === 'D30');
  verificar('352 dias: D15 (só o mais urgente)', niveisEnviados(nt, d15) === 'D15');
  verificar('363 dias: H48', niveisEnviados(nt, h48) === 'H48');
  verificar('avisos registrados no banco', (await avisos(d30)).join() === 'D30' && (await avisos(h48)).join() === 'H48');

  console.log('\n== Idempotência ==');
  nt = notificador();
  await ttlService.executarVarredura({ notificador: nt });
  verificar('segunda varredura não reenvia', [d30, d15, h48].every((id) => niveisEnviados(nt, id) === ''));

  console.log('\n== Conta muito atrasada ==');
  const atrasada = await contaInativa(400);
  const aviso48Recente = await contaInativa(400);
  nt = notificador();
  await ttlService.executarVarredura({ notificador: nt });
  verificar('recebe 1 aviso (H48), não 3', niveisEnviados(nt, atrasada) === 'H48');
  verificar('não é excluída na mesma varredura', await existe(atrasada));

  console.log('\n== Exclusão (RN11) ==');
  await pool.query('INSERT INTO backups (conta_id, payload_cifrado, version_counter) VALUES ($1, $2, 1);', [atrasada, Buffer.from('cofre-cifrado')]);
  await pool.query(
    "UPDATE avisos_ttl SET enviado_em = CURRENT_TIMESTAMP - INTERVAL '49 hours' WHERE conta_id = $1;",
    [atrasada]
  );
  await ttlService.executarVarredura({ notificador: notificador() });
  verificar('aviso H48 com mais de 48h: conta excluída', !(await existe(atrasada)));
  verificar('backup e avisos removidos em cascata',
    (await pool.query('SELECT 1 FROM backups WHERE conta_id = $1;', [atrasada])).rowCount === 0 &&
    (await avisos(atrasada)).length === 0);
  verificar('aviso H48 de 1 hora atrás: conta preservada', await existe(aviso48Recente));

  const renovou = await contaInativa(400);
  await pool.query(
    `INSERT INTO avisos_ttl (conta_id, nivel, sincronismo_ref, enviado_em)
     SELECT id, 'H48', ultimo_sincronismo, CURRENT_TIMESTAMP - INTERVAL '49 hours' FROM contas WHERE id = $1;`,
    [renovou]
  );
  await pool.query('UPDATE contas SET ultimo_sincronismo = CURRENT_TIMESTAMP WHERE id = $1;', [renovou]);
  await ttlService.executarVarredura({ notificador: notificador() });
  verificar('usuário sincronizou depois do aviso: conta preservada', await existe(renovou));

  console.log('\n== Sem envio confirmado, nada é excluído ==');
  const semConfirmacao = await contaInativa(400);
  const nf = notificador(false);
  await ttlService.executarVarredura({ notificador: nf });
  verificar('notificador retorna false: aviso não registrado', (await avisos(semConfirmacao)).length === 0);
  verificar('notificador retorna false: conta preservada', await existe(semConfirmacao));

  const semSmtp = await contaInativa(400);
  require('../src/services/notificacaoService')._definirTransporte(null); // sem SMTP
  await ttlService.executarVarredura(); // notificador padrão
  verificar('stub padrão: aviso não registrado', (await avisos(semSmtp)).length === 0);
  verificar('stub padrão: conta preservada', await existe(semSmtp));

  console.log('\n== Login por hardware renova o prazo ==');
  const email = `ttl-login-${Date.now()}@krypta.dev`;
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: 'senha12345' } });
  const admin = (await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: 'senha12345' } })).body.token;
  const par = nacl.sign.keyPair();
  const pk = b64(par.publicKey);
  const p = await req('POST', '/hardware/pair', {
    token: admin,
    corpo: { public_key: pk, prova_cont_dono: derivarProva(crypto.randomBytes(16).toString('base64url'), c.body.id) },
  });
  await pool.query("UPDATE contas SET ultimo_sincronismo = CURRENT_TIMESTAMP - INTERVAL '200 days' WHERE id = $1;", [c.body.id]);
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: pk } });
  const sig = b64(nacl.sign.detached(u8(ch.body.nonce), par.secretKey));
  const v = await req('POST', '/auth/verify', { corpo: { public_key: pk, assinatura: sig } });
  const seg = (await pool.query(
    'SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ultimo_sincronismo)) AS seg FROM contas WHERE id = $1;',
    [c.body.id]
  )).rows[0].seg;
  verificar('pareamento e login funcionaram', p.status === 200 && v.status === 200);
  verificar('ultimo_sincronismo voltou para agora após o login', Number(seg) < 60);

  await pool.query("DELETE FROM contas WHERE email LIKE 'ttl-%@krypta.dev';");

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e); process.exit(1); });