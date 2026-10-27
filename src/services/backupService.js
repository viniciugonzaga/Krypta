const contaRepository = require('../repositories/contaRepository');
const backupRepository = require('../repositories/backupRepository');
const { ErroDeNegocio } = require('./contaService');

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_VERSION = 2147483647; // limite do INTEGER do Postgres
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB decodificado

// Upload: ATIVA (sync normal) e RECUPERACAO_LOCAL (novo envelope da senha mestre).
const ESTADOS_ESCRITA = ['ATIVA', 'RECUPERACAO_LOCAL'];
// Download: só em recuperação. Em ATIVA o hardware é a fonte da verdade (RN04).
const ESTADOS_DOWNLOAD = ['RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE'];

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

  const r = await backupRepository.salvarBackup({
    contaId,
    payload,
    versionCounter,
    statusPermitidos: ESTADOS_ESCRITA,
  });

  if (r.resultado === 'SEM_CONTA') {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (r.resultado === 'ESTADO') {
    throw new ErroDeNegocio(`Conta no estado ${r.status}: sincronização não permitida.`, 403);
  }
  if (r.resultado === 'VERSAO') {
    throw new ErroDeNegocio('version_counter igual ou inferior ao armazenado (anti-rollback).', 409);
  }
  return { version_counter: r.version_counter, atualizado_em: r.atualizado_em };
};

const baixarBackup = async ({ contaId }) => {
  // O token vale 15 min; o status real vem do banco a cada requisição.
  const conta = await contaRepository.obterContaPorId(contaId);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (!ESTADOS_DOWNLOAD.includes(conta.status)) {
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
