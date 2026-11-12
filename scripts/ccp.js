const crypto = require('crypto');

// Stand-in do cliente: o app real usa Argon2id. O scrypt aqui só simula a derivação.
// Salt determinístico por conta, para o cliente reproduzir a prova na recuperação.
const derivar = (segredo, rotulo, contaId) => {
  const salt = crypto.createHash('sha256').update(`${rotulo}:${contaId}`).digest();
  return crypto.scryptSync(segredo, salt, 32, { N: 16384, r: 8, p: 1 }).toString('base64');
};

// Prova da CCP do dono.
const derivarProva = (ccp, contaId) => derivar(ccp, 'krypta-ccp-v1', contaId);

// Prova da CCH do herdeiro: rótulo próprio, para nunca coincidir com a do dono.
const derivarProvaHerdeiro = (cch, contaId) => derivar(cch, 'krypta-cch-v1', contaId);

module.exports = { derivarProva, derivarProvaHerdeiro };
