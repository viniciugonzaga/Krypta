const authService = require('../services/authService');
const { ErroDeNegocio } = require('../services/contaService');

const gerarChallenge = async (req, res) => {
  try {
    const { public_key: publicKey } = req.body;
    return res.status(200).json(await authService.gerarChallenge(publicKey));
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro ao gerar challenge:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

const verificarAssinatura = async (req, res) => {
  try {
    const { public_key: publicKey, assinatura } = req.body;
    return res.status(200).json(await authService.verificarAssinatura(publicKey, assinatura));
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro ao verificar assinatura:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

// Só chega aqui com token válido e escopo 'hardware' (req.auth vem do middleware).
const sessao = (req, res) => {
  const { contaId, tipo, exp } = req.auth;
  return res.status(200).json({ contaId, tipo, expira_em: new Date(exp * 1000).toISOString() });
};

module.exports = { gerarChallenge, verificarAssinatura, sessao };
