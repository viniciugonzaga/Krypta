const contaService = require('../services/contaService');

const criarConta = async (req, res) => {
  try {
    const { email, senha_administrativa: senhaAdministrativa } = req.body;
    const novaConta = await contaService.cadastrarConta({ email, senhaAdministrativa });
    return res.status(201).json(novaConta);
  } catch (erro) {
    if (erro instanceof contaService.ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro ao criar conta:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

const buscarContaPorId = async (req, res) => {
  try {
    const conta = await contaService.buscarContaPorId(req.params.id);
    return res.status(200).json(conta);
  } catch (erro) {
    if (erro instanceof contaService.ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro ao buscar conta:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { criarConta, buscarContaPorId };
