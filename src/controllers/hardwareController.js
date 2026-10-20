const contaService = require('../services/contaService');

const parear = async (req, res) => {
  try {
    const { conta_id: contaId, public_key: publicKey, hash_cont_dono: hashContDono } = req.body;
    const conta = await contaService.parearHardware({ contaId, publicKey, hashContDono });
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
