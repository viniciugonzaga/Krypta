// Corridas: requisições simultâneas contra a mesma conta. Valida o FOR UPDATE de verdade.
const nacl = require('tweetnacl');
const crypto = require('crypto');
const pool = require('../src/db/connection');
const { derivarProva, derivarProvaHerdeiro } = require('./ccp');
const { req, b64, contaPareada } = require('./lib');

let falhas = 0;
function verificar(nome, cond) {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}`);
}
function par(nome, rs, esperado) {
  const got = rs.map((r) => r.status).sort((a, b) => a - b);
  verificar(`${nome} (veio ${got.join(' e ')})`, got.join() === esperado.join());
}
const payload = () => b64(crypto.randomBytes(128));
const agora = () => Math.floor(Date.now() / 1000);

(async () => {
  console.log('\n== Dois resgates simultâneos com a mesma CCH ==');
  const A = await contaPareada('race-claim');
  const cch = derivarProvaHerdeiro(crypto.randomBytes(16).toString('base64url'), A.id);
  const en = await req('POST', '/inheritance/enable', {
    token: A.hw,
    corpo: { prova_cont_dono_atual: A.prova, prova_cont_herdeiro: cch, version_counter: agora(), payload_cifrado: payload() },
  });
  if (en.status !== 200) throw new Error(`ativar herança falhou (${en.status})`);
  const claim = () => req('POST', '/inheritance/claim', {
    corpo: { conta_id: A.id, prova_cont_herdeiro: cch, public_key: b64(nacl.sign.keyPair().publicKey) },
  });
  par('um vence, o outro é recusado', await Promise.all([claim(), claim()]), [200, 401]);
  const est = (await pool.query('SELECT status, hash_cont_herdeiro AS h FROM contas WHERE id = $1;', [A.id])).rows[0];
  verificar('conta em RECUPERACAO_HARDWARE e CCH consumida', est.status === 'RECUPERACAO_HARDWARE' && est.h === null);
  const rev = await pool.query('SELECT count(*)::int AS n FROM chaves_revogadas WHERE conta_id = $1;', [A.id]);
  verificar('a chave do dono foi arquivada uma única vez', rev.rows[0].n === 1);

  console.log('\n== Dois uploads simultâneos com a mesma versão ==');
  const B = await contaPareada('race-put');
  const b = agora();
  const put = (v) => req('PUT', '/backup', { token: B.hw, corpo: { version_counter: v, payload_cifrado: payload() } });
  verificar('backup inicial', (await put(b)).status === 200);
  par('um vence, o outro leva 409 (anti-rollback)', await Promise.all([put(b + 1), put(b + 1)]), [200, 409]);
  const ver = (await pool.query('SELECT version_counter AS v FROM backups WHERE conta_id = $1;', [B.id])).rows[0].v;
  verificar('banco ficou com a versão vencedora', ver === b + 1);

  console.log('\n== Dois Kill Switches simultâneos ==');
  const C = await contaPareada('race-kill');
  const kill = () => req('POST', '/account/kill-switch', { token: C.admin, corpo: { prova_cont_dono: C.prova } });
  par('um revoga, o outro leva 409', await Promise.all([kill(), kill()]), [200, 409]);
  const revC = await pool.query('SELECT count(*)::int AS n FROM chaves_revogadas WHERE conta_id = $1;', [C.id]);
  verificar('chave arquivada uma única vez', revC.rows[0].n === 1);

  console.log('\n== Duas rotações da CCP simultâneas com a mesma prova atual ==');
  const D = await contaPareada('race-rot');
  const d = agora();
  verificar('backup inicial', (await req('PUT', '/backup', { token: D.hw, corpo: { version_counter: d, payload_cifrado: payload() } })).status === 200);
  const nova = () => derivarProva(crypto.randomBytes(16).toString('base64url'), D.id);
  const [p1, p2, p3] = [nova(), nova(), nova()];
  const rot = (atual, novaProva, v) => req('POST', '/account/rotate-ccp', {
    token: D.hw,
    corpo: { prova_cont_dono_atual: atual, prova_cont_dono_nova: novaProva, version_counter: v, payload_cifrado: payload() },
  });
  const rs = await Promise.all([rot(D.prova, p1, d + 1), rot(D.prova, p2, d + 1)]);
  par('uma vence, a outra leva 409 (chave alterada durante a operação)', rs, [200, 409]);
  const venc = rs[0].status === 200 ? p1 : p2;
  const perd = rs[0].status === 200 ? p2 : p1;
  verificar('a prova que perdeu a corrida não vale', (await rot(perd, p3, d + 2)).status === 401);
  verificar('a prova vencedora vale (nunca ficam duas válidas, nem nenhuma)', (await rot(venc, p3, d + 2)).status === 200);

  await pool.query("DELETE FROM contas WHERE email LIKE '%@race.example.test';");
  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
