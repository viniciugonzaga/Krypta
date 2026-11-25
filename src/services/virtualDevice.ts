// src/services/virtualDevice.ts
// ============================================================
// DISPOSITIVO VIRTUAL — faz o papel do ESP32 dentro do navegador.
//
// O que o ESP32 real faz, e o que ele faz aqui:
//   • gera e GUARDA a chave privada Ed25519 (aqui: localStorage)
//   • assina o desafio (nonce) do login        (aqui: tweetnacl)
//   • guarda o cofre e a chave do cofre        (aqui: localStorage)
//
// ⚠️ No ESP32 a chave privada nunca sai do chip. Aqui ela fica no
// navegador — desde a v1.3.0 CIFRADA pela trava (PIN/senha/biometria).
//
// Também contém o cliente das rotas do DISPOSITIVO (token "hardware").
// Ele é separado do apiRequest do portal: usa outro token, que vive só
// na memória e dura 15 minutos.
// ============================================================
import nacl from 'tweetnacl';
import { API_URL } from './api';
import {
  aleatorio,
  b64ParaBytes,
  bytesParaB64,
  chaveAes,
  chaveDeBytes,
  cifrar,
  decifrar,
  derivar,
  derivarChaveLocal,
  envelopeAbre,
  type Cifrado,
  type Credencial,
} from '../crypto/kryptaCrypto';

export interface EstadoDispositivo {
  contaId: string;
  publicKey: string; // base64 32 bytes
  secretKey: string; // base64 64 bytes (no ESP32 real nunca sai do chip)
  chaveCofre: string | null; // base64 32 bytes
  envelopeCcp: Cifrado | null;
  envelopeHerdeiro: Cifrado | null;
  credenciais: Credencial[];
  versionCounter: number;
  criadoEm: string;
  /** v1.3.0: os dados deste aparelho estão protegidos pela trava (PIN/biometria) */
  protegido?: boolean;
  /** v1.3.0: protegido e ainda não desbloqueado nesta aba (sem chaves nem credenciais) */
  bloqueado?: boolean;
}

const chave = (contaId: string) => `krypta_virtual_device:${contaId}`;

// ============================================================
// v1.3.0 — TRAVA DO COFRE
//
// Formato gravado quando a trava está ligada (nada sensível em claro):
//   { formato: 'krypta-device-v2', contaId, publicKey, versionCounter, criadoEm,
//     trava: { tipo, dados: AES-GCM(chaveTrava, {secretKey, chaveCofre, envelopes, credenciais}),
//              pin: { salt, envelope }, ccp: { envelope }, bio?: { credId, prfSalt, envelope } } }
//
// Aberto, o estado vive SÓ na memória desta aba e fecha sozinho após
// 5 minutos sem uso, ao sair da conta ou ao recarregar a página.
// ============================================================
export type TipoTrava = 'PIN' | 'SENHA';

interface Embrulho {
  envelope: Cifrado;
}
interface DadosTrava {
  tipo: TipoTrava;
  dados: Cifrado;
  pin: Embrulho & { salt: string };
  ccp: Embrulho;
  bio?: Embrulho & { credId: string; prfSalt: string };
}
interface Gravado {
  formato: 'krypta-device-v2';
  contaId: string;
  publicKey: string;
  versionCounter: number;
  criadoEm: string;
  trava: DadosTrava;
}
type Sensivel = Pick<EstadoDispositivo, 'secretKey' | 'chaveCofre' | 'envelopeCcp' | 'envelopeHerdeiro' | 'credenciais'>;

interface Aberto {
  estado: EstadoDispositivo;
  chaveTrava: CryptoKey;
  bruta: Uint8Array; // para reembrulhar (trocar PIN, ligar biometria)
  trava: DadosTrava;
  timer: number | null;
}

const MINUTOS_ABERTO = 5;
const abertos = new Map<string, Aberto>();
const filas = new Map<string, Promise<void>>();
const ouvintesTrava = new Set<() => void>();
const avisarTrava = () => ouvintesTrava.forEach((f) => f());

function lerGravado(contaId: string): EstadoDispositivo | Gravado | null {
  try {
    const raw = localStorage.getItem(chave(contaId));
    return raw ? (JSON.parse(raw) as EstadoDispositivo | Gravado) : null;
  } catch {
    return null;
  }
}
const ehTravado = (g: unknown): g is Gravado => !!g && (g as Gravado).formato === 'krypta-device-v2';

function stub(g: Gravado): EstadoDispositivo {
  return {
    contaId: g.contaId,
    publicKey: g.publicKey,
    secretKey: '',
    chaveCofre: null,
    envelopeCcp: null,
    envelopeHerdeiro: null,
    credenciais: [],
    versionCounter: g.versionCounter,
    criadoEm: g.criadoEm,
    protegido: true,
    bloqueado: true,
  };
}

function rearmar(contaId: string) {
  const a = abertos.get(contaId);
  if (!a) return;
  if (a.timer) window.clearTimeout(a.timer);
  a.timer = window.setTimeout(() => fecharTrava(contaId), MINUTOS_ABERTO * 60_000);
}

function fecharTrava(contaId: string) {
  const a = abertos.get(contaId);
  if (!a) return;
  if (a.timer) window.clearTimeout(a.timer);
  a.bruta.fill(0);
  abertos.delete(contaId);
  tokens.delete(contaId);
  avisarTrava();
}

async function gravarTravado(estado: EstadoDispositivo, a: Aberto): Promise<void> {
  const sensivel: Sensivel = {
    secretKey: estado.secretKey,
    chaveCofre: estado.chaveCofre,
    envelopeCcp: estado.envelopeCcp,
    envelopeHerdeiro: estado.envelopeHerdeiro,
    credenciais: estado.credenciais,
  };
  const dados = await cifrar(a.chaveTrava, new TextEncoder().encode(JSON.stringify(sensivel)));
  a.trava = { ...a.trava, dados };
  const g: Gravado = {
    formato: 'krypta-device-v2',
    contaId: estado.contaId,
    publicKey: estado.publicKey,
    versionCounter: estado.versionCounter,
    criadoEm: estado.criadoEm,
    trava: a.trava,
  };
  localStorage.setItem(chave(estado.contaId), JSON.stringify(g));
}

function enfileirar(contaId: string, tarefa: () => Promise<void>): Promise<void> {
  const anterior = filas.get(contaId) ?? Promise.resolve();
  const p = anterior.then(tarefa, tarefa).catch(() => undefined);
  filas.set(contaId, p);
  return p;
}

if (typeof window !== 'undefined') {
  const fecharTudo = () => [...abertos.keys()].forEach(fecharTrava);
  window.addEventListener('krypta:session-expired', fecharTudo);
  window.addEventListener('krypta:logout', fecharTudo);
}

// ------------------------------------------------------------
// ARMAZENAMENTO
// ------------------------------------------------------------
export const VirtualDevice = {
  /**
   * Estado do dispositivo deste aparelho.
   * Com a trava ligada e fechada, volta SEM chaves e credenciais (bloqueado: true).
   */
  carregar(contaId: string): EstadoDispositivo | null {
    const aberto = abertos.get(contaId);
    if (aberto) {
      rearmar(contaId);
      return aberto.estado;
    }
    const g = lerGravado(contaId);
    if (!g) return null;
    if (ehTravado(g)) return stub(g);
    return { ...(g as EstadoDispositivo), protegido: false, bloqueado: false };
  },

  /** Gera um par de chaves novo (como o ESP32 faz no primeiro uso) */
  criar(contaId: string): EstadoDispositivo {
    const par = nacl.sign.keyPair();
    // Dispositivo novo substitui o antigo: qualquer trava aberta dele deixa de valer
    fecharTrava(contaId);
    return {
      contaId,
      publicKey: bytesParaB64(par.publicKey),
      secretKey: bytesParaB64(par.secretKey),
      chaveCofre: null,
      envelopeCcp: null,
      envelopeHerdeiro: null,
      credenciais: [],
      versionCounter: 0,
      criadoEm: new Date().toISOString(),
      protegido: false,
      bloqueado: false,
    };
  },

  salvar(estado: EstadoDispositivo): void {
    if (estado.bloqueado) throw new Error('O cofre está trancado neste aparelho. Desbloqueie com o PIN.');
    const a = abertos.get(estado.contaId);
    if (a && a.estado.publicKey === estado.publicKey) {
      a.estado = { ...estado, protegido: true, bloqueado: false };
      rearmar(estado.contaId);
      void enfileirar(estado.contaId, () => gravarTravado(a.estado, a));
      return;
    }
    const g = lerGravado(estado.contaId);
    if (ehTravado(g) && g.publicKey === estado.publicKey) {
      throw new Error('O cofre está trancado neste aparelho. Desbloqueie com o PIN.');
    }
    try {
      // Sem trava (dispositivo novo, ainda sem PIN): a tela pede o PIN logo em seguida
      const { protegido: _p, bloqueado: _b, ...limpo } = estado;
      localStorage.setItem(chave(estado.contaId), JSON.stringify(limpo));
    } catch {
      throw new Error('Não foi possível guardar o dispositivo virtual neste navegador.');
    }
  },

  /** Espera as gravações cifradas pendentes terminarem */
  async aguardar(contaId: string): Promise<void> {
    await (filas.get(contaId) ?? Promise.resolve());
  },

  apagar(contaId: string): void {
    fecharTrava(contaId);
    try {
      localStorage.removeItem(chave(contaId));
      localStorage.removeItem(`krypta_trava_erros:${contaId}`);
    } catch {
      /* ignora */
    }
    tokens.delete(contaId);
  },
};

// ------------------------------------------------------------
// TRAVA: criar, abrir (PIN, biometria, chave de contingência), trocar
// ------------------------------------------------------------
export type SituacaoTrava = 'sem-dispositivo' | 'sem-trava' | 'trancado' | 'aberto';

interface Erros {
  n: number;
  ate: number;
}
const chaveErros = (contaId: string) => `krypta_trava_erros:${contaId}`;
function lerErros(contaId: string): Erros {
  try {
    return JSON.parse(localStorage.getItem(chaveErros(contaId)) ?? '') as Erros;
  } catch {
    return { n: 0, ate: 0 };
  }
}
function gravarErros(contaId: string, e: Erros) {
  try {
    localStorage.setItem(chaveErros(contaId), JSON.stringify(e));
  } catch {
    /* ignora */
  }
}

/** Biometria: WebAuthn com a extensão PRF (Windows Hello, Touch ID, Face ID, digital do Android) */
async function prfDaBiometria(credId: string | null, prfSalt: Uint8Array, criar?: { nome: string; email: string }) {
  if (!('PublicKeyCredential' in window) || !navigator.credentials) throw new Error('Este aparelho não oferece biometria para sites.');
  const rpId = window.location.hostname;
  const desafio = aleatorio(32);
  let id = credId ? b64ParaBytes(credId) : null;
  let saida: ArrayBuffer | undefined;

  if (criar) {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: desafio as BufferSource,
        rp: { name: 'Krypta', id: rpId },
        user: { id: aleatorio(16) as BufferSource, name: criar.email, displayName: criar.nome },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60_000,
        extensions: { prf: { eval: { first: prfSalt as BufferSource } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!cred) throw new Error('Biometria cancelada.');
    const ext = cred.getClientExtensionResults() as { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } };
    if (!ext.prf?.enabled) throw new Error('A biometria deste aparelho/navegador não permite proteger chaves (falta o recurso PRF). Use o PIN.');
    id = new Uint8Array(cred.rawId);
    saida = ext.prf.results?.first;
  }
  if (!saida) {
    const a = (await navigator.credentials.get({
      publicKey: {
        challenge: aleatorio(32) as BufferSource,
        rpId,
        allowCredentials: id ? [{ type: 'public-key', id: id as BufferSource }] : [],
        userVerification: 'required',
        timeout: 60_000,
        extensions: { prf: { eval: { first: prfSalt as BufferSource } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    if (!a) throw new Error('Biometria cancelada.');
    const ext = a.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } };
    saida = ext.prf?.results?.first;
    if (!saida) throw new Error('A biometria não devolveu a chave. Use o PIN.');
  }
  return { credId: bytesParaB64(id!), chave: await chaveDeBytes(new Uint8Array(saida), 'krypta-trava-bio-v1') };
}

async function abrirCom(contaId: string, g: Gravado, chaveEmbrulho: CryptoKey, envelope: Cifrado): Promise<EstadoDispositivo> {
  const bruta = await decifrar(chaveEmbrulho, envelope); // lança se a chave estiver errada
  const chaveTrava = await chaveAes(bruta);
  const sensivel = JSON.parse(new TextDecoder().decode(await decifrar(chaveTrava, g.trava.dados))) as Sensivel;
  const estado: EstadoDispositivo = {
    contaId,
    publicKey: g.publicKey,
    versionCounter: g.versionCounter,
    criadoEm: g.criadoEm,
    ...sensivel,
    protegido: true,
    bloqueado: false,
  };
  fecharTrava(contaId);
  abertos.set(contaId, { estado, chaveTrava, bruta, trava: g.trava, timer: null });
  rearmar(contaId);
  gravarErros(contaId, { n: 0, ate: 0 });
  avisarTrava();
  return estado;
}

export const Trava = {
  situacao(contaId: string): SituacaoTrava {
    if (abertos.has(contaId)) return 'aberto';
    const g = lerGravado(contaId);
    if (!g) return 'sem-dispositivo';
    return ehTravado(g) ? 'trancado' : 'sem-trava';
  },

  info(contaId: string): { tipo: TipoTrava | null; biometria: boolean; esperaSegundos: number; erros: number } {
    const g = abertos.get(contaId)?.trava ?? (ehTravado(lerGravado(contaId)) ? (lerGravado(contaId) as Gravado).trava : null);
    const e = lerErros(contaId);
    return {
      tipo: g?.tipo ?? null,
      biometria: !!g?.bio,
      esperaSegundos: Math.max(0, Math.ceil((e.ate - Date.now()) / 1000)),
      erros: e.n,
    };
  },

  assinar(f: () => void): () => void {
    ouvintesTrava.add(f);
    return () => ouvintesTrava.delete(f);
  },

  fechar: fecharTrava,

  /** O aparelho consegue usar biometria (antes de tentar o PRF)? */
  async biometriaDisponivel(): Promise<boolean> {
    try {
      const PKC = (window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential;
      return !!PKC?.isUserVerifyingPlatformAuthenticatorAvailable && (await PKC.isUserVerifyingPlatformAuthenticatorAvailable());
    } catch {
      return false;
    }
  },

  /**
   * Liga a trava neste aparelho. Precisa da chave de contingência para criar o
   * caminho de recuperação ("esqueci o PIN") — e ela é CONFERIDA aqui antes.
   */
  async criar(contaId: string, opcoes: { tipo: TipoTrava; segredo: string; ccp: string }): Promise<void> {
    const g = lerGravado(contaId);
    if (!g) throw new Error('Não há dispositivo neste aparelho.');
    if (ehTravado(g)) throw new Error('A trava já está ligada neste aparelho.');
    const estado = g as EstadoDispositivo;
    if (!estado.chaveCofre || !estado.envelopeCcp) throw new Error('O cofre deste aparelho ainda não está pronto.');

    const { chaveEnvelope } = await derivar(opcoes.ccp, contaId, 'ccp');
    if (!(await envelopeAbre(chaveEnvelope, estado.envelopeCcp, b64ParaBytes(estado.chaveCofre)))) {
      throw new Error('Chave de contingência incorreta.');
    }

    const bruta = aleatorio(32);
    const chaveTrava = await chaveAes(bruta);
    const salt = bytesParaB64(aleatorio(16));
    const chavePin = await derivarChaveLocal(opcoes.segredo, salt);
    const trava: DadosTrava = {
      tipo: opcoes.tipo,
      dados: { iv: '', ct: '' },
      pin: { salt, envelope: await cifrar(chavePin, bruta) },
      ccp: { envelope: await cifrar(chaveEnvelope, bruta) },
    };
    const aberto: Aberto = { estado: { ...estado, protegido: true, bloqueado: false }, chaveTrava, bruta, trava, timer: null };
    await gravarTravado(aberto.estado, aberto);
    abertos.set(contaId, aberto);
    rearmar(contaId);
    avisarTrava();
  },

  async abrirComPin(contaId: string, segredo: string): Promise<EstadoDispositivo> {
    const g = lerGravado(contaId);
    if (!ehTravado(g)) throw new Error('A trava não está ligada neste aparelho.');
    const e = lerErros(contaId);
    if (e.ate > Date.now()) throw new Error(`Muitas tentativas. Espere ${Math.ceil((e.ate - Date.now()) / 1000)} s.`);
    const chavePin = await derivarChaveLocal(segredo, g.trava.pin.salt);
    try {
      return await abrirCom(contaId, g, chavePin, g.trava.pin.envelope);
    } catch {
      const n = e.n + 1;
      // a partir do 5º erro: 30 s, 60 s, 2 min... até 15 min
      const espera = n >= 5 ? Math.min(15 * 60, 30 * 2 ** (n - 5)) : 0;
      gravarErros(contaId, { n, ate: Date.now() + espera * 1000 });
      throw new Error(
        g.trava.tipo === 'PIN' ? `PIN incorreto.${espera ? ` Espere ${espera} s para tentar de novo.` : ''}` : `Senha incorreta.${espera ? ` Espere ${espera} s.` : ''}`
      );
    }
  },

  async abrirComBiometria(contaId: string): Promise<EstadoDispositivo> {
    const g = lerGravado(contaId);
    if (!ehTravado(g) || !g.trava.bio) throw new Error('A biometria não está ligada neste aparelho.');
    const { chave: k } = await prfDaBiometria(g.trava.bio.credId, b64ParaBytes(g.trava.bio.prfSalt));
    try {
      return await abrirCom(contaId, g, k, g.trava.bio.envelope);
    } catch {
      throw new Error('A biometria não abriu o cofre. Use o PIN.');
    }
  },

  /** "Esqueci o PIN": abre com a chave de contingência (depois a tela pede um PIN novo) */
  async abrirComCcp(contaId: string, ccp: string): Promise<EstadoDispositivo> {
    const g = lerGravado(contaId);
    if (!ehTravado(g)) throw new Error('A trava não está ligada neste aparelho.');
    const { chaveEnvelope } = await derivar(ccp, contaId, 'ccp');
    try {
      return await abrirCom(contaId, g, chaveEnvelope, g.trava.ccp.envelope);
    } catch {
      throw new Error('Chave de contingência incorreta.');
    }
  },

  /** Troca o PIN/senha (com o cofre aberto) */
  async trocarPin(contaId: string, tipo: TipoTrava, segredo: string): Promise<void> {
    const a = abertos.get(contaId);
    if (!a) throw new Error('Desbloqueie o cofre antes.');
    const salt = bytesParaB64(aleatorio(16));
    const chavePin = await derivarChaveLocal(segredo, salt);
    a.trava = { ...a.trava, tipo, pin: { salt, envelope: await cifrar(chavePin, a.bruta) } };
    await enfileirar(contaId, () => gravarTravado(a.estado, a));
    avisarTrava();
  },

  async ligarBiometria(contaId: string, quem: { nome: string; email: string }): Promise<void> {
    const a = abertos.get(contaId);
    if (!a) throw new Error('Desbloqueie o cofre antes.');
    const prfSalt = aleatorio(32);
    const { credId, chave: k } = await prfDaBiometria(null, prfSalt, quem);
    a.trava = { ...a.trava, bio: { credId, prfSalt: bytesParaB64(prfSalt), envelope: await cifrar(k, a.bruta) } };
    await enfileirar(contaId, () => gravarTravado(a.estado, a));
    avisarTrava();
  },

  async desligarBiometria(contaId: string): Promise<void> {
    const a = abertos.get(contaId);
    if (!a) throw new Error('Desbloqueie o cofre antes.');
    const { bio: _bio, ...resto } = a.trava;
    a.trava = resto;
    await enfileirar(contaId, () => gravarTravado(a.estado, a));
    avisarTrava();
  },
};

// ------------------------------------------------------------
// CLIENTE DAS ROTAS DO DISPOSITIVO
// ------------------------------------------------------------
type ErroApi = Error & { code?: number };

async function deviceFetch<T>(
  caminho: string,
  opcoes: { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; token?: string } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${caminho}`, {
    method: opcoes.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
    },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data?.error ?? `Erro ${res.status} em ${caminho}`) as ErroApi;
    err.code = data?.code ?? res.status;
    throw err;
  }
  return data.data as T;
}

// Token do dispositivo só na memória (some ao recarregar a página — de propósito)
const tokens = new Map<string, { token: string; expira: number; publicKey: string }>();

/**
 * Login pelo dispositivo: pede o desafio, assina os BYTES do nonce com a
 * chave privada e troca a assinatura por um token de 15 min.
 */
export async function loginDispositivo(estado: EstadoDispositivo): Promise<string> {
  const cache = tokens.get(estado.contaId);
  if (cache && cache.publicKey === estado.publicKey && cache.expira - Date.now() > 60_000) return cache.token;

  const { nonce } = await deviceFetch<{ nonce: string }>('/auth/challenge', {
    method: 'POST',
    body: { public_key: estado.publicKey },
  });
  const assinatura = nacl.sign.detached(b64ParaBytes(nonce), b64ParaBytes(estado.secretKey));
  const r = await deviceFetch<{ token: string; expira_em: string }>('/auth/verify', {
    method: 'POST',
    body: { public_key: estado.publicKey, assinatura: bytesParaB64(assinatura) },
  });
  tokens.set(estado.contaId, { token: r.token, expira: new Date(r.expira_em).getTime(), publicKey: estado.publicKey });
  return r.token;
}

export function esquecerToken(contaId: string): void {
  tokens.delete(contaId);
}

export interface BackupInfo {
  version_counter: number;
  atualizado_em: string;
}

export const DeviceAPI = {
  metadata: (token: string) => deviceFetch<BackupInfo>('/vault/backup/metadata', { token }),

  /** resumo = só contagens (adicionadas/editadas/removidas) para o relatório da conta */
  enviarBackup: (token: string, versionCounter: number, payload: string, resumo?: { adicionadas: number; editadas: number; removidas: number }) =>
    deviceFetch<BackupInfo>('/vault/backup', {
      method: 'PUT',
      token,
      body: { version_counter: versionCounter, payload_cifrado: payload, ...(resumo ? { resumo } : {}) },
    }),

  /** v1.2.0: se outro aparelho editou o cofre (senha de acesso / restauração), puxa a versão nova */
  sincronizar: (token: string, desde: number) =>
    deviceFetch<{ atualizado: boolean; version_counter: number; payload_cifrado?: string }>(`/vault/backup/sync?desde=${desde}`, { token }),

  baixarBackup: (token: string) =>
    deviceFetch<BackupInfo & { payload_cifrado: string }>('/vault/backup', { token }),

  recoveryOwner: (token: string, prova: string) =>
    deviceFetch('/vault/recovery/owner', { method: 'POST', token, body: { prova_cont_dono: prova } }),

  recoveryComplete: (token: string) => deviceFetch('/vault/recovery/complete', { method: 'POST', token }),

  rotateCcp: (
    token: string,
    body: { prova_cont_dono_atual: string; prova_cont_dono_nova: string; version_counter: number; payload_cifrado: string }
  ) => deviceFetch<BackupInfo>('/vault/rotate-ccp', { method: 'POST', token, body }),

  /** "Esqueci a CCP": o dispositivo + a senha do site criam uma CCP nova */
  resetCcp: (
    token: string,
    body: { password: string; prova_cont_dono_nova: string; version_counter: number; payload_cifrado: string }
  ) => deviceFetch<BackupInfo>('/vault/ccp/reset', { method: 'POST', token, body }),

  inheritanceEnable: (
    token: string,
    body: { prova_cont_dono_atual: string; prova_cont_herdeiro: string; version_counter: number; payload_cifrado: string }
  ) => deviceFetch<BackupInfo>('/vault/inheritance/enable', { method: 'POST', token, body }),

  inheritanceDisable: (
    token: string,
    body: { prova_cont_dono_atual: string; version_counter: number; payload_cifrado: string }
  ) => deviceFetch<BackupInfo>('/vault/inheritance/disable', { method: 'POST', token, body }),

  /** Público: o herdeiro não tem conta no site */
  inheritanceClaim: (body: { conta_id: string; prova_cont_herdeiro: string; public_key: string }) =>
    deviceFetch<{ id: string; status: string; public_key: string }>('/vault/inheritance/claim', {
      method: 'POST',
      body,
    }),
};

/** v1.5.0: a mesma biometria (WebAuthn PRF) para lembrar a senha de acesso nos outros aparelhos */
export const biometriaPrf = prfDaBiometria;
