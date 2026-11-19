// src/services/virtualDevice.ts
// ============================================================
// DISPOSITIVO VIRTUAL — faz o papel do ESP32 dentro do navegador.
//
// O que o ESP32 real faz, e o que ele faz aqui:
//   • gera e GUARDA a chave privada Ed25519 (aqui: localStorage)
//   • assina o desafio (nonce) do login        (aqui: tweetnacl)
//   • guarda o cofre e a chave do cofre        (aqui: localStorage)
//
// ⚠️ É para DEMONSTRAÇÃO e testes. No ESP32 a chave privada nunca sai
// do chip; aqui ela fica no navegador. Não use com senhas reais.
//
// Também contém o cliente das rotas do DISPOSITIVO (token "hardware").
// Ele é separado do apiRequest do portal: usa outro token, que vive só
// na memória e dura 15 minutos.
// ============================================================
import nacl from 'tweetnacl';
import { API_URL } from './api';
import { b64ParaBytes, bytesParaB64, type Cifrado, type Credencial } from '../crypto/kryptaCrypto';

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
}

const chave = (contaId: string) => `krypta_virtual_device:${contaId}`;

// ------------------------------------------------------------
// ARMAZENAMENTO
// ------------------------------------------------------------
export const VirtualDevice = {
  carregar(contaId: string): EstadoDispositivo | null {
    try {
      const raw = localStorage.getItem(chave(contaId));
      return raw ? (JSON.parse(raw) as EstadoDispositivo) : null;
    } catch {
      return null;
    }
  },

  /** Gera um par de chaves novo (como o ESP32 faz no primeiro uso) */
  criar(contaId: string): EstadoDispositivo {
    const par = nacl.sign.keyPair();
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
    };
  },

  salvar(estado: EstadoDispositivo): void {
    try {
      localStorage.setItem(chave(estado.contaId), JSON.stringify(estado));
    } catch {
      throw new Error('Não foi possível guardar o dispositivo virtual neste navegador.');
    }
  },

  apagar(contaId: string): void {
    try {
      localStorage.removeItem(chave(contaId));
    } catch {
      /* ignora */
    }
    tokens.delete(contaId);
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

  enviarBackup: (token: string, versionCounter: number, payload: string) =>
    deviceFetch<BackupInfo>('/vault/backup', {
      method: 'PUT',
      token,
      body: { version_counter: versionCounter, payload_cifrado: payload },
    }),

  baixarBackup: (token: string) =>
    deviceFetch<BackupInfo & { payload_cifrado: string }>('/vault/backup', { token }),

  recoveryOwner: (token: string, prova: string) =>
    deviceFetch('/vault/recovery/owner', { method: 'POST', token, body: { prova_cont_dono: prova } }),

  recoveryComplete: (token: string) => deviceFetch('/vault/recovery/complete', { method: 'POST', token }),

  rotateCcp: (
    token: string,
    body: { prova_cont_dono_atual: string; prova_cont_dono_nova: string; version_counter: number; payload_cifrado: string }
  ) => deviceFetch<BackupInfo>('/vault/rotate-ccp', { method: 'POST', token, body }),

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
