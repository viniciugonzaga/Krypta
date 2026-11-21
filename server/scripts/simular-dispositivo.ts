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
//   PLANOS E COMPRAS
//   npm run sim -- planos <email> <senha>     confere as travas do Free e assina o Pro
//   npm run sim -- conta <email> <senha>      cancelar o Pro, contato e "sair de tudo"
//   npm run sim -- mobile <email> <senha>    modo Mobile: servidor identifica o cliente + plano recomendado
//   npm run sim -- acesso <email> <senha>    cofre em outro aparelho (CCP), CCP esquecida, abandonar
//   npm run sim -- esp32                      faz o papel do ESP32 real (apresentação, pareamento, login, Kill Switch)
//
//   npm run sim -- testar-tudo                 CRIA UMA CONTA NOVA e roda TODOS os testes
//   npm run sim -- testar-tudo <email> <senha> roda tudo numa conta que você já pareou
//   npm run sim -- limpar                      exclui a conta de teste criada pelo testar-tudo
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
  senha?: string; // só nas contas de teste criadas pelo próprio simulador
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
  token?: string,
  extras: Record<string, string> = {}
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${API}${rota}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extras,
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
  if (ch.status === 404) {
    falha(
      'Challenge falhou (404): a chave salva em scripts/.sim-keys.json não existe mais no banco ' +
        '(a conta foi excluída ou o dispositivo foi trocado). Rode: npm run sim -- testar-tudo   (sem e-mail: cria uma conta nova)'
    );
  }
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

/** Token de transação no formato do Krypta Pay (pagamento simulado) */
const tokenTransacao = () => `tok_kp_${crypto.randomBytes(12).toString('hex')}`;

async function planoAtual(tokenSite: string): Promise<string> {
  const r = await chamar('GET', '/users/me', undefined, tokenSite);
  if (r.status !== 200) falha(`Não consegui ler a conta (${r.status}): ${r.json.error}`);
  return r.json.data.plan as string;
}

/** Assina o Pro pela COMPRA (pedido gravado no servidor) */
async function assinarPro(tokenSite: string): Promise<void> {
  if ((await planoAtual(tokenSite)) === 'pro') {
    ok('A conta já é Krypta Pro');
    return;
  }
  const r = await chamar(
    'POST',
    '/orders',
    { tipo: 'PLANO', plano: 'pro', periodo: 'MENSAL', metodo: 'card', parcelas: 1, cartao_final: '4242', token_transacao: tokenTransacao() },
    tokenSite
  );
  esperar(r, 201, `Krypta Pro assinado (pedido ${r.json.data?.pedido?.codigo})`);
}

/** Compra 1 dispositivo físico e devolve o número de série */
async function comprarDispositivo(tokenSite: string): Promise<string> {
  const r = await chamar(
    'POST',
    '/orders',
    {
      tipo: 'PRODUTO',
      produto: 'krypta-device-v1',
      quantidade: 1,
      metodo: 'pix',
      parcelas: 1,
      token_transacao: tokenTransacao(),
      endereco: { cep: '01001000', endereco: 'Praça da Sé', numero: '1' },
    },
    tokenSite
  );
  esperar(r, 201, `Dispositivo comprado (pedido ${r.json.data?.pedido?.codigo})`);
  return r.json.data.dispositivos[0] as string;
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

  // O novo dispositivo vem de uma COMPRA (origem rastreada pelo número de série)
  const serial = await comprarDispositivo(tokenSite);
  const novo = nacl.sign.keyPair();

  const naoEntregue = await chamar(
    'POST',
    '/vault/recovery/hardware',
    { public_key: b64(novo.publicKey), prova_cont_dono: k.provaContDono, dispositivo_serial: serial },
    tokenSite
  );
  esperar(naoEntregue, 409, 'Dispositivo ainda em transporte não pode ser pareado');

  esperar(await chamar('POST', `/devices/${serial}/receive`, undefined, tokenSite), 200, `Recebimento confirmado (${serial})`);

  const vincular = await chamar(
    'POST',
    '/vault/recovery/hardware',
    { public_key: b64(novo.publicKey), prova_cont_dono: k.provaContDono, dispositivo_serial: serial },
    tokenSite
  );
  esperar(vincular, 200, `Dispositivo comprado vinculado → ${vincular.json.data?.status} · ${vincular.json.data?.hardware_uuid} (${vincular.json.data?.tipo_dispositivo})`);

  const lista = await chamar('GET', '/devices', undefined, tokenSite);
  const unidade = (lista.json.data as Array<{ serial: string; status: string }>).find((d) => d.serial === serial);
  if (unidade?.status === 'PAREADO') ok('Em "Minhas compras" o dispositivo aparece como PAREADO');
  else falha(`Esperava o dispositivo PAREADO e veio ${unidade?.status}`);

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
// PLANOS — o que o Free bloqueia e o que o Pro libera
// ============================================================
async function planos(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- planos <email> <senha>');
  const k = lerChaves();
  titulo('💎 Planos — travas do Free e liberação pelo Pro');

  const tokenSite = await loginSite(email, senha);
  ok('Login no site');

  const virarPro = await chamar('POST', '/plans/change', { tier: 'pro' }, tokenSite);
  esperar(virarPro, 402, 'Virar Pro "de graça" pela rota de plano é recusado (só pela compra)');

  esperar(await chamar('POST', '/plans/change', { tier: 'free' }, tokenSite), 200, 'Conta no plano Free');

  const token = await loginDispositivo(k.publicKey, k.secretKey);
  const v = await versaoAtual(token);

  const heranca = await chamar(
    'POST',
    '/vault/inheritance/enable',
    { prova_cont_dono_atual: k.provaContDono, prova_cont_herdeiro: aleatorio32(), version_counter: v + 1, payload_cifrado: payloadFalso() },
    token
  );
  esperar(heranca, 403, 'Free: herança bloqueada');

  esperar(await chamar('POST', '/vault/kill-switch', { prova_cont_dono: k.provaContDono }, tokenSite), 403, 'Free: Kill Switch bloqueado');
  esperar(await chamar('GET', '/vault/activity', undefined, tokenSite), 403, 'Free: alertas de acesso bloqueados');

  const grande = await chamar('PUT', '/vault/backup', { version_counter: v + 1, payload_cifrado: payloadFalso(100 * 1024) }, token);
  esperar(grande, 413, 'Free: backup acima de 64 KB recusado');

  await assinarPro(tokenSite);

  const grandePro = await chamar('PUT', '/vault/backup', { version_counter: v + 1, payload_cifrado: payloadFalso(100 * 1024) }, token);
  esperar(grandePro, 200, 'Pro: backup de 100 KB aceito');

  const atividade = await chamar('GET', '/vault/activity', undefined, tokenSite);
  esperar(atividade, 200, `Pro: alertas de acesso liberados (${atividade.json.data?.length} eventos)`);

  const pedidos = await chamar('GET', '/orders', undefined, tokenSite);
  esperar(pedidos, 200, `Pedidos gravados no servidor: ${pedidos.json.data?.length}`);

  console.log('\n  Planos OK! 🎉\n');
}

// ============================================================
// CONTA DO SITE — cancelar o Pro, contato e sessões
// ============================================================
async function conta(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- conta <email> <senha>');
  titulo('👤 Conta do site — cancelar assinatura, contato e sessões');

  const tokenSite = await loginSite(email, senha);
  ok('Login no site');
  if ((await planoAtual(tokenSite)) !== 'pro') await assinarPro(tokenSite);

  esperar(await chamar('POST', '/plans/cancel', { password: 'senha-errada-123' }, tokenSite), 401, 'Cancelar com a senha errada é recusado');
  const cancelar = await chamar('POST', '/plans/cancel', { password: senha }, tokenSite);
  esperar(cancelar, 200, `Assinatura cancelada → plano ${cancelar.json.data?.plan}`);
  esperar(await chamar('POST', '/plans/cancel', { password: senha }, tokenSite), 409, 'Cancelar de novo recusado (já é Free)');

  const pedidos = await chamar('GET', '/orders', undefined, tokenSite);
  const planoAtivo = (pedidos.json.data as Array<{ tipo: string; status: string }>).some((p) => p.tipo === 'PLANO' && p.status === 'APROVADO');
  if (planoAtivo) falha('Ainda há pedido de plano APROVADO depois do cancelamento');
  ok('Pedidos de plano marcados como CANCELADO');

  esperar(await chamar('GET', '/vault/activity', undefined, tokenSite), 403, 'Depois de cancelar, os alertas de acesso voltam a ficar travados');

  esperar(
    await chamar('POST', '/contact', { nome: 'Simulador Krypta', email, mensagem: 'Teste do formulário de contato.' }),
    201,
    'Formulário de contato aceito'
  );
  esperar(await chamar('POST', '/contact', { nome: 'x', email: 'invalido', mensagem: 'curta' }), 400, 'Contato inválido recusado');

  const sair = await chamar('POST', '/users/me/sessions/revoke', undefined, tokenSite);
  esperar(sair, 200, 'Saiu de todos os dispositivos');
  esperar(await chamar('GET', '/users/me', undefined, tokenSite), 401, 'A sessão antiga não vale mais');

  await assinarPro(await loginSite(email, senha)); // deixa a conta no Pro de novo
  console.log('\n  Conta do site OK! 🎉\n');
}

// ============================================================
// ESP32 DE VERDADE — o que o firmware faz, passo a passo
// (usa uma conta nova só para isso e apaga no fim)
// ============================================================
function codigoDe(publicKeyB64: string): string {
  const h = crypto.createHash('sha256').update(Buffer.from(publicKeyB64, 'base64')).digest();
  const n = String(h.readUInt32BE(0) % 1_000_000).padStart(6, '0');
  return `${n.slice(0, 3)} ${n.slice(3)}`;
}

async function esp32() {
  titulo('📟 Hardware real — o ESP32 se apresenta, é pareado e faz login');
  const { email, senha } = await criarContaTeste();
  const tokenSite = await loginSite(email, senha);
  await assinarPro(tokenSite);
  const serial = await comprarDispositivo(tokenSite);
  esperar(await chamar('POST', `/devices/${serial}/receive`, undefined, tokenSite), 200, `Recebimento confirmado (${serial})`);

  // 1. Primeiro boot: o ESP32 gera as chaves e se apresenta
  const par = nacl.sign.keyPair();
  const pk = b64(par.publicKey);
  const assinar = (texto: string) => b64(nacl.sign.detached(new TextEncoder().encode(texto), par.secretKey));

  esperar(
    await chamar('POST', '/hardware/announce', { serial, public_key: pk, assinatura: b64(nacl.sign.detached(new TextEncoder().encode('outra coisa'), par.secretKey)) }),
    401,
    'Apresentação com assinatura errada recusada'
  );
  esperar(
    await chamar('POST', '/hardware/announce', { serial: 'KRY-0000-0000-0000', public_key: pk, assinatura: assinar('krypta-announce-v1:KRY-0000-0000-0000') }),
    404,
    'Número de série que não existe recusado'
  );
  const anuncio = await chamar('POST', '/hardware/announce', { serial, public_key: pk, assinatura: assinar(`krypta-announce-v1:${serial}`) });
  esperar(anuncio, 200, `ESP32 apresentado → ${anuncio.json.data?.estado} · código ${anuncio.json.data?.codigo}`);
  if (anuncio.json.data?.codigo !== codigoDe(pk)) falha('O código do servidor é diferente do calculado pelo dispositivo');
  ok('Código da tela do ESP32 = código do site');

  // 2. O site enxerga o hardware ligado
  const lista = await chamar('GET', '/devices', undefined, tokenSite);
  const unidade = (lista.json.data as Array<{ serial: string; conectado: boolean; chaveAnunciada: string }>).find((d) => d.serial === serial);
  if (!unidade?.conectado || unidade.chaveAnunciada !== pk) falha('O site não mostrou o hardware como ligado');
  ok('Minhas compras mostra o hardware ligado');

  // 3. O dono pareia pelo site com a chave do ESP32 (+ backup inicial cifrado no navegador)
  const prova = aleatorio32();
  const pareio = await chamar('POST', '/hardware/pair', { public_key: pk, prova_cont_dono: prova, dispositivo_serial: serial, backup_inicial: payloadFalso() }, tokenSite);
  esperar(pareio, 200, `Cofre pareado com o hardware real → ${pareio.json.data?.status} · ${pareio.json.data?.tipo_dispositivo}`);

  const deNovo = await chamar('POST', '/hardware/announce', { serial, public_key: pk, assinatura: assinar(`krypta-announce-v1:${serial}`) });
  esperar(deNovo, 200, `Ao religar, o ESP32 vê → ${deNovo.json.data?.estado}`);
  if (deNovo.json.data?.estado !== 'PAREADO') falha('Esperava PAREADO');

  // 4. Login do ESP32 (challenge-response) e backup inicial
  const tokenHw = await loginDispositivo(pk, b64(par.secretKey));
  ok('ESP32 fez login com a própria chave');
  esperar(await chamar('GET', '/vault/backup/metadata', undefined, tokenHw), 200, 'O backup inicial (envelope da CCP) já está no servidor');

  // 5. Kill Switch: o ESP32 descobre que foi bloqueado
  esperar(await chamar('POST', '/vault/kill-switch', { prova_cont_dono: prova }, tokenSite), 200, 'Kill Switch acionado pelo site');
  const bloqueado = await chamar('POST', '/hardware/announce', { serial, public_key: pk, assinatura: assinar(`krypta-announce-v1:${serial}`) });
  esperar(bloqueado, 200, `Ao religar, o ESP32 vê → ${bloqueado.json.data?.estado}`);
  if (bloqueado.json.data?.estado !== 'REVOGADO') falha('Esperava REVOGADO');
  esperar(await chamar('POST', '/auth/challenge', { public_key: pk }), 404, 'O ESP32 bloqueado não consegue mais logar');

  // 6. Limpa a conta de teste
  esperar(await chamar('DELETE', '/users/me', { password: senha }, await loginSite(email, senha)), 200, 'Conta de teste do hardware excluída');
  console.log('\n  Hardware real OK! 🎉\n');
}

// ============================================================
// MODO MOBILE — o servidor identifica o cliente + questionário de boas-vindas
// ============================================================
async function mobile(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- mobile <email> <senha>');
//   npm run sim -- acesso <email> <senha>    cofre em outro aparelho (CCP), CCP esquecida, abandonar
  titulo('📱 Modo Mobile — identificação do cliente e plano recomendado');

  const pwa = await chamar('GET', '/client/context', undefined, undefined, { 'X-Krypta-Cliente': 'pwa' });
  esperar(pwa, 200, `Cabeçalho X-Krypta-Cliente: pwa → servidor vê "${pwa.json.data?.cliente}" · modo ${pwa.json.data?.modoRecomendado}`);
  if (pwa.json.data?.modoRecomendado !== 'mobile') falha('Esperava modo mobile para o app instalado');

  const iphone = await chamar('GET', '/client/context', undefined, undefined, {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  });
  esperar(iphone, 200, `Sem cabeçalho, só pelo navegador do iPhone → ${iphone.json.data?.aparelho} · modo ${iphone.json.data?.modoRecomendado}`);

  // Login "pelo app do celular": a sessão fica marcada como pwa
  const login = await chamar('POST', '/auth/login', { email, password: senha }, undefined, { 'X-Krypta-Cliente': 'pwa' });
  esperar(login, 200, 'Login pelo app do celular');
  const token = login.json.data.token as string;
  const sessoes = await chamar('GET', '/users/me/sessions', undefined, token);
  const atual = (sessoes.json.data as Array<{ cliente: string; atual: boolean }>).find((x) => x.atual);
  if (atual?.cliente !== 'pwa') falha(`Esperava a sessão atual marcada como pwa e veio ${atual?.cliente}`);
  ok('A sessão aparece como "App do celular" em "Onde sua conta está aberta"');

  esperar(await chamar('POST', '/onboarding', {}, token), 400, 'Questionário vazio recusado (precisa responder ou pular)');
  const respostas = {
    usos: ['pessoal', 'heranca', 'inventado'],
    nivel: 'maximo',
    proteger: ['bancos', 'senhas'],
    dispositivos: ['celular', 'notebook'],
    origem: 'escola',
    outros: {},
    pulou: false,
  };
  const rec = await chamar('POST', '/onboarding', respostas, token);
  esperar(rec, 200, `Questionário salvo → recomendado ${rec.json.data?.recomendacao?.plano} (${rec.json.data?.recomendacao?.motivos?.length} motivos)`);
  if (rec.json.data?.recomendacao?.plano !== 'pro') falha('Esperava recomendação Pro para herança + nível máximo');

  const me = await chamar('GET', '/users/me', undefined, token);
  if (!me.json.data?.onboardingConcluido || me.json.data?.recomendacao !== 'pro') falha('O perfil não marcou o questionário como concluído');
  ok('Perfil: onboardingConcluido = true, recomendacao = pro');

  const simples = await chamar('POST', '/onboarding', { usos: ['pessoal'], nivel: 'basico', proteger: ['senhas'], dispositivos: ['celular'], origem: 'redes' }, token);
  esperar(simples, 200, `Perfil simples → recomendado ${simples.json.data?.recomendacao?.plano}`);
  if (simples.json.data?.recomendacao?.plano !== 'free') falha('Esperava recomendação Free para uso básico');

  console.log('\n  Modo Mobile OK! 🎉\n');
}

// ============================================================
// ACESSO ESPECIAL — outro aparelho com a CCP, CCP esquecida, abandonar
// ============================================================
async function acesso(email?: string, senha?: string) {
  if (!email || !senha) falha('Uso: npm run sim -- acesso <email> <senha>');
  const k = lerChaves();
  titulo('🗝️  Acesso especial — cofre em outro aparelho, CCP esquecida e abandonar cofre');

  const tokenSite = await loginSite(email, senha);
  await assinarPro(tokenSite);

  // 1) Outro aparelho, só leitura, com a CCP (Pro)
  esperar(await chamar('POST', '/vault/backup/ccp', { prova_cont_dono: aleatorio32() }, tokenSite), 401, 'Outro aparelho com a CCP errada: recusado');
  const aberto = await chamar('POST', '/vault/backup/ccp', { prova_cont_dono: k.provaContDono }, tokenSite);
  esperar(aberto, 200, `Outro aparelho com a CCP certa: recebeu o cofre CIFRADO (versão ${aberto.json.data?.version_counter})`);

  esperar(await chamar('POST', '/plans/change', { tier: 'free' }, tokenSite), 200, 'Conta volta ao Free');
  esperar(await chamar('POST', '/vault/backup/ccp', { prova_cont_dono: k.provaContDono }, tokenSite), 403, 'Free: abrir em outro aparelho é do Pro');
  await assinarPro(tokenSite);

  // 2) Esqueci a CCP, mas estou com o dispositivo (+ senha)
  const token = await loginDispositivo(k.publicKey, k.secretKey);
  const v = await versaoAtual(token);
  const provaNova = aleatorio32();
  esperar(
    await chamar('POST', '/vault/ccp/reset', { password: 'senha-errada-123', prova_cont_dono_nova: provaNova, version_counter: v + 1, payload_cifrado: payloadFalso() }, token),
    401,
    'CCP nova com a senha errada: recusado'
  );
  esperar(
    await chamar('POST', '/vault/ccp/reset', { password: senha, prova_cont_dono_nova: provaNova, version_counter: v + 1, payload_cifrado: payloadFalso() }, tokenSite),
    403,
    'CCP nova sem o dispositivo (token do site): recusado'
  );
  esperar(
    await chamar('POST', '/vault/ccp/reset', { password: senha, prova_cont_dono_nova: provaNova, version_counter: v + 1, payload_cifrado: payloadFalso() }, token),
    200,
    'Dispositivo + senha criaram uma CCP nova'
  );
  esperar(await chamar('POST', '/vault/backup/ccp', { prova_cont_dono: k.provaContDono }, tokenSite), 401, 'A CCP antiga deixou de valer');
  k.provaContDono = provaNova;
  salvarChaves(k);

  // 3) Abandonar: pede senha e código do e-mail
  esperar(await chamar('POST', '/vault/abandon/request', { password: 'senha-errada-123' }, tokenSite), 401, 'Abandonar com a senha errada: recusado');
  const pedido = await chamar('POST', '/vault/abandon/request', { password: senha }, tokenSite);
  esperar(pedido, 200, `Código para abandonar gerado (${pedido.json.data?.enviado ? 'enviado por e-mail' : 'aparece no terminal do servidor'})`);
  esperar(await chamar('POST', '/vault/abandon/confirm', { codigo: '000000' }, tokenSite), 401, 'Código errado: o cofre NÃO foi abandonado');
  info('O abandono de verdade (com o código) você testa pelo site: Cofre → Recursos de emergência → Perdi minha CCP.');

  console.log('\n  Acesso especial OK! 🎉\n');
}

// ============================================================
// TUDO EM SEQUÊNCIA
// ============================================================
/** Cria uma conta de teste nova (Free, sem dispositivo) */
async function criarContaTeste(): Promise<{ email: string; senha: string }> {
  const email = `sim-${Date.now()}@krypta.dev`;
  const senha = `Sim-${crypto.randomBytes(6).toString('hex')}`;
  const r = await chamar('POST', '/auth/register', { name: 'Simulador Krypta', email, password: senha });
  if (r.status !== 201) falha(`Não consegui criar a conta de teste (${r.status}): ${r.json.error}`);
  ok(`Conta de teste criada: ${email}`);
  return { email, senha };
}

async function testarTudo(emailArg?: string, senhaArg?: string) {
  let email = emailArg;
  let senha = senhaArg;
  if (!email || !senha) {
    titulo('🧪 Teste completo do zero (conta nova)');
    if (fs.existsSync(ARQUIVO)) fs.unlinkSync(ARQUIVO); // chaves antigas não servem para a conta nova
    ({ email, senha } = await criarContaTeste());
    await parear(email, senha);
    const k0 = lerChaves();
    salvarChaves({ ...k0, senha });
    await login();
  }
  const k = lerChaves();
  if (k.email !== email) falha(`As chaves salvas são da conta ${k.email}, não de ${email}. Rode sem e-mail para começar do zero.`);
  const token = await loginDispositivo(k.publicKey, k.secretKey);
  const estado = await estadoCofre(token);
  if (estado !== 'ATIVA') falha(`O cofre precisa estar ATIVO para começar (está ${estado}).`);

  await planos(email, senha); // deixa a conta no Pro
  await backup();
  await recuperar();
  await trocarCcp();
  await heranca();
  await resgatar();
  await killSwitch(email, senha); // o dono retoma a conta depois do resgate
  await conta(email, senha);
  await mobile(email, senha);
  await acesso(email, senha);
  await esp32();
  console.log(falhas === 0 ? '\n🏁 COFRE, PLANOS E COMPRAS — TODOS OS TESTES PASSARAM! 🎉\n' : `\n⚠️  ${falhas} falha(s)\n`);
  if (!emailArg) {
    console.log(`  Conta usada: ${email}  (senha: ${senha})`);
    console.log('  Você pode entrar com ela no site para ver o resultado, ou apagar com: npm run sim -- limpar\n');
  }
}

/** Exclui a conta de teste criada pelo testar-tudo (pedidos, backup e dispositivos vão junto) */
async function limpar() {
  const k = lerChaves();
  if (!k.senha) falha(`A conta ${k.email} não foi criada pelo simulador. Exclua pelo site, se quiser.`);
  const token = await loginSite(k.email, k.senha);
  const r = await chamar('DELETE', '/users/me', { password: k.senha }, token);
  esperar(r, 200, `Conta de teste ${k.email} excluída`);
  fs.unlinkSync(ARQUIVO);
  ok('Chaves locais do simulador apagadas');
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
  planos: () => planos(args[0], args[1]),
  'testar-tudo': () => testarTudo(args[0], args[1]),
  conta: () => conta(args[0], args[1]),
  esp32,
  mobile: () => mobile(args[0], args[1]),
  acesso: () => acesso(args[0], args[1]),
  status,
  esquecer,
  limpar,
};

if (!comando || !comandos[comando]) {
  console.log(
    'Uso: npm run sim -- <parear email senha | login | backup | recuperar | trocar-ccp | heranca | resgatar | kill-switch email senha | planos email senha | conta email senha | mobile email senha | acesso email senha | esp32 | testar-tudo [email senha] | limpar | status | esquecer>'
  );
  process.exit(1);
}
Promise.resolve(comandos[comando]()).catch((e) => falha(String(e)));
