// server/scripts/simular-dispositivo.ts
// ============================================================
// SIMULADOR DE DISPOSITIVO KRYPTA (ESP32 de mentira, chaves de verdade)
//
// Gera um par de chaves Ed25519 REAL (tweetnacl), como o ESP32 faria,
// e conversa com a API exatamente como o app vai conversar.
// Serve para testar tudo SEM o hardware.
//
// Uso (com o servidor rodando em outro terminal: npm run dev):
//   npm run sim -- parear seu@email.com SuaSenhaDoSite
//   npm run sim -- login
//   npm run sim -- status
//   npm run sim -- esquecer        (apaga as chaves de teste locais)
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
  provaContDono: string; // base64 32 bytes (no app real, derivada da CCP com Argon2id)
}

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const ok = (msg: string) => console.log(`  ✅ ${msg}`);
const info = (msg: string) => console.log(`  ·  ${msg}`);
function falha(msg: string): never {
  console.error(`  ❌ ${msg}`);
  process.exit(1);
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

// ------------------------------------------------------------
// PAREAR: login no site → gera chaves → POST /hardware/pair
// ------------------------------------------------------------
async function parear(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- parear <email> <senha>');
  console.log('\n🔐 Pareando dispositivo simulado\n');

  const login = await chamar('POST', '/auth/login', { email, password: senha });
  if (login.status !== 200) falha(`Login no site falhou (${login.status}): ${login.json.error}`);
  const tokenSite: string = login.json.data.token;
  ok(`Login no site como ${email}`);

  // "ESP32" gera o par de chaves
  const par = nacl.sign.keyPair();
  // "App" gera a prova da CCP (no app real: Argon2id + HKDF a partir da CCP)
  const prova = crypto.randomBytes(32);
  info(`public_key: ${b64(par.publicKey)}`);

  const r = await chamar(
    'POST',
    '/hardware/pair',
    { public_key: b64(par.publicKey), prova_cont_dono: b64(prova) },
    tokenSite
  );
  if (r.status !== 200) falha(`Pareamento falhou (${r.status}): ${r.json.error}`);
  ok(`Pareado! Estado do cofre: ${r.json.data.status} · ${r.json.data.hardware_uuid}`);

  const chaves: SimKeys = {
    email,
    contaId: r.json.data.id,
    publicKey: b64(par.publicKey),
    secretKey: b64(par.secretKey),
    provaContDono: b64(prova),
  };
  fs.writeFileSync(ARQUIVO, JSON.stringify(chaves, null, 2));
  ok(`Chaves salvas em scripts/.sim-keys.json`);

  // Segundo pareamento tem que falhar (409)
  const repetido = await chamar(
    'POST',
    '/hardware/pair',
    { public_key: b64(nacl.sign.keyPair().publicKey), prova_cont_dono: b64(crypto.randomBytes(32)) },
    tokenSite
  );
  if (repetido.status === 409) ok('Re-pareamento bloqueado corretamente (409)');
  else falha(`Esperava 409 no re-pareamento e veio ${repetido.status}`);

  console.log('\n  Próximo passo: npm run sim -- login\n');
}

// ------------------------------------------------------------
// LOGIN: challenge → assina os BYTES do nonce → verify → session
// ------------------------------------------------------------
async function login() {
  const k = lerChaves();
  console.log('\n🔑 Login pelo dispositivo simulado\n');

  const ch = await chamar('POST', '/auth/challenge', { public_key: k.publicKey });
  if (ch.status !== 200) falha(`Challenge falhou (${ch.status}): ${ch.json.error}`);
  const nonce: string = ch.json.data.nonce;
  ok('Nonce recebido');

  // O ESP32 assina os 32 BYTES do nonce (não a string base64)
  const assinatura = nacl.sign.detached(
    new Uint8Array(Buffer.from(nonce, 'base64')),
    new Uint8Array(Buffer.from(k.secretKey, 'base64'))
  );

  const v = await chamar('POST', '/auth/verify', { public_key: k.publicKey, assinatura: b64(assinatura) });
  if (v.status !== 200) falha(`Verify falhou (${v.status}): ${v.json.error}`);
  const token: string = v.json.data.token;
  ok(`Token do dispositivo recebido (expira ${v.json.data.expira_em})`);

  // Replay: reenviar a mesma assinatura tem que falhar (nonce é de uso único)
  const replay = await chamar('POST', '/auth/verify', { public_key: k.publicKey, assinatura: b64(assinatura) });
  if (replay.status === 401) ok('Replay bloqueado corretamente (401)');
  else falha(`Esperava 401 no replay e veio ${replay.status}`);

  const s = await chamar('GET', '/auth/session', undefined, token);
  if (s.status !== 200) falha(`Session falhou (${s.status}): ${s.json.error}`);
  ok(`Sessão válida: escopo ${s.json.data.tipo}`);

  // Token do dispositivo NÃO pode abrir o portal
  const portal = await chamar('GET', '/users/me', undefined, token);
  if (portal.status === 403) ok('Token do dispositivo barrado no portal (403)');
  else falha(`Esperava 403 no portal e veio ${portal.status}`);

  const conta = await chamar('GET', '/vault/account', undefined, token);
  if (conta.status !== 200) falha(`Conta falhou (${conta.status}): ${conta.json.error}`);
  ok(`Conta do cofre: ${conta.json.data.email} · ${conta.json.data.status}`);

  console.log('\n  Tudo certo com as Partes 1 a 3! 🎉\n');
}

async function status() {
  const k = lerChaves();
  console.log(`\n  Dispositivo simulado da conta ${k.email}`);
  console.log(`  contaId:    ${k.contaId}`);
  console.log(`  public_key: ${k.publicKey}\n`);
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
  status,
  esquecer,
};

if (!comando || !comandos[comando]) {
  console.log('Uso: npm run sim -- <parear email senha | login | status | esquecer>');
  process.exit(1);
}
Promise.resolve(comandos[comando]()).catch((e) => falha(String(e)));
