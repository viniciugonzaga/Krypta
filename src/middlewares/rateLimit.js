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
  // Brute force da senha do portal.
  limitarLoginAdmin: criar(15 * 60 * 1000, 10, MSG),
  // Challenge/verify do hardware: evita spam que sobrescreve nonce alheio.
  limitarAuthHardware: criar(60 * 1000, 30, 'Muitas requisições. Aguarde um instante.'),
  // Rotas que conferem a prova da CCP (contador compartilhado entre elas).
  limitarContingencia: criar(15 * 60 * 1000, 20, MSG),
  // Rotação da CCP: contador próprio.
  limitarRotacao: criar(15 * 60 * 1000, 20, MSG),
  // Cadastro: cada requisição roda bcrypt com custo 12.
  limitarCadastro: criar(60 * 60 * 1000, 30, MSG),
  // Pareamento e conclusão de recuperação (contador compartilhado).
  limitarOperacaoConta: criar(15 * 60 * 1000, 30, MSG),
};
