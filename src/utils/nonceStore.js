const crypto = require('crypto');

// Nonces em memória (instância única de API). Chave: public_key.
const nonces = new Map();
const TTL_MS = 60 * 1000;

const gerarNonce = (publicKey) => {
  const nonce = crypto.randomBytes(32).toString('base64');
  nonces.set(publicKey, { nonce, expiraEm: Date.now() + TTL_MS });
  return nonce;
};

// Uso único: remove ao consumir, expirado ou não (anti-replay).
const consumirNonce = (publicKey) => {
  const registro = nonces.get(publicKey);
  nonces.delete(publicKey);
  if (!registro || Date.now() > registro.expiraEm) return null;
  return registro.nonce;
};

// Varre nonces expirados que nunca foram consumidos (evita vazamento de memória).
const varredura = setInterval(() => {
  const agora = Date.now();
  for (const [chave, registro] of nonces) {
    if (agora > registro.expiraEm) nonces.delete(chave);
  }
}, 30 * 1000);
varredura.unref(); // não impede o processo de encerrar

module.exports = { gerarNonce, consumirNonce };
