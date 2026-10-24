// Simula o ESP32 (par Ed25519 real). Uso:
//   node scripts/simulate-hardware.js <setup|login|replay|tamper>
const nacl = require('tweetnacl');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const KEYS_FILE = path.join(__dirname, '.sim-keys.json');

const b64 = (u8) => Buffer.from(u8).toString('base64');
const fromB64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function post(rota, corpo) {
  const res = await fetch(`${BASE_URL}${rota}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function mostrar(titulo, r) {
  console.log(`\n${titulo}\n  status: ${r.status}\n  body:   ${JSON.stringify(r.body)}`);
}

function carregarChaves() {
  if (!fs.existsSync(KEYS_FILE)) {
    console.error('Rode "setup" primeiro.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
}

// O hardware assina os BYTES do nonce (base64 decodificado).
const assinar = (nonce, secretKeyB64) =>
  b64(nacl.sign.detached(fromB64(nonce), fromB64(secretKeyB64)));

async function setup() {
  const par = nacl.sign.keyPair();
  const email = `sim-${Date.now()}@krypta.dev`;

  const conta = await post('/accounts', { email, senha_administrativa: 'senha12345' });
  mostrar('POST /accounts', conta);
  if (conta.status !== 201) process.exit(1);

  const publicKey = b64(par.publicKey);
  const pair = await post('/hardware/pair', {
    conta_id: conta.body.id,
    public_key: publicKey,
    hash_cont_dono: '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$simulado',
  });
  mostrar('POST /hardware/pair', pair);
  if (pair.status !== 200) process.exit(1);

  fs.writeFileSync(
    KEYS_FILE,
    JSON.stringify({ contaId: conta.body.id, email, publicKey, secretKey: b64(par.secretKey) }, null, 2)
  );
  console.log('\nChaves salvas em scripts/.sim-keys.json (simula a flash do ESP32).');
}

async function login() {
  const k = carregarChaves();
  const ch = await post('/auth/challenge', { public_key: k.publicKey });
  mostrar('POST /auth/challenge', ch);
  if (ch.status !== 200) process.exit(1);

  const v = await post('/auth/verify', {
    public_key: k.publicKey,
    assinatura: assinar(ch.body.nonce, k.secretKey),
  });
  mostrar('POST /auth/verify', v);

  if (v.body.token) {
    const payload = JSON.parse(Buffer.from(v.body.token.split('.')[1], 'base64url').toString());
    console.log('\nPayload do JWT:', payload);
  }
}

// Reenvia a mesma assinatura duas vezes: a segunda precisa falhar (nonce de uso único).
async function replay() {
  const k = carregarChaves();
  const ch = await post('/auth/challenge', { public_key: k.publicKey });
  const corpo = { public_key: k.publicKey, assinatura: assinar(ch.body.nonce, k.secretKey) };

  mostrar('1ª tentativa (esperado 200)', await post('/auth/verify', corpo));
  mostrar('2ª tentativa, mesmo nonce (esperado 401)', await post('/auth/verify', corpo));
}

// Assina com uma chave diferente da cadastrada: precisa falhar.
async function tamper() {
  const k = carregarChaves();
  const impostor = nacl.sign.keyPair();
  const ch = await post('/auth/challenge', { public_key: k.publicKey });

  const v = await post('/auth/verify', {
    public_key: k.publicKey,
    assinatura: assinar(ch.body.nonce, b64(impostor.secretKey)),
  });
  mostrar('Assinatura de outra chave (esperado 401)', v);
}

const comandos = { setup, login, replay, tamper };
const cmd = process.argv[2];

if (!comandos[cmd]) {
  console.log('Uso: node scripts/simulate-hardware.js <setup|login|replay|tamper>');
  process.exit(1);
}
comandos[cmd]().catch((e) => {
  console.error('Erro:', e.message);
  process.exit(1);
});
