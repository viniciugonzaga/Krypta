// server/src/utils/nonceStore.ts
// ============================================================
// Nonces do challenge-response (login por hardware), em memória.
// Chave do Map = public_key. Um novo challenge para a mesma chave
// substitui o anterior. Vale 60 s e é de uso único (anti-replay).
//
// Em memória = vale para UMA instância do servidor e zera ao
// reiniciar (comportamento igual ao da API original).
// ============================================================
import crypto from 'crypto';

const TTL_MS = 60 * 1000;
const nonces = new Map<string, { nonce: string; expiraEm: number }>();

export function gerarNonce(publicKey: string): string {
  const nonce = crypto.randomBytes(32).toString('base64');
  nonces.set(publicKey, { nonce, expiraEm: Date.now() + TTL_MS });
  return nonce;
}

/** Remove ao consumir, expirado ou não. Retorna null se não houver nonce válido. */
export function consumirNonce(publicKey: string): string | null {
  const registro = nonces.get(publicKey);
  nonces.delete(publicKey);
  if (!registro || Date.now() > registro.expiraEm) return null;
  return registro.nonce;
}

// Varre nonces expirados que nunca foram usados (evita acumular memória)
const varredura = setInterval(() => {
  const agora = Date.now();
  for (const [chave, registro] of nonces) {
    if (agora > registro.expiraEm) nonces.delete(chave);
  }
}, 30 * 1000);
varredura.unref(); // não segura o processo aberto
