// src/crypto/kryptaCrypto.ts
// ============================================================
// CRIPTOGRAFIA DO CLIENTE (Zero-Knowledge) — contrato da API, seção 4.
// Tudo aqui roda NO NAVEGADOR / APP. O servidor nunca vê a CCP, a CCH,
// o "master" nem as chaves de cifra: só recebe as PROVAS derivadas.
//
//  CCP (chave de contingência do dono) e CCH (do herdeiro):
//    gerada com 160 bits de entropia, mostrada UMA vez, nunca enviada.
//
//  master = Argon2id(segredo, salt = SHA-256("<rótulo>:" + conta_id),
//                    m = 64 MiB, t = 3, p = 1, 32 bytes)
//  prova  = HKDF-SHA256(master, info = "krypta-prova-v1")          → vai ao servidor
//  chave do envelope = HKDF-SHA256(master, info = "krypta-envelope-ccp-v1") → NUNCA sai daqui
//
//  Separação de chaves: a prova chega ao servidor e o servidor guarda o
//  backup que contém o envelope. Se prova e chave do envelope fossem iguais,
//  o servidor conseguiria abrir o cofre. Por isso os "info" são diferentes.
//
//  Parâmetros CONGELADOS: mudar qualquer valor exige rótulo "v2" e CCP nova.
// ============================================================
import { argon2id } from 'hash-wasm';

export type TipoSegredo = 'ccp' | 'cch';

const ROTULOS: Record<TipoSegredo, { salt: string; prova: string; envelope: string }> = {
  ccp: { salt: 'krypta-ccp-v1', prova: 'krypta-prova-v1', envelope: 'krypta-envelope-ccp-v1' },
  cch: { salt: 'krypta-cch-v1', prova: 'krypta-prova-cch-v1', envelope: 'krypta-envelope-cch-v1' },
};

const ARGON2 = { memorySize: 64 * 1024, iterations: 3, parallelism: 1, hashLength: 32 } as const;

const enc = new TextEncoder();
const dec = new TextDecoder();

// ------------------------------------------------------------
// base64 (padrão, com + / =) — o formato que a API espera
// ------------------------------------------------------------
export function bytesParaB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function aleatorio(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

// ------------------------------------------------------------
// GERAÇÃO DA CCP / CCH
// 20 bytes (160 bits) em Base32 Crockford → 32 caracteres em 8 blocos.
// Sem letras ambíguas (I, L, O, U): fácil de anotar no papel.
// ------------------------------------------------------------
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function gerarSegredo(): string {
  const bytes = aleatorio(20);
  let bits = 0;
  let valor = 0;
  let saida = '';
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return saida.match(/.{1,4}/g)!.join('-');
}

/** Aceita a CCP digitada com espaços, minúsculas ou sem hífens */
export function normalizarSegredo(texto: string): string {
  const limpo = texto
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return limpo.match(/.{1,4}/g)?.join('-') ?? '';
}

export function segredoValido(texto: string): boolean {
  return /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/.test(normalizarSegredo(texto));
}

// ------------------------------------------------------------
// DERIVAÇÃO (Argon2id + HKDF)
// ------------------------------------------------------------
async function sha256(texto: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
}

async function hkdf(master: Uint8Array, info: string): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey('raw', master as BufferSource, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) },
    chave,
    256
  );
  return new Uint8Array(bits);
}

export interface Derivacao {
  /** base64 de 32 bytes — é o que vai para a API */
  prova: string;
  /** chave AES-256 do envelope — NUNCA sai do cliente */
  chaveEnvelope: CryptoKey;
}

/**
 * Deriva a prova e a chave do envelope a partir da CCP/CCH.
 * Leva cerca de 1 a 3 segundos de propósito (Argon2id com 64 MiB):
 * é isso que torna inviável testar CCPs por força bruta.
 */
export async function derivar(segredo: string, contaId: string, tipo: TipoSegredo): Promise<Derivacao> {
  const r = ROTULOS[tipo];
  const master = (await argon2id({
    password: normalizarSegredo(segredo),
    salt: await sha256(`${r.salt}:${contaId}`),
    ...ARGON2,
    outputType: 'binary',
  })) as Uint8Array;

  const prova = bytesParaB64(await hkdf(master, r.prova));
  const bytesEnvelope = await hkdf(master, r.envelope);
  const chaveEnvelope = await crypto.subtle.importKey('raw', bytesEnvelope as BufferSource, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
  master.fill(0); // não deixa o master na memória
  return { prova, chaveEnvelope };
}

// ------------------------------------------------------------
// AES-256-GCM
// ------------------------------------------------------------
export interface Cifrado {
  iv: string;
  ct: string;
}

export async function cifrar(chave: CryptoKey, dados: Uint8Array): Promise<Cifrado> {
  const iv = aleatorio(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, chave, dados as BufferSource);
  return { iv: bytesParaB64(iv), ct: bytesParaB64(new Uint8Array(ct)) };
}

export async function decifrar(chave: CryptoKey, c: Cifrado): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ParaBytes(c.iv) as BufferSource },
    chave,
    b64ParaBytes(c.ct) as BufferSource
  );
  return new Uint8Array(pt);
}

async function importarChaveCofre(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// ============================================================
// "vault.enc" — o arquivo cifrado que vai para o backup
//
//  {
//    formato: "krypta-vault-demo-v1",
//    dados: AES-GCM(chaveDoCofre, JSON das credenciais),
//    envelope_ccp: AES-GCM(chaveEnvelopeCCP, chaveDoCofre),
//    envelope_herdeiro?: AES-GCM(chaveEnvelopeCCH, chaveDoCofre)
//  }
//
// No produto final o app do ESP32 define o formato definitivo e adiciona
// o Envelope do Titular (senha mestre). Aqui é a versão de demonstração.
// ============================================================
export interface Credencial {
  id: string;
  servico: string;
  usuario: string;
  senha: string;
  criadaEm: string;
}

export interface VaultEnc {
  formato: 'krypta-vault-demo-v1';
  dados: Cifrado;
  envelope_ccp: Cifrado;
  envelope_herdeiro?: Cifrado;
}

/**
 * Envelope = a chave do cofre cifrada com a chave derivada da CCP/CCH.
 * A chave do cofre não muda; por isso o envelope pronto fica guardado
 * no dispositivo e é reaproveitado a cada sincronização (sem pedir a CCP).
 */
export async function criarEnvelope(chaveEnvelope: CryptoKey, chaveCofre: Uint8Array): Promise<Cifrado> {
  return cifrar(chaveEnvelope, chaveCofre);
}

/** Confere LOCALMENTE que o envelope abre com a chave derivada (obrigação do cliente) */
export async function envelopeAbre(chaveEnvelope: CryptoKey, envelope: Cifrado, chaveCofre: Uint8Array): Promise<boolean> {
  try {
    const aberto = await decifrar(chaveEnvelope, envelope);
    return aberto.length === chaveCofre.length && aberto.every((b, i) => b === chaveCofre[i]);
  } catch {
    return false;
  }
}

/** Monta o vault.enc e devolve em base64 (o payload_cifrado da API) */
export async function montarVaultEnc(params: {
  chaveCofre: Uint8Array;
  credenciais: Credencial[];
  envelopeCcp: Cifrado;
  envelopeHerdeiro?: Cifrado | null;
}): Promise<string> {
  const chave = await importarChaveCofre(params.chaveCofre);
  const vault: VaultEnc = {
    formato: 'krypta-vault-demo-v1',
    dados: await cifrar(chave, enc.encode(JSON.stringify(params.credenciais))),
    envelope_ccp: params.envelopeCcp,
  };
  if (params.envelopeHerdeiro) vault.envelope_herdeiro = params.envelopeHerdeiro;
  return bytesParaB64(enc.encode(JSON.stringify(vault)));
}

export function lerVaultEnc(payloadB64: string): VaultEnc {
  const vault = JSON.parse(dec.decode(b64ParaBytes(payloadB64))) as VaultEnc;
  if (vault.formato !== 'krypta-vault-demo-v1') throw new Error('Formato de cofre desconhecido.');
  return vault;
}

/**
 * Abre um envelope (CCP ou herdeiro) e devolve a chave do cofre + credenciais.
 * Se a CCP/CCH estiver errada, o AES-GCM falha e lançamos um erro amigável.
 */
export async function abrirCofre(
  payloadB64: string,
  chaveEnvelope: CryptoKey,
  qual: 'ccp' | 'herdeiro'
): Promise<{ chaveCofre: Uint8Array; credenciais: Credencial[]; vault: VaultEnc }> {
  const vault = lerVaultEnc(payloadB64);
  const envelope = qual === 'ccp' ? vault.envelope_ccp : vault.envelope_herdeiro;
  if (!envelope) throw new Error('Este backup não tem envelope do herdeiro.');

  let chaveCofre: Uint8Array;
  try {
    chaveCofre = await decifrar(chaveEnvelope, envelope);
  } catch {
    throw new Error(qual === 'ccp' ? 'CCP incorreta: ela não abre o envelope do cofre.' : 'CCH incorreta.');
  }
  const chave = await importarChaveCofre(chaveCofre);
  const credenciais = JSON.parse(dec.decode(await decifrar(chave, vault.dados))) as Credencial[];
  return { chaveCofre, credenciais, vault };
}
