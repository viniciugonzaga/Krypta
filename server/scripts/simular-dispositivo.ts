// server/scripts/simular-dispositivo.ts
// ============================================================
// SIMULADOR DE DISPOSITIVO KRYPTA (ESP32 de mentira, chaves de verdade)
//
// Gera pares de chaves Ed25519 REAIS (tweetnacl), como o ESP32 faria,
// e conversa com a API exatamente como o app vai conversar.
//
// Com o servidor rodando em outro terminal (npm run dev):
//
//   PARTES 1-3
//   npm run sim -- parear <email> <senha>     pareia um dispositivo na conta
//   npm run sim -- login                      login pelo dispositivo
//
//   PARTES 4-6
//   npm run sim -- backup                     envia/consulta backup cifrado
//   npm run sim -- recuperar                  "esqueci a senha mestre"
//   npm run sim -- trocar-ccp                 troca a chave de contingência
//   npm run sim -- heranca                    ativa, desativa e reativa a herança
//   npm run sim -- resgatar                   o HERDEIRO resgata o cofre
//   npm run sim -- kill-switch <email> <senha>  "perdi o dispositivo" + novo dispositivo
//
//   npm run sim -- testar-tudo <email> <senha>  roda TODOS os testes 4-6 em sequência
//
//   npm run sim -- status | esquecer
//
// As chaves ficam em scripts/.sim-keys.json (fora do Git).
// ============================================================
import nacl from 'tweetnacl';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.env.SIM_API ?? 'http://localhost:3333/api';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO = path.join(DIR, '.sim-keys.json');

interface SimKeys {
  email: string;
  contaId: string;
  publicKey: string; // base64 32 bytes
  secretKey: string; // base64 64 bytes (no ESP32 real, NUNCA sai do chip)
  provaContDono: string; // base64 32 bytes (no app real: Argon2id + HKDF da CCP)
  provaHerdeiro?: string; // base64 32 bytes (no app real: derivada da CCH)
}

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const aleatorio32 = () => b64(crypto.randomBytes(32));
/** "vault.enc" de mentira: bytes aleatórios fazem o papel do cofre cifrado */
const payloadFalso = (tamanho = 2048) => b64(crypto.randomBytes(tamanho));

let falhas = 0;
const titulo = (t: string) => console.log(`\n${t}\n`);
const ok = (msg: string) => console.log(`  ✅ ${msg}`);
const info = (msg: string) => console.log(`  ·  ${msg}`);
function falha(msg: string): never {
  console.error(`  ❌ ${msg}`);
  process.exit(1);
}

/** Confere o status HTTP esperado; se não bater, mostra o erro e para */
function esperar(r: { status: number; json: any }, esperado: number, msgOk: string): void {
  if (r.status === esperado) {
    ok(msgOk);
    return;
  }
  falhas++;
  falha(`${msgOk} → esperava ${esperado}, veio ${r.status}: ${r.json?.error ?? JSON.stringify(r.json)}`);
}

async function chamar(
  metodo: string,
  rota: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${API}${rota}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => falha(`Não consegui falar com ${API}. O servidor está rodando (npm run dev)?`));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function lerChaves(): SimKeys {
  if (!fs.existsSync(ARQUIVO)) falha('Nenhum dispositivo simulado. Rode antes: npm run sim -- parear <email> <senha>');
  return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')) as SimKeys;
}

function salvarChaves(k: SimKeys): void {
  fs.writeFileSync(ARQUIVO, JSON.stringify(k, null, 2));
}

/** Login no SITE → token admin_web */
async function loginSite(email: string, senha: string): Promise<string> {
  const r = await chamar('POST', '/auth/login', { email, password: senha });
  if (r.status !== 200) falha(`Login no site falhou (${r.status}): ${r.json.error}`);
  return r.json.data.token as string;
}

/** Login pelo DISPOSITIVO (challenge → assinatura → verify) → token hardware */
async function loginDispositivo(publicKey: string, secretKey: string): Promise<string> {
  const ch = await chamar('POST', '/auth/challenge', { public_key: publicKey });
  if (ch.status !== 200) falha(`Challenge falhou (${ch.status}): ${ch.json.error}`);
  // O ESP32 assina os 32 BYTES do nonce (não a string base64)
  const assinatura = nacl.sign.detached(
    new Uint8Array(Buffer.from(ch.json.data.nonce, 'base64')),
    new Uint8Array(Buffer.from(secretKey, 'base64'))
  );
  const v = await chamar('POST', '/auth/verify', { public_key: publicKey, assinatura: b64(assinatura) });
  if (v.status !== 200) falha(`Verify falhou (${v.status}): ${v.json.error}`);
  return v.json.data.token as string;
}

/** Versão atual do backup (0 se ainda não existe) */
async function versaoAtual(tokenHw: string): Promise<number> {
  const r = await chamar('GET', '/vault/backup/metadata', undefined, tokenHw);
  if (r.status === 404) return 0;
  if (r.status !== 200) falha(`Metadata falhou (${r.status}): ${r.json.error}`);
  return r.json.data.version_counter as number;
}

async function estadoCofre(token: string): Promise<string> {
  const r = await chamar('GET', '/vault/account', undefined, token);
  if (r.status !== 200) falha(`Conta falhou (${r.status}): ${r.json.error}`);
  return r.json.data.status as string;
}

// ============================================================
// PARTES 1-3
// ============================================================
async function parear(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- parear <email> <senha>');
  titulo('🔐 Pareando dispositivo simulado');

  const tokenSite = await loginSite(email, senha);
  ok(`Login no site como ${email}`);

  const par = nacl.sign.keyPair(); // "ESP32" gera as chaves
  const prova = aleatorio32(); // "App" deriva a prova da CCP
  info(`public_key: ${b64(par.publicKey)}`);

  const r = await chamar('POST', '/hardware/pair', { public_key: b64(par.publicKey), prova_cont_dono: prova }, tokenSite);
  if (r.status !== 200) falha(`Pareamento falhou (${r.status}): ${r.json.error}`);
  ok(`Pareado! Estado do cofre: ${r.json.data.status} · ${r.json.data.hardware_uuid}`);

  salvarChaves({
    email,
    contaId: r.json.data.id,
    publicKey: b64(par.publicKey),
    secretKey: b64(par.secretKey),
    provaContDono: prova,
  });
  ok('Chaves salvas em scripts/.sim-keys.json');

  const repetido = await chamar(
    'POST',
    '/hardware/pair',
    { public_key: b64(nacl.sign.keyPair().publicKey), prova_cont_dono: aleatorio32() },
    tokenSite
  );
  esperar(repetido, 409, 'Re-pareamento bloqueado');

  console.log('\n  Próximo passo: npm run sim -- login\n');
}

async function login() {
  const k = lerChaves();
  titulo('🔑 Login pelo dispositivo simulado');

  const ch = await chamar('POST', '/auth/challenge', { public_key: k.publicKey });
  esperar(ch, 200, 'Nonce recebido');
  const assinatura = nacl.sign.detached(
    new Uint8Array(Buffer.from(ch.json.data.nonce, 'base64')),
    new Uint8Array(Buffer.from(k.secretKey, 'base64'))
  );

  const v = await chamar('POST', '/auth/verify', { public_key: k.publicKey, assinatura: b64(assinatura) });
  esperar(v, 200, `Token do dispositivo recebido (expira ${v.json.data?.expira_em})`);
  const token: string = v.json.data.token;

  const replay = await chamar('POST', '/auth/verify', { public_key: k.publicKey, assinatura: b64(assinatura) });
  esperar(replay, 401, 'Replay bloqueado');

  const s = await chamar('GET', '/auth/session', undefined, token);
  esperar(s, 200, `Sessão válida: escopo ${s.json.data?.tipo}`);

  const portal = await chamar('GET', '/users/me', undefined, token);
  esperar(portal, 403, 'Token do dispositivo barrado no portal');

  const conta = await chamar('GET', '/vault/account', undefined, token);
  esperar(conta, 200, `Conta do cofre: ${conta.json.data?.email} · ${conta.json.data?.status}`);

  console.log('\n  Tudo certo com as Partes 1 a 3! 🎉\n');
}

// ============================================================
// PARTE 4 — BACKUP
// ============================================================
async function backup() {
  const k = lerChaves();
  titulo('💾 Parte 4 — Backup cifrado');

  const token = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Login pelo dispositivo');

  const v = await versaoAtual(token);
  info(`Versão atual no servidor: ${v}`);

  const envio = await chamar('PUT', '/vault/backup', { version_counter: v + 1, payload_cifrado: payloadFalso() }, token);
  esperar(envio, 200, `Backup enviado (versão ${v + 1})`);

  const mesmaVersao = await chamar('PUT', '/vault/backup', { version_counter: v + 1, payload_cifrado: payloadFalso() }, token);
  esperar(mesmaVersao, 409, 'Mesma versão recusada (anti-rollback)');

  const versaoVelha = await chamar('PUT', '/vault/backup', { version_counter: Math.max(1, v), payload_cifrado: payloadFalso() }, token);
  esperar(versaoVelha, 409, 'Versão antiga recusada (anti-rollback)');

  const meta = await chamar('GET', '/vault/backup/metadata', undefined, token);
  esperar(meta, 200, `Metadados: versão ${meta.json.data?.version_counter} (sem o conteúdo)`);

  const download = await chamar('GET', '/vault/backup', undefined, token);
  esperar(download, 403, 'Download bloqueado com cofre ATIVO (o ESP32 é a fonte da verdade)');

  const lixo = await chamar('PUT', '/vault/backup', { version_counter: v + 2, payload_cifrado: 'isso não é base64!' }, token);
  esperar(lixo, 400, 'Payload inválido recusado');

  const grande = await chamar('PUT', '/vault/backup', { version_counter: v + 2, payload_cifrado: payloadFalso(1024 * 1024 + 1) }, token);
  esperar(grande, 400, 'Payload acima de 1 MB recusado');

  console.log('\n  Parte 4 OK! 🎉\n');
}

// ============================================================
// PARTE 5 — CONTINGÊNCIA
// ============================================================
async function recuperar() {
  const k = lerChaves();
  titulo('🧩 Parte 5a — "Esqueci a senha mestre" (recuperação local)');

  const token = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Login pelo dispositivo');

  // Garante que existe backup para baixar
  const v = await versaoAtual(token);
  if (v === 0) {
    esperar(await chamar('PUT', '/vault/backup', { version_counter: 1, payload_cifrado: payloadFalso() }, token), 200, 'Backup inicial enviado');
  }

  const provaErrada = await chamar('POST', '/vault/recovery/owner', { prova_cont_dono: aleatorio32() }, token);
  esperar(provaErrada, 401, 'Prova errada recusada');

  const ccpTexto = await chamar('POST', '/vault/recovery/owner', { prova_cont_dono: 'minha-ccp-em-texto-claro' }, token);
  esperar(ccpTexto, 400, 'CCP em texto claro barrada (RN08)');

  const inicio = await chamar('POST', '/vault/recovery/owner', { prova_cont_dono: k.provaContDono }, token);
  esperar(inicio, 200, `Recuperação iniciada → ${inicio.json.data?.status}`);

  const baixar = await chamar('GET', '/vault/backup', undefined, token);
  esperar(baixar, 200, `Backup baixado (versão ${baixar.json.data?.version_counter}) — o app abre o envelope da CCP localmente`);

  const v2 = await versaoAtual(token);
  const regravar = await chamar('PUT', '/vault/backup', { version_counter: v2 + 1, payload_cifrado: payloadFalso() }, token);
  esperar(regravar, 200, `Novo envelope do titular salvo (versão ${v2 + 1})`);

  const fim = await chamar('POST', '/vault/recovery/complete', undefined, token);
  esperar(fim, 200, `Recuperação concluída → ${fim.json.data?.status}`);

  const deNovo = await chamar('POST', '/vault/recovery/complete', undefined, token);
  esperar(deNovo, 409, 'Concluir de novo recusado (não há recuperação aberta)');

  console.log('\n  Recuperação local OK! 🎉\n');
}

async function trocarCcp() {
  const k = lerChaves();
  titulo('🔁 Parte 5b — Troca da chave de contingência (CCP)');

  const token = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Login pelo dispositivo');

  const v = await versaoAtual(token);
  const nova = aleatorio32();

  const errada = await chamar(
    'POST',
    '/vault/rotate-ccp',
    { prova_cont_dono_atual: aleatorio32(), prova_cont_dono_nova: nova, version_counter: v + 1, payload_cifrado: payloadFalso() },
    token
  );
  esperar(errada, 401, 'Prova atual errada recusada (nada mudou)');

  const igual = await chamar(
    'POST',
    '/vault/rotate-ccp',
    { prova_cont_dono_atual: k.provaContDono, prova_cont_dono_nova: k.provaContDono, version_counter: v + 1, payload_cifrado: payloadFalso() },
    token
  );
  esperar(igual, 400, 'Prova nova igual à atual recusada');

  const versaoVelha = await chamar(
    'POST',
    '/vault/rotate-ccp',
    { prova_cont_dono_atual: k.provaContDono, prova_cont_dono_nova: nova, version_counter: Math.max(1, v), payload_cifrado: payloadFalso() },
    token
  );
  esperar(versaoVelha, 409, 'Versão antiga recusada — e a CCP NÃO foi trocada (tudo ou nada)');

  const certa = await chamar(
    'POST',
    '/vault/rotate-ccp',
    { prova_cont_dono_atual: k.provaContDono, prova_cont_dono_nova: nova, version_counter: v + 1, payload_cifrado: payloadFalso() },
    token
  );
  esperar(certa, 200, `CCP trocada junto com o backup (versão ${v + 1})`);

  const provaAntiga = k.provaContDono;
  k.provaContDono = nova;
  salvarChaves(k);
  ok('Nova prova salva no simulador');

  const antiga = await chamar('POST', '/vault/recovery/owner', { prova_cont_dono: provaAntiga }, token);
  esperar(antiga, 401, 'A CCP antiga deixou de valer');

  console.log('\n  Troca da CCP OK! 🎉\n');
}

async function killSwitch(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- kill-switch <email> <senha>');
  const k = lerChaves();
  titulo('🚨 Parte 5c — "Perdi o dispositivo" (Kill Switch + novo dispositivo)');

  const tokenAntigo = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Dispositivo antigo logado (vamos ver esse token morrer)');

  const tokenSite = await loginSite(email, senha);
  ok('Login no site (o dono só tem o login e a CCP)');

  const hwNoSite = await chamar('POST', '/vault/kill-switch', { prova_cont_dono: k.provaContDono }, tokenAntigo);
  esperar(hwNoSite, 403, 'Kill Switch exige o token do SITE (o dispositivo pode estar perdido)');

  const errada = await chamar('POST', '/vault/kill-switch', { prova_cont_dono: aleatorio32() }, tokenSite);
  esperar(errada, 401, 'Prova errada recusada');

  const kill = await chamar('POST', '/vault/kill-switch', { prova_cont_dono: k.provaContDono }, tokenSite);
  esperar(kill, 200, `Kill Switch acionado → ${kill.json.data?.status}`);

  const morto = await chamar('GET', '/auth/session', undefined, tokenAntigo);
  esperar(morto, 401, 'Token do dispositivo antigo morreu NA HORA');

  const chAntigo = await chamar('POST', '/auth/challenge', { public_key: k.publicKey });
  esperar(chAntigo, 404, 'Dispositivo antigo não consegue mais logar');

  const reusar = await chamar('POST', '/vault/recovery/hardware', { public_key: k.publicKey, prova_cont_dono: k.provaContDono }, tokenSite);
  esperar(reusar, 409, 'Chave revogada não pode ser vinculada de novo (banida para sempre)');

  const novo = nacl.sign.keyPair();
  const vincular = await chamar(
    'POST',
    '/vault/recovery/hardware',
    { public_key: b64(novo.publicKey), prova_cont_dono: k.provaContDono },
    tokenSite
  );
  esperar(vincular, 200, `Novo dispositivo vinculado → ${vincular.json.data?.status}`);

  k.publicKey = b64(novo.publicKey);
  k.secretKey = b64(novo.secretKey);
  salvarChaves(k);
  ok('Chaves do novo dispositivo salvas no simulador');

  const tokenNovo = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Novo dispositivo logado');

  const baixar = await chamar('GET', '/vault/backup', undefined, tokenNovo);
  esperar(baixar, 200, 'Backup baixado no novo dispositivo');

  const subir = await chamar('PUT', '/vault/backup', { version_counter: (await versaoAtual(tokenNovo)) + 1, payload_cifrado: payloadFalso() }, tokenNovo);
  esperar(subir, 403, 'Envio bloqueado até concluir a recuperação');

  const fim = await chamar('POST', '/vault/recovery/complete', undefined, tokenNovo);
  esperar(fim, 200, `Recuperação concluída → ${fim.json.data?.status}`);

  const subirDepois = await chamar('PUT', '/vault/backup', { version_counter: (await versaoAtual(tokenNovo)) + 1, payload_cifrado: payloadFalso() }, tokenNovo);
  esperar(subirDepois, 200, 'Envio de backup liberado de novo');

  console.log('\n  Kill Switch e recuperação de hardware OK! 🎉\n');
}

// ============================================================
// PARTE 6 — HERANÇA
// ============================================================
async function heranca() {
  const k = lerChaves();
  titulo('🧬 Parte 6a — Ativar / desativar a herança digital');

  const token = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Login pelo dispositivo');

  let v = await versaoAtual(token);
  const provaHerdeiro = aleatorio32();

  const errada = await chamar(
    'POST',
    '/vault/inheritance/enable',
    { prova_cont_dono_atual: aleatorio32(), prova_cont_herdeiro: provaHerdeiro, version_counter: v + 1, payload_cifrado: payloadFalso() },
    token
  );
  esperar(errada, 401, 'Prova do dono errada recusada');

  const ativar = await chamar(
    'POST',
    '/vault/inheritance/enable',
    { prova_cont_dono_atual: k.provaContDono, prova_cont_herdeiro: provaHerdeiro, version_counter: ++v, payload_cifrado: payloadFalso() },
    token
  );
  esperar(ativar, 200, `Herança ativada (versão ${v})`);

  const desativar = await chamar(
    'POST',
    '/vault/inheritance/disable',
    { prova_cont_dono_atual: k.provaContDono, version_counter: ++v, payload_cifrado: payloadFalso() },
    token
  );
  esperar(desativar, 200, `Herança desativada (versão ${v})`);

  const resgateSemHeranca = await chamar('POST', '/vault/inheritance/claim', {
    conta_id: k.contaId,
    prova_cont_herdeiro: provaHerdeiro,
    public_key: b64(nacl.sign.keyPair().publicKey),
  });
  esperar(resgateSemHeranca, 401, 'Resgate com herança desativada recusado');

  const reativar = await chamar(
    'POST',
    '/vault/inheritance/enable',
    { prova_cont_dono_atual: k.provaContDono, prova_cont_herdeiro: provaHerdeiro, version_counter: ++v, payload_cifrado: payloadFalso() },
    token
  );
  esperar(reativar, 200, `Herança reativada (versão ${v}) — pronta para o resgate`);

  k.provaHerdeiro = provaHerdeiro;
  salvarChaves(k);
  ok('Kit do herdeiro (conta_id + prova da CCH) salvo no simulador');

  console.log('\n  Herança OK! Próximo: npm run sim -- resgatar\n');
}

async function resgatar() {
  const k = lerChaves();
  if (!k.provaHerdeiro) falha('Ative a herança antes: npm run sim -- heranca');
  titulo('🗝️  Parte 6b — O HERDEIRO resgata o cofre');

  const tokenDono = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Dispositivo do dono logado (vamos ver esse token morrer)');

  const herdeiro = nacl.sign.keyPair(); // dispositivo NOVO do herdeiro

  const errada = await chamar('POST', '/vault/inheritance/claim', {
    conta_id: k.contaId,
    prova_cont_herdeiro: aleatorio32(),
    public_key: b64(herdeiro.publicKey),
  });
  esperar(errada, 401, 'CCH errada recusada (mesma mensagem genérica)');

  const contaFalsa = await chamar('POST', '/vault/inheritance/claim', {
    conta_id: crypto.randomUUID(),
    prova_cont_herdeiro: k.provaHerdeiro,
    public_key: b64(herdeiro.publicKey),
  });
  esperar(contaFalsa, 401, 'Conta inexistente recusada (mesma mensagem: não revela quem existe)');

  const resgate = await chamar('POST', '/vault/inheritance/claim', {
    conta_id: k.contaId,
    prova_cont_herdeiro: k.provaHerdeiro,
    public_key: b64(herdeiro.publicKey),
  });
  esperar(resgate, 200, `Resgate feito → ${resgate.json.data?.status} (sem e-mail do dono na resposta)`);

  const reuso = await chamar('POST', '/vault/inheritance/claim', {
    conta_id: k.contaId,
    prova_cont_herdeiro: k.provaHerdeiro,
    public_key: b64(nacl.sign.keyPair().publicKey),
  });
  esperar(reuso, 401, 'A CCH é de uso único: segundo resgate recusado');

  const morto = await chamar('GET', '/auth/session', undefined, tokenDono);
  esperar(morto, 401, 'Token do dispositivo do dono morreu na hora');

  // A partir daqui o dispositivo do herdeiro opera a conta
  k.publicKey = b64(herdeiro.publicKey);
  k.secretKey = b64(herdeiro.secretKey);
  delete k.provaHerdeiro;
  salvarChaves(k);

  const tokenHerdeiro = await loginDispositivo(k.publicKey, k.secretKey);
  ok('Dispositivo do herdeiro logado');

  const baixar = await chamar('GET', '/vault/backup', undefined, tokenHerdeiro);
  esperar(baixar, 200, 'Herdeiro baixou o backup (abre o Envelope do Herdeiro localmente)');

  const fim = await chamar('POST', '/vault/recovery/complete', undefined, tokenHerdeiro);
  esperar(fim, 200, `Recuperação concluída → ${fim.json.data?.status}`);

  console.log('\n  Resgate de herança OK! 🎉');
  info('O simulador agora usa o dispositivo do herdeiro.');
  info('Para o DONO retomar a conta: npm run sim -- kill-switch <email> <senha>\n');
}

// ============================================================
// TUDO EM SEQUÊNCIA
// ============================================================
async function testarTudo(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- testar-tudo <email> <senha>');
  const k = lerChaves();
  const token = await loginDispositivo(k.publicKey, k.secretKey);
  const estado = await estadoCofre(token);
  if (estado !== 'ATIVA') falha(`O cofre precisa estar ATIVO para começar (está ${estado}).`);

  await backup();
  await recuperar();
  await trocarCcp();
  await heranca();
  await resgatar();
  await killSwitch(email, senha); // o dono retoma a conta depois do resgate
  console.log(falhas === 0 ? '\n🏁 PARTES 4, 5 e 6 — TODOS OS TESTES PASSARAM! 🎉\n' : `\n⚠️  ${falhas} falha(s)\n`);
}

async function status() {
  const k = lerChaves();
  console.log(`\n  Dispositivo simulado da conta ${k.email}`);
  console.log(`  contaId:    ${k.contaId}`);
  console.log(`  public_key: ${k.publicKey}`);
  console.log(`  herança:    ${k.provaHerdeiro ? 'kit do herdeiro guardado' : '—'}\n`);
}

function esquecer() {
  if (fs.existsSync(ARQUIVO)) fs.unlinkSync(ARQUIVO);
  ok('Chaves locais do simulador apagadas (a conta continua pareada no banco).');
}

// ------------------------------------------------------------
const [, , comando, ...args] = process.argv;
const comandos: Record<string, () => Promise<void> | void> = {
  parear: () => parear(args[0], args[1]),
  login,
  backup,
  recuperar,
  'trocar-ccp': trocarCcp,
  heranca,
  resgatar,
  'kill-switch': () => killSwitch(args[0], args[1]),
  'testar-tudo': () => testarTudo(args[0], args[1]),
  status,
  esquecer,
};

if (!comando || !comandos[comando]) {
  console.log(
    'Uso: npm run sim -- <parear email senha | login | backup | recuperar | trocar-ccp | heranca | resgatar | kill-switch email senha | testar-tudo email senha | status | esquecer>'
  );
  process.exit(1);
}
Promise.resolve(comandos[comando]()).catch((e) => falha(String(e)));
