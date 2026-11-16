// Testa GET /backup/metadata.
const crypto = require('crypto');
const pool = require('../src/db/connection');
const { req, b64, contaPareada } = require('./lib');

let falhas = 0;
function checar(nome, esperado, r) {
  const ok = r.status === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome} -> esperado ${esperado}, veio ${r.status} ${JSON.stringify(r.body).slice(0, 90)}`);
}
function verificar(nome, cond) {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}`);
}

(async () => {
  const A = await contaPareada('meta');
  const base = Math.floor(Date.now() / 1000);
  const vault = b64(crypto.randomBytes(128));
  const meta = (token) => req('GET', '/backup/metadata', { token });
  const put = (v) => req('PUT', '/backup', { token: A.hw, corpo: { version_counter: v, payload_cifrado: vault } });

  checar('sem token', 401, await meta());
  checar('token admin_web barrado (exige hardware)', 403, await meta(A.admin));
  checar('conta sem backup ainda', 404, await meta(A.hw));
  checar('backup inicial', 200, await put(base));

  const m = await meta(A.hw);
  checar('metadados em ATIVA', 200, m);
  verificar('devolve a versão enviada', m.body.version_counter === base);
  verificar('devolve a data', !!m.body.atualizado_em);
  verificar('não expõe o conteúdo', !('payload_cifrado' in m.body) && !JSON.stringify(m.body).includes(vault.slice(0, 20)));
  checar('GET /backup continua bloqueado em ATIVA (RN04)', 403, await req('GET', '/backup', { token: A.hw }));

  checar('nova versão', 200, await put(base + 1));
  verificar('metadados acompanham a nova versão', (await meta(A.hw)).body.version_counter === base + 1);

  await pool.query("UPDATE contas SET status = 'REVOGADA' WHERE id = $1;", [A.id]);
  checar('conta REVOGADA (forçada no banco)', 403, await meta(A.hw));

  await pool.query("DELETE FROM contas WHERE email LIKE '%@race.example.test';");
  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
