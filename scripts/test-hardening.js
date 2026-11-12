// Testa headers de segurança e CORS. Requer o servidor rodando com o .env atual.
require('../src/config/env'); // carrega o .env (CORS_ORIGINS)

const BASE = process.env.API_URL || 'http://localhost:3000';
let falhas = 0;
function verificar(nome, cond, detalhe = '') {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome} ${detalhe}`);
}

async function chamar(metodo, rota, headers = {}) {
  const res = await fetch(BASE + rota, { method: metodo, headers });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => ({})) };
}

(async () => {
  console.log('\n== Headers de segurança ==');
  const h = await chamar('GET', '/health');
  verificar('/health continua respondendo 200', h.status === 200, `(status ${h.status})`);
  verificar('X-Powered-By removido', h.headers.get('x-powered-by') === null);
  verificar('X-Content-Type-Options: nosniff', h.headers.get('x-content-type-options') === 'nosniff');
  verificar('X-Frame-Options presente', !!h.headers.get('x-frame-options'));
  verificar('Strict-Transport-Security presente', !!h.headers.get('strict-transport-security'));
  const nf = await chamar('GET', '/rota-que-nao-existe');
  verificar('404 continua em JSON', nf.status === 404 && nf.body.erro === 'Rota não encontrada.');

  console.log('\n== CORS ==');
  const estranha = 'https://site-estranho.example';
  const g = await chamar('GET', '/health', { Origin: estranha });
  verificar('origem fora da lista não recebe Access-Control-Allow-Origin', g.headers.get('access-control-allow-origin') === null);
  const p = await chamar('OPTIONS', '/backup', {
    Origin: estranha,
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'authorization,content-type',
  });
  verificar('preflight de origem fora da lista não é liberado', p.headers.get('access-control-allow-origin') === null);

  const lista = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  if (lista.length === 0) {
    console.log('PULADO CORS_ORIGINS vazio: nenhuma origem de navegador liberada (comportamento esperado)');
  } else {
    const ok = await chamar('GET', '/health', { Origin: lista[0] });
    verificar(`origem ${lista[0]} liberada`, ok.headers.get('access-control-allow-origin') === lista[0]);
    const pre = await chamar('OPTIONS', '/backup', {
      Origin: lista[0],
      'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'authorization,content-type',
    });
    verificar(
      'preflight da origem liberada permite PUT',
      pre.headers.get('access-control-allow-origin') === lista[0] &&
        (pre.headers.get('access-control-allow-methods') || '').includes('PUT'),
      `(status ${pre.status})`
    );
  }

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
