const bcrypt = require('bcrypt');
const contaRepository = require('../repositories/contaRepository');
const herancaRepository = require('../repositories/herancaRepository');
const notificacaoService = require('./notificacaoService');
const { ErroDeNegocio, validarPublicKey, validarProvaContingencia } = require('./contaService');
const { validarVersaoEPayload } = require('./backupService');

const BCRYPT_ROUNDS = 12;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERRO_CREDENCIAIS = 'Credenciais de herança inválidas.';

// Iguala o tempo de resposta quando não há CCH para conferir (conta inexistente
// ou herança desativada): o timing não revela quais contas têm herança.
const HASH_FALSO = bcrypt.hashSync('herdeiro-inexistente', BCRYPT_ROUNDS);

// Exige conta ATIVA e a prova atual do dono. contaId vem do token, nunca do body.
async function exigirDonoAtivo(contaId, provaAtual) {
  const conta = await contaRepository.obterContaPorId(contaId);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (conta.status !== 'ATIVA') {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: alterar a herança exige conta ATIVA.`, 409);
  }
  const hashAtual = await contaRepository.obterHashContDono(contaId);
  if (!hashAtual) {
    throw new ErroDeNegocio('Conta sem chave de contingência cadastrada.', 409);
  }
  if (!(await bcrypt.compare(provaAtual, hashAtual))) {
    throw new ErroDeNegocio('Prova de contingência atual inválida.', 401);
  }
  return hashAtual;
}

async function gravar({ contaId, hashDonoAtual, novoHashHerdeiro, payload, versionCounter }) {
  const r = await herancaRepository.definirHerdeiro({
    contaId,
    hashDonoAtual,
    novoHashHerdeiro,
    payload,
    versionCounter,
  });
  if (r.resultado === 'OK') {
    return { version_counter: r.version_counter, atualizado_em: r.atualizado_em };
  }
  if (r.resultado === 'SEM_CONTA') {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (r.resultado === 'ESTADO') {
    throw new ErroDeNegocio(`Conta no estado ${r.status}: alterar a herança exige conta ATIVA.`, 409);
  }
  if (r.resultado === 'HASH_MUDOU') {
    throw new ErroDeNegocio('Chave de contingência alterada durante a operação. Tente novamente.', 409);
  }
  throw new ErroDeNegocio('version_counter igual ou inferior ao armazenado (anti-rollback).', 409);
}

// Opt-in (RN10): ativa a herança, ou troca a CCH se já houver uma (a antiga deixa de valer).
// Guarda bcrypt da prova do herdeiro: vazamento do banco não permite se autenticar.
const habilitar = async ({ contaId, provaAtual, provaHerdeiro, versionCounter, payloadBase64 }) => {
  validarProvaContingencia(provaAtual);
  validarProvaContingencia(provaHerdeiro);
  if (provaAtual === provaHerdeiro) {
    throw new ErroDeNegocio('A prova do herdeiro deve ser diferente da prova do dono.', 400);
  }
  const payload = validarVersaoEPayload(versionCounter, payloadBase64);

  const hashDonoAtual = await exigirDonoAtivo(contaId, provaAtual);
  const novoHashHerdeiro = await bcrypt.hash(provaHerdeiro, BCRYPT_ROUNDS);
  return gravar({ contaId, hashDonoAtual, novoHashHerdeiro, payload, versionCounter });
};

// O dono retira o consentimento: apaga a CCH e sobe o backup sem o Envelope do Herdeiro.
const desabilitar = async ({ contaId, provaAtual, versionCounter, payloadBase64 }) => {
  validarProvaContingencia(provaAtual);
  const payload = validarVersaoEPayload(versionCounter, payloadBase64);

  const hashDonoAtual = await exigirDonoAtivo(contaId, provaAtual);
  return gravar({ contaId, hashDonoAtual, novoHashHerdeiro: null, payload, versionCounter });
};

// Resgate público (o herdeiro não tem conta no portal nem token).
// Mesma resposta 401 para conta inexistente, herança desativada, CCH errada ou já usada.
const resgatar = async ({ contaId, provaHerdeiro, publicKey }) => {
  if (typeof contaId !== 'string' || !UUID_REGEX.test(contaId)) {
    throw new ErroDeNegocio('conta_id inválido: formato incompatível com UUID.', 400);
  }
  validarProvaContingencia(provaHerdeiro);
  validarPublicKey(publicKey);

  const hash = await herancaRepository.obterHashHerdeiro(contaId);
  const prova = await bcrypt.compare(provaHerdeiro, hash || HASH_FALSO);
  if (!hash || !prova) {
    throw new ErroDeNegocio(ERRO_CREDENCIAIS, 401);
  }

  const r = await herancaRepository.resgatar({
    contaId,
    hashHerdeiroVerificado: hash,
    publicKey,
  });

  if (r.resultado === 'OK') {
    // Avisa o dono (best-effort): nunca derruba nem atrasa o resgate.
    contaRepository
      .obterContaPorId(contaId)
      .then((dono) => dono && notificacaoService.notificarResgateHeranca(dono.email))
      .catch((erro) => console.error('Aviso de resgate falhou:', erro.message));
    return r.conta;
  }
  if (r.resultado === 'SEM_CONTA' || r.resultado === 'HERANCA_INDISPONIVEL') {
    throw new ErroDeNegocio(ERRO_CREDENCIAIS, 401);
  }
  if (r.resultado === 'ESTADO') {
    throw new ErroDeNegocio('Conta em estado que não permite o resgate.', 409);
  }
  if (r.resultado === 'CHAVE_REVOGADA') {
    throw new ErroDeNegocio('Este hardware foi revogado e não pode ser vinculado novamente.', 409);
  }
  throw new ErroDeNegocio('Esta chave já está vinculada a uma conta.', 409);
};

module.exports = { habilitar, desabilitar, resgatar };
