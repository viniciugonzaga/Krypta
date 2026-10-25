// Testa o login administrativo. Requer: simulate-hardware.js setup já executado.
const keys = require('./.sim-keys.json');
const BASE = process.env.API_URL || 'http://localhost:3000';

async function req(metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

let falhas = 0;
function checar(nome, ok, detalhe = '') {
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome} ${detalhe}`);
}

(async () => {
  const certo = await req('POST', '/auth/admin-login', { corpo: { email: keys.email, senha_administrativa: 'senha12345' } });
  checar('login correto', certo.status === 200 && !!certo.body.token, `(status ${certo.status})`);

  if (certo.body.token) {
    const payload = JSON.parse(Buffer.from(certo.body.token.split('.')[1], 'base64url').toString());
    checar('payload com tipo admin_web', payload.tipo === 'admin_web', JSON.stringify(payload));

    const sessao = await req('GET', '/auth/session', { token: certo.body.token });
    checar('token admin_web barrado na rota do cofre (403)', sessao.status === 403, `(status ${sessao.status})`);
  }

  const errada = await req('POST', '/auth/admin-login', { corpo: { email: keys.email, senha_administrativa: 'senhaerrada1' } });
  checar('senha errada (401)', errada.status === 401, `(status ${errada.status})`);

  const inexistente = await req('POST', '/auth/admin-login', { corpo: { email: 'nao-existe@krypta.dev', senha_administrativa: 'senha12345' } });
  checar('email inexistente (401)', inexistente.status === 401, `(status ${inexistente.status})`);
  checar('mesma mensagem nos dois casos (sem enumeração de emails)',
    JSON.stringify(errada.body) === JSON.stringify(inexistente.body));

  const vazio = await req('POST', '/auth/admin-login', { corpo: { email: keys.email } });
  checar('sem senha (400)', vazio.status === 400, `(status ${vazio.status})`);

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
