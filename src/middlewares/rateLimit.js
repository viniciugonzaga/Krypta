const rateLimit = require('express-rate-limit');

// Só para desenvolvimento: multiplica os limites para as suítes de teste rodarem em sequência.
// Sempre ignorado com NODE_ENV=production.
const multiplicador =
  process.env.NODE_ENV === 'production' ? 1 : Math.max(1, Number(process.env.RATE_LIMIT_MULT) || 1);

const criar = (windowMs, limit, erro) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    windowMs,
    limit: limit * multiplicador,
    message: { erro },
  });

const MSG = 'Muitas tentativas. Tente novamente mais tarde.';

// Contadores por IP, em memória (zeram ao reiniciar o servidor).
module.exports = {
  limitarLoginAdmin: criar(15 * 60 * 1000, 10, MSG),
  limitarAuthHardware: criar(60 * 1000, 30, 'Muitas requisições. Aguarde um instante.'),
  limitarContingencia: criar(15 * 60 * 1000, 20, MSG),
  limitarRotacao: criar(15 * 60 * 1000, 20, MSG),
  limitarCadastro: criar(60 * 60 * 1000, 30, MSG),
  limitarOperacaoConta: criar(15 * 60 * 1000, 30, MSG),
  // Ativar/desativar herança (contador próprio).
  limitarHeranca: criar(15 * 60 * 1000, 20, MSG),
  // Resgate pelo herdeiro: público e sem token, então o limite é o mais apertado.
  limitarResgate: criar(15 * 60 * 1000, 10, MSG),
};
