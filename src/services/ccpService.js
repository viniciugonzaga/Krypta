const bcrypt = require('bcrypt');
const contaRepository = require('../repositories/contaRepository');
const ccpRepository = require('../repositories/ccpRepository');
const { ErroDeNegocio, validarProvaContingencia } = require('./contaService');
const { validarVersaoEPayload } = require('./backupService');

const BCRYPT_ROUNDS = 12;

// contaId vem do token (nunca do body). A API nunca vê a CCP: só as provas derivadas no cliente.
const rotacionarCcp = async ({ contaId, provaAtual, provaNova, versionCounter, payloadBase64 }) => {
  validarProvaContingencia(provaAtual);
  validarProvaContingencia(provaNova);
  if (provaAtual === provaNova) {
    throw new ErroDeNegocio('A nova prova de contingência deve ser diferente da atual.', 400);
  }
  const payload = validarVersaoEPayload(versionCounter, payloadBase64);

  const conta = await contaRepository.obterContaPorId(contaId);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (conta.status !== 'ATIVA') {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: rotação da CCP exige conta ATIVA.`, 409);
  }

  const hashAtual = await contaRepository.obterHashContDono(contaId);
  if (!hashAtual) {
    throw new ErroDeNegocio('Conta sem chave de contingência cadastrada.', 409);
  }
  // Exige a prova atual: token de hardware sozinho não troca a CCP.
  if (!(await bcrypt.compare(provaAtual, hashAtual))) {
    throw new ErroDeNegocio('Prova de contingência atual inválida.', 401);
  }

  const novoHash = await bcrypt.hash(provaNova, BCRYPT_ROUNDS);
  const r = await ccpRepository.rotacionarCcp({ contaId, hashAtual, novoHash, payload, versionCounter });

  if (r.resultado === 'SEM_CONTA') {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (r.resultado === 'ESTADO') {
    throw new ErroDeNegocio(`Conta no estado ${r.status}: rotação da CCP exige conta ATIVA.`, 409);
  }
  if (r.resultado === 'HASH_MUDOU') {
    throw new ErroDeNegocio('Chave de contingência alterada durante a operação. Tente novamente.', 409);
  }
  if (r.resultado === 'VERSAO') {
    throw new ErroDeNegocio('version_counter igual ou inferior ao armazenado (anti-rollback).', 409);
  }
  return { version_counter: r.version_counter, atualizado_em: r.atualizado_em };
};

module.exports = { rotacionarCcp };
