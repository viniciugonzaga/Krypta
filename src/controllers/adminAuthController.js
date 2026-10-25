const adminAuthService = require('../services/adminAuthService');
const { ErroDeNegocio } = require('../services/contaService');

const login = async (req, res) => {
  try {
    const { email, senha_administrativa: senha } = req.body;
    return res.status(200).json(await adminAuthService.loginAdmin(email, senha));
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro no login administrativo:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { login };
