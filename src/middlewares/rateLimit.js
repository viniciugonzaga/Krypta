const rateLimit = require('express-rate-limit');

const base = { standardHeaders: true, legacyHeaders: false };

// Brute force de senha do portal: 10 tentativas por IP a cada 15 min.
const limitarLoginAdmin = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { erro: 'Muitas tentativas. Tente novamente mais tarde.' },
});

// Challenge/verify do hardware: limita spam que sobrescreve nonce alheio.
const limitarAuthHardware = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  message: { erro: 'Muitas requisições. Aguarde um instante.' },
});

// Endpoints que conferem a prova da CCP (recuperação e kill switch).
const limitarContingencia = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { erro: 'Muitas tentativas. Tente novamente mais tarde.' },
});

module.exports = { limitarLoginAdmin, limitarAuthHardware, limitarContingencia };
