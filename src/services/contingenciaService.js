const bcrypt = require('bcrypt');
const contaRepository = require('../repositories/contaRepository');
const { ErroDeNegocio, validarPublicKey, validarProvaContingencia } = require('./contaService');

const ESTADOS_KILL_SWITCH = ['ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'];
const ESTADOS_RECUPERACAO = ['RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'];

// contaId vem do token (nunca do body): ninguém age sobre conta alheia.
async function obterConta(contaId) {
  const conta = await contaRepository.obterContaPorId(contaId);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  return conta;
}

// A API nunca vê a CCP: confere a prova derivada no cliente contra o bcrypt guardado.
async function conferirProva(contaId, prova) {
  validarProvaContingencia(prova);
  const hash = await contaRepository.obterHashContDono(contaId);
  if (!hash) {
    throw new ErroDeNegocio('Conta sem chave de contingência cadastrada.', 409);
  }
  if (!(await bcrypt.compare(prova, hash))) {
    throw new ErroDeNegocio('Prova de contingência inválida.', 401);
  }
}

// ATIVA -> RECUPERACAO_LOCAL. Não altera a public_key: o hardware continua vinculado.
const iniciarRecuperacaoLocal = async ({ contaId, provaContDono }) => {
  const conta = await obterConta(contaId);
  if (conta.status !== 'ATIVA') {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: recuperação local exige conta ATIVA.`, 409);
  }
  await conferirProva(contaId, provaContDono);

  const atualizada = await contaRepository.transicionarEstado({
    contaId,
    de: ['ATIVA'],
    para: 'RECUPERACAO_LOCAL',
  });
  if (!atualizada) {
    throw new ErroDeNegocio('Estado da conta mudou durante a operação.', 409);
  }
  return atualizada;
};

// RECUPERACAO_* -> ATIVA. O cliente chama depois do commit físico no ESP32.
const concluirRecuperacao = async ({ contaId }) => {
  const conta = await obterConta(contaId);
  if (!ESTADOS_RECUPERACAO.includes(conta.status)) {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: não há recuperação em andamento.`, 409);
  }

  const atualizada = await contaRepository.transicionarEstado({
    contaId,
    de: ESTADOS_RECUPERACAO,
    para: 'ATIVA',
  });
  if (!atualizada) {
    throw new ErroDeNegocio('Estado da conta mudou durante a operação.', 409);
  }
  return atualizada;
};

// Kill Switch: revoga e bane a public_key permanentemente.
const acionarKillSwitch = async ({ contaId, provaContDono }) => {
  const conta = await obterConta(contaId);
  if (!ESTADOS_KILL_SWITCH.includes(conta.status)) {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: kill switch não aplicável.`, 409);
  }
  await conferirProva(contaId, provaContDono);

  const revogada = await contaRepository.revogarConta({
    contaId,
    motivo: 'KILL_SWITCH_DONO',
    estadosPermitidos: ESTADOS_KILL_SWITCH,
  });
  if (!revogada) {
    throw new ErroDeNegocio('Estado da conta mudou durante a operação.', 409);
  }
  return revogada;
};

// REVOGADA -> RECUPERACAO_HARDWARE: vincula o novo dispositivo e libera o download.
const recuperarHardware = async ({ contaId, publicKey, provaContDono }) => {
  validarPublicKey(publicKey);

  const conta = await obterConta(contaId);
  if (conta.status !== 'REVOGADA') {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: recuperação de hardware exige conta REVOGADA.`, 409);
  }
  await conferirProva(contaId, provaContDono);

  if (await contaRepository.chaveRevogada(publicKey)) {
    throw new ErroDeNegocio('Este hardware foi revogado e não pode ser vinculado novamente.', 409);
  }
  if (await contaRepository.obterContaPorPublicKey(publicKey)) {
    throw new ErroDeNegocio('Este hardware já está vinculado a outra conta (RN01).', 409);
  }

  const atualizada = await contaRepository.parearNovoHardware({ contaId, publicKey });
  if (!atualizada) {
    throw new ErroDeNegocio('Não foi possível vincular o hardware (estado ou chave em conflito).', 409);
  }
  return atualizada;
};

module.exports = {
  iniciarRecuperacaoLocal,
  concluirRecuperacao,
  acionarKillSwitch,
  recuperarHardware,
};
