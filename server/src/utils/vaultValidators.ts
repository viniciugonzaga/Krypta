// server/src/utils/vaultValidators.ts
// ============================================================
// Validação de FORMATO dos campos do cofre (contrato da API, seção 1).
// Tudo que chega do cliente passa por aqui ANTES de ir ao banco
// ou ao tweetnacl (que lança exceção com tamanhos errados).
// ============================================================
import { ApiError } from './ApiError.js';

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PAYLOAD_MAX_BYTES = 1024 * 1024; // 1 MB decodificado
export const VERSION_MAX = 2147483647;

function base64DeTamanho(valor: unknown, bytes: number): valor is string {
  if (typeof valor !== 'string' || !BASE64_REGEX.test(valor)) return false;
  return Buffer.from(valor, 'base64').length === bytes;
}

/** Ed25519: 32 bytes em base64 (44 caracteres) */
export function validarPublicKey(publicKey: unknown): string {
  if (typeof publicKey !== 'string' || publicKey.trim() === '') {
    throw new ApiError(400, 'public_key é obrigatório.');
  }
  if (publicKey.length !== 44 || !base64DeTamanho(publicKey, 32)) {
    throw new ApiError(400, 'public_key inválida: esperado base64 de 32 bytes (Ed25519).');
  }
  return publicKey;
}

/**
 * Prova derivada da CCP/CCH NO CLIENTE (32 bytes, base64).
 * É checagem de formato: a CCP em texto claro nunca tem esse formato,
 * então ela é barrada aqui (RN08).
 */
export function validarProva(prova: unknown, campo = 'prova_cont_dono'): string {
  if (typeof prova !== 'string' || prova.length !== 44 || !base64DeTamanho(prova, 32)) {
    throw new ApiError(400, `${campo} inválida: esperado base64 de 32 bytes derivados no cliente (RN08).`);
  }
  return prova;
}

/** Assinatura Ed25519 detached: 64 bytes */
export function decodificarAssinatura(assinatura: unknown): Uint8Array {
  if (typeof assinatura !== 'string' || !BASE64_REGEX.test(assinatura)) {
    throw new ApiError(400, 'assinatura inválida: esperado base64.');
  }
  const bytes = Buffer.from(assinatura, 'base64');
  if (bytes.length !== 64) {
    throw new ApiError(400, 'assinatura inválida: tamanho incompatível com Ed25519.');
  }
  return new Uint8Array(bytes);
}

export function validarUuid(id: unknown, campo = 'id'): string {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw new ApiError(400, `${campo} inválido: formato incompatível com UUID.`);
  }
  return id;
}

/** version_counter: inteiro de 1 a 2147483647 */
export function validarVersionCounter(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 1 || valor > VERSION_MAX) {
    throw new ApiError(400, 'version_counter inválido: esperado inteiro de 1 a 2147483647.');
  }
  return valor;
}

/** payload_cifrado: base64 de 1 byte a 1 MB decodificado */
export function decodificarPayload(valor: unknown): Buffer {
  if (typeof valor !== 'string' || valor.length === 0 || !BASE64_REGEX.test(valor)) {
    throw new ApiError(400, 'payload_cifrado inválido: esperado base64.');
  }
  const bytes = Buffer.from(valor, 'base64');
  if (bytes.length < 1) throw new ApiError(400, 'payload_cifrado vazio.');
  if (bytes.length > PAYLOAD_MAX_BYTES) {
    throw new ApiError(413, 'payload_cifrado acima de 1 MB.');
  }
  return bytes;
}
