const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const contaRepository = require('../repositories/contaRepository');
const { ErroDeNegocio } = require('./contaService');

const ADMIN_JWT_EXPIRES_IN = '30m';

// Hash falso: iguala o tempo de resposta quando o email não existe,
// para o timing não revelar quais emails estão cadastrados.
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', 12);

// Login do PORTAL (email + senha administrativa). Emite token tipo 'admin_web',
// que NÃO é aceito nas rotas do cofre (essas exigem tipo 'hardware').
const loginAdmin = async (email, senha) => {
  if (typeof email !== 'string' || typeof senha !== 'string' || email === '' || senha === '') {
    throw new ErroDeNegocio('email e senha_administrativa são obrigatórios.', 400);
  }

  const conta = await contaRepository.obterContaPorEmail(email);
  const senhaCorreta = await bcrypt.compare(senha, conta ? conta.senha_admin_hash : HASH_FALSO);

  // Mesma resposta para email inexistente e senha errada.
  if (!conta || !senhaCorreta) {
    throw new ErroDeNegocio('Credenciais inválidas.', 401);
  }

  // Sem checar status: o dono com conta REVOGADA precisa entrar no portal.
  const token = jwt.sign(
    { contaId: conta.id, tipo: 'admin_web' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: ADMIN_JWT_EXPIRES_IN }
  );
  return { token };
};

module.exports = { loginAdmin };
