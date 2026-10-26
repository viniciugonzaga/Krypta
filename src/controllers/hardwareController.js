const contaService = require('../services/contaService');

const parear = async (req, res) => {
  try {
    const { public_key: publicKey, prova_cont_dono: provaContDono } = req.body;
    // contaId vem do token admin_web: o cliente não escolhe qual conta parear.
    const conta = await contaService.parearHardware({
      contaId: req.auth.contaId,
      publicKey,
      provaContDono,
    });
    return res.status(200).json(conta);
  } catch (erro) {
    if (erro instanceof contaService.ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro ao parear hardware:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { parear };
