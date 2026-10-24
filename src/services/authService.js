const nacl = require('tweetnacl');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const contaRepository = require('../repositories/contaRepository');
const nonceStore = require('../utils/nonceStore');
const { ErroDeNegocio, validarPublicKey } = require('./contaService');

const JWT_EXPIRES_IN = '15m';
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const ASSINATURA_BYTES = 64; // Ed25519

// Só ATIVA autentica por hardware. Os demais estados têm fluxos próprios.
function garantirContaAtiva(conta) {
  if (conta.status !== 'ATIVA') {
    throw new ErroDeNegocio(`Conta no estado ${conta.status}: login via hardware não permitido.`, 403);
  }
}

// Valida antes do tweetnacl, que lança exceção (500) com tamanho errado.
function decodificarAssinatura(assinaturaBase64) {
  if (typeof assinaturaBase64 !== 'string' || !BASE64_REGEX.test(assinaturaBase64)) {
    throw new ErroDeNegocio('assinatura inválida: esperado base64.', 400);
  }
  const bytes = Buffer.from(assinaturaBase64, 'base64');
  if (bytes.length !== ASSINATURA_BYTES) {
    throw new ErroDeNegocio('assinatura inválida: tamanho incompatível com Ed25519.', 400);
  }
  return bytes;
}

const gerarChallenge = async (publicKey) => {
  validarPublicKey(publicKey);

  const conta = await contaRepository.obterContaPorPublicKey(publicKey);
  if (!conta) {
    throw new ErroDeNegocio('Hardware não reconhecido.', 404);
  }
  garantirContaAtiva(conta);

  return { nonce: nonceStore.gerarNonce(publicKey) };
};

const verificarAssinatura = async (publicKey, assinaturaBase64) => {
  validarPublicKey(publicKey);
  const assinatura = decodificarAssinatura(assinaturaBase64);

  const conta = await contaRepository.obterContaPorPublicKey(publicKey);
  if (!conta) {
    throw new ErroDeNegocio('Hardware não reconhecido.', 404);
  }
  garantirContaAtiva(conta);

  // Consome o nonce (uso único) antes de verificar: tentativa falha também o queima.
  const nonce = nonceStore.consumirNonce(publicKey);
  if (!nonce) {
    throw new ErroDeNegocio('Nonce inválido ou expirado. Solicite um novo challenge.', 401);
  }

  // O hardware assina os BYTES do nonce (base64 decodificado), não a string.
  const mensagem = Buffer.from(nonce, 'base64');
  const chavePublica = Buffer.from(publicKey, 'base64');

  if (!nacl.sign.detached.verify(mensagem, assinatura, chavePublica)) {
    throw new ErroDeNegocio('Assinatura inválida.', 401);
  }

  // tipo: 'hardware' é o único escopo aceito nas rotas do cofre/backup.
  const token = jwt.sign(
    { contaId: conta.id, publicKey: conta.public_key, tipo: 'hardware' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN }
  );

  return { token };
};

module.exports = { gerarChallenge, verificarAssinatura };
