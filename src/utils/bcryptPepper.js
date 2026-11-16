const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { PASSWORD_PEPPER } = require('../config/env');

// RNF02: pepper = segredo do SERVIDOR, guardado fora do banco. O valor passa por HMAC-SHA256
// antes do bcrypt: um dump do banco sozinho não basta para testar senhas, e o pré-hash evita
// o truncamento do bcrypt em 72 bytes. Mesma interface do bcrypt para os serviços.
const preparar = (valor) =>
  crypto.createHmac('sha256', PASSWORD_PEPPER).update(String(valor)).digest('base64');

module.exports = {
  hash: (valor, rounds) => bcrypt.hash(preparar(valor), rounds),
  hashSync: (valor, rounds) => bcrypt.hashSync(preparar(valor), rounds),
  compare: (valor, hash) => bcrypt.compare(preparar(valor), hash),
};
