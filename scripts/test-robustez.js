// Pepper (RNF02), tokens inválidos e falhas de banco. Sobe a API em memória (porta aleatória):
// não depende do servidor em execução.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { JWT_SECRET } = require('../src/config/env');
const pool = require('../src/db/connection');
const pepper = require('../src/utils/bcryptPepper');
const app = require('../src/app');

let falhas = 0;
function verificar(nome, cond, extra = '') {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome} ${extra}`);
}

async function chamar(base, metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  console.log('\n== Pepper (RNF02) ==');
  const h = await pepper.hash('segredo-de-teste', 4);
  verificar('hash tem formato bcrypt', h.startsWith('$2'));
  verificar('mesmo valor confere', await pepper.compare('segredo-de-teste', h));
  verificar('valor errado não confere', !(await pepper.compare('outro-segredo', h)));
  verificar('bcrypt puro NÃO confere o hash com pepper (dump do banco sozinho não basta)',
    !(await bcrypt.compare('segredo-de-teste', h)));
  const longo = 'a'.repeat(80);
  const hl = await pepper.hash(longo + '1', 4);
  verificar('valores longos que só diferem após 72 bytes não colidem', !(await pepper.compare(longo + '2', hl)));
  verificar('hashSync compatível com compare', await pepper.compare('sincrono', pepper.hashSync('sincrono', 4)));

  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const id = crypto.randomUUID();
  const pk = Buffer.alloc(32, 7).toString('base64');
  const payload = { contaId: id, publicKey: pk, tipo: 'hardware' };
  const agora = () => Math.floor(Date.now() / 1000);

  console.log('\n== Tokens inválidos (todos 401) ==');
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const tokens = [
    ['token expirado', jwt.sign({ ...payload, exp: agora() - 60 }, JWT_SECRET, { algorithm: 'HS256' })],
    ['assinado com outro segredo', jwt.sign(payload, 'x'.repeat(64), { algorithm: 'HS256', expiresIn: '5m' })],
    ['algoritmo não permitido (HS512, mesmo segredo)', jwt.sign(payload, JWT_SECRET, { algorithm: 'HS512', expiresIn: '5m' })],
    ['alg none, sem assinatura', `${b({ alg: 'none', typ: 'JWT' })}.${b({ ...payload, exp: agora() + 300 })}.`],
    ['lixo no lugar do token', 'isso.nao.eh-um-jwt'],
    ['token válido de conta inexistente', jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' })],
  ];
  for (const [nome, token] of tokens) {
    const r = await chamar(base, 'GET', '/auth/session', { token });
    verificar(nome, r.status === 401, `(status ${r.status})`);
  }

  console.log('\n== Falhas de banco: 500 genérico, sem vazar detalhes ==');
  const adminTk = jwt.sign({ contaId: id, tipo: 'admin_web' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  const hwTk = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
  const erroBanco = () => {
    const e = new Error('connect ECONNREFUSED 10.0.0.5:5432 password=SEGREDO');
    e.code = 'ECONNREFUSED';
    return e;
  };
  const casos = [
    ['POST /accounts', 'POST', '/accounts', { corpo: { email: 'x@y.com', senha_administrativa: 'senha12345' } }],
    ['POST /auth/admin-login', 'POST', '/auth/admin-login', { corpo: { email: 'x@y.com', senha_administrativa: 'senha12345' } }],
    ['POST /auth/challenge', 'POST', '/auth/challenge', { corpo: { public_key: pk } }],
    ['GET /accounts/:id', 'GET', `/accounts/${id}`, { token: adminTk }],
    ['PUT /backup (valida a sessão no banco)', 'PUT', '/backup', { token: hwTk, corpo: { version_counter: 1, payload_cifrado: 'AAAA' } }],
    ['POST /inheritance/claim', 'POST', '/inheritance/claim', { corpo: { conta_id: id, prova_cont_herdeiro: pk, public_key: pk } }],
  ];

  const queryOriginal = pool.query;
  const connectOriginal = pool.connect;
  const logOriginal = console.error;
  pool.query = async () => { throw erroBanco(); };
  pool.connect = async () => { throw erroBanco(); };
  console.error = () => {}; // o servidor loga o erro real; aqui só o corpo da resposta importa
  const resultados = [];
  for (const [nome, metodo, rota, opts] of casos) resultados.push([nome, await chamar(base, metodo, rota, opts)]);
  pool.query = queryOriginal;
  pool.connect = connectOriginal;
  console.error = logOriginal;

  for (const [nome, r] of resultados) {
    verificar(`${nome}: 500 com mensagem genérica`, r.status === 500 && r.body.erro === 'Erro interno no servidor.', `(status ${r.status})`);
    verificar(`${nome}: sem vazar detalhes do banco`, !/SEGREDO|ECONNREFUSED|10\.0\.0\.5|stack|\sat\s/.test(JSON.stringify(r.body)));
  }

  server.close();
  await pool.end().catch(() => {});
  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
