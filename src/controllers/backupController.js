const backupService = require('../services/backupService');
const { ErroDeNegocio } = require('../services/contaService');

function tratarErro(erro, res, contexto) {
  if (erro instanceof ErroDeNegocio) {
    return res.status(erro.statusCode).json({ erro: erro.message });
  }
  console.error(`Erro ao ${contexto}:`, erro);
  return res.status(500).json({ erro: 'Erro interno no servidor.' });
}

const enviar = async (req, res) => {
  try {
    const { version_counter: versionCounter, payload_cifrado: payloadBase64 } = req.body;
    const r = await backupService.enviarBackup({
      contaId: req.auth.contaId,
      versionCounter,
      payloadBase64,
    });
    return res.status(200).json(r);
  } catch (erro) {
    return tratarErro(erro, res, 'enviar backup');
  }
};

const baixar = async (req, res) => {
  try {
    return res.status(200).json(await backupService.baixarBackup({ contaId: req.auth.contaId }));
  } catch (erro) {
    return tratarErro(erro, res, 'baixar backup');
  }
};

module.exports = { enviar, baixar };
