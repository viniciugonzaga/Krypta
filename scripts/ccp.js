const crypto = require('crypto');

// Stand-in do cliente: o app real usa Argon2id. O scrypt aqui só simula a derivação.
// Salt determinístico por conta, para o cliente reproduzir a prova na recuperação.
function derivarProva(ccp, contaId) {
  const salt = crypto.createHash('sha256').update(`krypta-ccp-v1:${contaId}`).digest();
  return crypto.scryptSync(ccp, salt, 32, { N: 16384, r: 8, p: 1 }).toString('base64');
}

module.exports = { derivarProva };
