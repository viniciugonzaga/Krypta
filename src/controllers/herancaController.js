const herancaService = require('../services/herancaService');
const { ErroDeNegocio } = require('../services/contaService');

function tratarErro(erro, res, contexto) {
  if (erro instanceof ErroDeNegocio) {
    return res.status(erro.statusCode).json({ erro: erro.message });
  }
  console.error(`Erro ao ${contexto}:`, erro);
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
}

const habilitar = async (req, res) => {
  try {
    const {
      prova_cont_dono_atual: provaAtual,
      prova_cont_herdeiro: provaHerdeiro,
      version_counter: versionCounter,
      payload_cifrado: payloadBase64,
    } = req.body || {};
    const r = await herancaService.habilitar({
      contaId: req.auth.contaId,
      provaAtual,
      provaHerdeiro,
      versionCounter,
      payloadBase64,
    });
    return res.status(200).json(r);
  } catch (erro) {
    return tratarErro(erro, res, 'habilitar herança');
  }
};

const desabilitar = async (req, res) => {
  try {
    const {
      prova_cont_dono_atual: provaAtual,
      version_counter: versionCounter,
      payload_cifrado: payloadBase64,
    } = req.body || {};
    const r = await herancaService.desabilitar({
      contaId: req.auth.contaId,
      provaAtual,
      versionCounter,
      payloadBase64,
    });
    return res.status(200).json(r);
  } catch (erro) {
    return tratarErro(erro, res, 'desabilitar herança');
  }
};

const resgatar = async (req, res) => {
  try {
    const {
      conta_id: contaId,
      prova_cont_herdeiro: provaHerdeiro,
      public_key: publicKey,
    } = req.body || {};
    return res.status(200).json(await herancaService.resgatar({ contaId, provaHerdeiro, publicKey }));
  } catch (erro) {
    return tratarErro(erro, res, 'resgatar herança');
  }
};

module.exports = { habilitar, desabilitar, resgatar };
