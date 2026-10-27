const contingenciaService = require('../services/contingenciaService');
const { ErroDeNegocio } = require('../services/contaService');

function tratarErro(erro, res, contexto) {
  if (erro instanceof ErroDeNegocio) {
    return res.status(erro.statusCode).json({ erro: erro.message });
  }
  console.error(`Erro ao ${contexto}:`, erro);
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
}

const iniciarRecuperacaoLocal = async (req, res) => {
  try {
    const { prova_cont_dono: provaContDono } = req.body || {};
    const r = await contingenciaService.iniciarRecuperacaoLocal({ contaId: req.auth.contaId, provaContDono });
    return res.status(200).json(r);
  } catch (erro) {
    return tratarErro(erro, res, 'iniciar recuperação local');
  }
};

const concluirRecuperacao = async (req, res) => {
  try {
    return res.status(200).json(await contingenciaService.concluirRecuperacao({ contaId: req.auth.contaId }));
  } catch (erro) {
    return tratarErro(erro, res, 'concluir recuperação');
  }
};

const killSwitch = async (req, res) => {
  try {
    const { prova_cont_dono: provaContDono } = req.body || {};
    const r = await contingenciaService.acionarKillSwitch({ contaId: req.auth.contaId, provaContDono });
    return res.status(200).json(r);
  } catch (erro) {
    return tratarErro(erro, res, 'acionar kill switch');
  }
};

const recuperarHardware = async (req, res) => {
  try {
    const { public_key: publicKey, prova_cont_dono: provaContDono } = req.body || {};
    const r = await contingenciaService.recuperarHardware({ contaId: req.auth.contaId, publicKey, provaContDono });
    return res.status(200).json(r);
  } catch (erro) {
    return tratarErro(erro, res, 'recuperar hardware');
  }
};

module.exports = { iniciarRecuperacaoLocal, concluirRecuperacao, killSwitch, recuperarHardware };
