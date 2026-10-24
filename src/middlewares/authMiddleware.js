const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Uso: exigirToken(['hardware']). O escopo (tipo) impede que um token de
// login administrativo (admin_web) acesse rotas do cofre, e vice-versa.
const exigirToken = (tiposPermitidos) => (req, res, next) => {
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

  req.auth = payload;
  next();
};

module.exports = { exigirToken };
