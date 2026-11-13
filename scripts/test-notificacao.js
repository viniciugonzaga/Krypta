// Testa as notificações por email com transporte FALSO: nenhum email real é enviado.
// Para validar a entrega real, veja "Teste com SMTP real" no README.
const nacl = require('tweetnacl');
const crypto = require('crypto');
const pool = require('../src/db/connection');
const notificacao = require('../src/services/notificacaoService');
const ttlService = require('../src/services/ttlService');
const contingenciaService = require('../src/services/contingenciaService');
const herancaService = require('../src/services/herancaService');
const { derivarProva, derivarProvaHerdeiro } = require('./ccp');

const BASE = process.env.API_URL || 'http://localhost:3000';
const SENHA = 'senha12345';
const SUFIXO = '@notif.example.test';
const b64 = (buf) => Buffer.from(buf).toString('base64');
const u8 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const emailUnico = (p) => `${p}-${Date.now()}-${n++}${SUFIXO}`;

let falhas = 0;
function verificar(nome, cond) {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}`);
}

const captura = () => ({ enviados: [], async sendMail(m) { this.enviados.push(m); return {}; } });
const falho = () => ({ async sendMail() { throw new Error('SMTP fora do ar'); } });

async function req(metodo, rota, { corpo, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function loginHardware(par) {
  const publicKey = b64(par.publicKey);
  const ch = await req('POST', '/auth/challenge', { corpo: { public_key: publicKey } });
  const assinatura = b64(nacl.sign.detached(u8(ch.body.nonce), par.secretKey));
  return (await req('POST', '/auth/verify', { corpo: { public_key: publicKey, assinatura } })).body.token;
}

async function criarContaPareada(prefixo) {
  const email = emailUnico(prefixo);
  const c = await req('POST', '/accounts', { corpo: { email, senha_administrativa: SENHA } });
  const admin = (await req('POST', '/auth/admin-login', { corpo: { email, senha_administrativa: SENHA } })).body.token;
  const par = nacl.sign.keyPair();
  const prova = derivarProva(crypto.randomBytes(16).toString('base64url'), c.body.id);
  const p = await req('POST', '/hardware/pair', {
    token: admin,
    corpo: { public_key: b64(par.publicKey), prova_cont_dono: prova },
  });
  if (p.status !== 200) throw new Error(`pareamento falhou (${p.status})`);
  return { id: c.body.id, email, par, prova };
}

async function criarContaComHeranca(prefixo) {
  const A = await criarContaPareada(prefixo);
  const hw = await loginHardware(A.par);
  const cch = derivarProvaHerdeiro(crypto.randomBytes(16).toString('base64url'), A.id);
  const r = await req('POST', '/inheritance/enable', {
    token: hw,
    corpo: {
      prova_cont_dono_atual: A.prova,
      prova_cont_herdeiro: cch,
      version_counter: 1,
      payload_cifrado: b64(crypto.randomBytes(256)),
    },
  });
  if (r.status !== 200) throw new Error(`ativar herança falhou (${r.status})`);
  return { ...A, cch };
}

(async () => {
  const dono = `dono${SUFIXO}`;
  const d30 = { contaId: 'x', email: dono, nivel: 'D30', diasRestantes: 30 };
  const h48 = { contaId: 'x', email: dono, nivel: 'H48', diasRestantes: 2 };

  console.log('\n== Conteúdo dos avisos de inatividade ==');
  const cap = captura();
  notificacao._definirTransporte(cap);
  verificar('D30 envia e confirma', (await notificacao.enviarAvisoInatividade(d30)) === true);
  await notificacao.enviarAvisoInatividade(h48);
  verificar('destinatário correto', cap.enviados[0].to === dono);
  verificar('D30 informa os dias', /30 dias/.test(cap.enviados[0].text));
  verificar('H48 informa o prazo de 48 horas', /48 horas/.test(cap.enviados[1].text));
  verificar('explica como renovar (login por hardware)', /faça login/i.test(cap.enviados[0].text));

  console.log('\n== Sem SMTP, lista de liberados e SMTP fora do ar ==');
  notificacao._definirTransporte(null);
  verificar('sem transporte: devolve false', (await notificacao.enviarAvisoInatividade(d30)) === false);

  const capL = captura();
  notificacao._definirTransporte(capL, undefined, [dono]);
  verificar('destinatário liberado recebe', (await notificacao.enviarAvisoInatividade(d30)) === true && capL.enviados.length === 1);
  verificar(
    'destinatário fora da lista não recebe',
    (await notificacao.enviarAvisoInatividade({ ...d30, email: `outro${SUFIXO}` })) === false && capL.enviados.length === 1
  );

  notificacao._definirTransporte(falho());
  let lancou = false;
  try { await notificacao.enviarAvisoInatividade(d30); } catch (e) { lancou = true; }
  verificar('aviso de inatividade propaga a falha (o TTL trata e não registra)', lancou);
  let naoLancou = true;
  try { await notificacao.notificarKillSwitch(dono); } catch (e) { naoLancou = false; }
  verificar('aviso de segurança nunca lança', naoLancou);

  console.log('\n== TTL de ponta a ponta com o notificador real ==');
  const capT = captura();
  notificacao._definirTransporte(capT);
  const emailTtl = emailUnico('ttl');
  const id = (await pool.query(
    `INSERT INTO contas (email, senha_admin_hash, ultimo_sincronismo)
     VALUES ($1, 'x', CURRENT_TIMESTAMP - make_interval(days => 400)) RETURNING id;`,
    [emailTtl]
  )).rows[0].id;
  const paraEla = () => capT.enviados.filter((m) => m.to === emailTtl);

  await ttlService.executarVarredura(); // notificador padrão = notificacaoService
  verificar('varredura envia o aviso H48 pelo notificador real', paraEla().length === 1 && /48 horas/.test(paraEla()[0].text));
  const av = await pool.query('SELECT nivel FROM avisos_ttl WHERE conta_id = $1;', [id]);
  verificar('aviso registrado depois do envio confirmado', av.rowCount === 1 && av.rows[0].nivel === 'H48');
  await ttlService.executarVarredura();
  verificar('segunda varredura não reenvia', paraEla().length === 1);
  verificar('ainda não excluída (faltam 48h do aviso)', (await pool.query('SELECT 1 FROM contas WHERE id = $1;', [id])).rowCount === 1);
  await pool.query("UPDATE avisos_ttl SET enviado_em = CURRENT_TIMESTAMP - INTERVAL '49 hours' WHERE conta_id = $1;", [id]);
  await ttlService.executarVarredura();
  verificar('aviso de 48h cumprido: conta excluída', (await pool.query('SELECT 1 FROM contas WHERE id = $1;', [id])).rowCount === 0);

  console.log('\n== Kill Switch avisa o dono ==');
  const K = await criarContaPareada('ntf-k');
  const capK = captura();
  notificacao._definirTransporte(capK);
  await contingenciaService.acionarKillSwitch({ contaId: K.id, provaContDono: K.prova });
  await espera(300);
  const emK = capK.enviados.filter((m) => m.to === K.email);
  verificar('um email para o dono', emK.length === 1);
  verificar('assunto fala em revogação', emK.length === 1 && /revogad/i.test(emK[0].subject));

  console.log('\n== Resgate de herança avisa o dono ==');
  const H = await criarContaComHeranca('ntf-h');
  const capH = captura();
  notificacao._definirTransporte(capH);
  const r = await herancaService.resgatar({ contaId: H.id, provaHerdeiro: H.cch, publicKey: b64(nacl.sign.keyPair().publicKey) });
  await espera(300);
  const emH = capH.enviados.filter((m) => m.to === H.email);
  verificar('resgate concluído', r.status === 'RECUPERACAO_HARDWARE');
  verificar('um email para o dono', emH.length === 1);
  verificar('email não contém a CCH', emH.length === 1 && !emH[0].text.includes(H.cch));

  const H2 = await criarContaComHeranca('ntf-h2');
  notificacao._definirTransporte(falho());
  const r2 = await herancaService.resgatar({ contaId: H2.id, provaHerdeiro: H2.cch, publicKey: b64(nacl.sign.keyPair().publicKey) });
  await espera(300);
  verificar('SMTP fora do ar não derruba o resgate', r2.status === 'RECUPERACAO_HARDWARE');

  await pool.query("DELETE FROM contas WHERE email LIKE '%@notif.example.test';");

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} caso(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
