const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const contaRepository = require('../repositories/contaRepository');

// Uso: exigirToken(['hardware']). O escopo (tipo) impede que um token de
// login administrativo (admin_web) acesse rotas do cofre, e vice-versa.
const exigirToken = (tiposPermitidos) => async (req, res, next) => {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token ausente.' });
  }

  let payload;
  try {
    // Algoritmo fixado: nunca aceitar o que o próprio token declarar.
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }

  if (!tiposPermitidos.includes(payload.tipo)) {
    return res.status(403).json({ erro: 'Escopo do token não permitido para esta rota.' });
  }

  // Sessão de hardware presa à chave: se a public_key da conta mudou ou foi
  // revogada (Kill Switch, resgate de herança, recuperação de hardware),
  // o token do dispositivo antigo morre na hora, mesmo dentro dos 15 min.
  if (payload.tipo === 'hardware') {
    try {
      const conta = await contaRepository.obterContaPorId(payload.contaId);
      if (!conta || !conta.public_key || conta.public_key !== payload.publicKey) {
        return res.status(401).json({ erro: 'Sessão do dispositivo não é mais válida.' });
      }
    } catch (erro) {
      console.error('Erro ao validar sessão do dispositivo:', erro);
      return res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
  }

  req.auth = payload;
  next();
};

module.exports = { exigirToken };
