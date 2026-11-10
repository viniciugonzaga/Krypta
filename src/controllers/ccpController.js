const ccpService = require('../services/ccpService');
const { ErroDeNegocio } = require('../services/contaService');

const rotacionar = async (req, res) => {
  try {
    const {
      prova_cont_dono_atual: provaAtual,
      prova_cont_dono_nova: provaNova,
      version_counter: versionCounter,
      payload_cifrado: payloadBase64,
    } = req.body || {};

    const r = await ccpService.rotacionarCcp({
      contaId: req.auth.contaId,
      provaAtual,
      provaNova,
      versionCounter,
      payloadBase64,
    });
    return res.status(200).json(r);
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('Erro ao rotacionar CCP:', erro);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};

module.exports = { rotacionar };
