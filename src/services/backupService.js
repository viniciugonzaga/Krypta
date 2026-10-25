const contaRepository = require('../repositories/contaRepository');
const backupRepository = require('../repositories/backupRepository');
const { ErroDeNegocio } = require('./contaService');

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_VERSION = 2147483647; // limite do INTEGER do Postgres
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB decodificado

// O token vale 15 min; o status real vem do banco a cada requisição,
// para que uma conta revogada nesse intervalo pare de sincronizar.
async function obterContaDoToken(contaId) {
  const conta = await contaRepository.obterContaPorId(contaId);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  return conta;
}

const enviarBackup = async ({ contaId, versionCounter, payloadBase64 }) => {
  if (!Number.isInteger(versionCounter) || versionCounter < 1 || versionCounter > MAX_VERSION) {
    throw new ErroDeNegocio('version_counter deve ser um inteiro entre 1 e 2147483647.', 400);
  }
  if (typeof payloadBase64 !== 'string' || payloadBase64.length === 0 || !BASE64_REGEX.test(payloadBase64)) {
    throw new ErroDeNegocio('payload_cifrado deve ser uma string base64 não vazia.', 400);
  }
  const payload = Buffer.from(payloadBase64, 'base64');
  if (payload.length === 0 || payload.length > MAX_PAYLOAD_BYTES) {
    throw new ErroDeNegocio('payload_cifrado fora do tamanho permitido (1 byte a 1 MB).', 400);
  }

  const conta = await obterContaDoToken(contaId);
  if (conta.status !== 'ATIVA') {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: sincronização não permitida.`, 403);
  }

  const salvo = await backupRepository.salvarBackup({ contaId, payload, versionCounter });
  if (!salvo) {
    throw new ErroDeNegocio('version_counter igual ou inferior ao armazenado (anti-rollback).', 409);
  }
  return { version_counter: salvo.version_counter, atualizado_em: salvo.atualizado_em };
};

// RN04: em ATIVA o hardware é a fonte da verdade, então o download é proibido.
// O ramo liberado só será alcançável quando os fluxos de recuperação existirem.
const baixarBackup = async ({ contaId }) => {
  const conta = await obterContaDoToken(contaId);
  const estadosLiberados = ['RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'];
  if (!estadosLiberados.includes(conta.status)) {
    throw new ErroDeNegocio('Download do backup não permitido neste estado da conta.', 403);
  }

  const backup = await backupRepository.obterBackupPorContaId(contaId);
  if (!backup) {
    throw new ErroDeNegocio('Nenhum backup encontrado.', 404);
  }
  return {
    payload_cifrado: backup.payload_cifrado.toString('base64'),
    version_counter: backup.version_counter,
    atualizado_em: backup.atualizado_em,
  };
};

module.exports = { enviarBackup, baixarBackup };
