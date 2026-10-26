const bcrypt = require('bcrypt');
const contaRepository = require('../repositories/contaRepository');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BCRYPT_ROUNDS = 12;

class ErroDeNegocio extends Error {
  constructor(mensagem, statusCode) {
    super(mensagem);
    this.statusCode = statusCode;
  }
}

function validarEmail(email) {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    throw new ErroDeNegocio('email inválido ou ausente.', 400);
  }
}

// Senha do PORTAL (não abre o cofre): pode ser hasheada aqui com bcrypt.
function validarSenhaAdministrativa(senha) {
  if (typeof senha !== 'string' || senha.length < 8) {
    throw new ErroDeNegocio('senha_administrativa deve ter ao menos 8 caracteres.', 400);
  }
}

// Ed25519 em base64 (32 bytes -> 44 caracteres).
function validarPublicKey(publicKey) {
  if (typeof publicKey !== 'string' || publicKey.trim() === '') {
    throw new ErroDeNegocio('public_key é obrigatório.', 400);
  }
  if (
    publicKey.length !== 44 ||
    !BASE64_REGEX.test(publicKey) ||
    Buffer.from(publicKey, 'base64').length !== 32
  ) {
    throw new ErroDeNegocio('public_key inválida: esperado base64 de 32 bytes (Ed25519).', 400);
  }
}

// Prova derivada da CCP NO CLIENTE (32 bytes, base64). É checagem de formato:
// a CCP em texto claro nunca tem esse formato, então é barrada aqui (RN08).
// O servidor não consegue provar que a derivação foi feita com Argon2id.
function validarProvaContingencia(prova) {
  if (
    typeof prova !== 'string' ||
    prova.length !== 44 ||
    !BASE64_REGEX.test(prova) ||
    Buffer.from(prova, 'base64').length !== 32
  ) {
    throw new ErroDeNegocio(
      'prova_cont_dono inválida: esperado base64 de 32 bytes derivados da CCP no cliente (RN08).',
      400
    );
  }
}

function validarFormatoId(id) {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw new ErroDeNegocio('id inválido: formato incompatível com UUID.', 400);
  }
}

// Cadastro via WEB. Não envolve hardware.
const cadastrarConta = async ({ email, senhaAdministrativa }) => {
  validarEmail(email);
  validarSenhaAdministrativa(senhaAdministrativa);

  const existente = await contaRepository.obterContaPorEmail(email);
  if (existente) {
    throw new ErroDeNegocio('Já existe uma conta cadastrada com este email.', 409);
  }

  const senhaAdminHash = await bcrypt.hash(senhaAdministrativa, BCRYPT_ROUNDS);
  return contaRepository.criarConta({ email, senhaAdminHash });
};

// Pareamento via Desktop/Mobile. contaId vem do token admin_web, nunca do body.
const parearHardware = async ({ contaId, publicKey, provaContDono }) => {
  validarFormatoId(contaId);
  validarPublicKey(publicKey);
  validarProvaContingencia(provaContDono);

  const conta = await contaRepository.obterContaPorId(contaId);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  if (conta.status !== 'PENDENTE_PAREAMENTO') {
    throw new ErroDeNegocio(
      `Conta no estado ${conta.status}: pareamento só é permitido em contas pendentes.`,
      409
    );
  }

  const publicKeyExistente = await contaRepository.obterContaPorPublicKey(publicKey);
  if (publicKeyExistente) {
    throw new ErroDeNegocio('Este hardware já está vinculado a outra conta (RN01).', 409);
  }

  // Guarda bcrypt da prova: vazamento do banco não permite se autenticar.
  const hashContDono = await bcrypt.hash(provaContDono, BCRYPT_ROUNDS);

  const contaAtualizada = await contaRepository.parearHardware({ contaId, publicKey, hashContDono });
  if (!contaAtualizada) {
    // Corrida: o WHERE status = PENDENTE_PAREAMENTO do UPDATE pegou a mudança.
    throw new ErroDeNegocio('Conta não está mais pendente de pareamento.', 409);
  }
  return contaAtualizada;
};

// Uma conta só enxerga a si mesma. 403 antes de consultar o banco,
// para não revelar quais ids existem.
const buscarContaPorId = async (id, solicitanteId) => {
  validarFormatoId(id);
  if (id.toLowerCase() !== String(solicitanteId).toLowerCase()) {
    throw new ErroDeNegocio('Acesso negado a esta conta.', 403);
  }

  const conta = await contaRepository.obterContaPorId(id);
  if (!conta) {
    throw new ErroDeNegocio('Conta não encontrada.', 404);
  }
  return conta;
};

module.exports = {
  cadastrarConta,
  parearHardware,
  buscarContaPorId,
  validarPublicKey,
  validarProvaContingencia,
  ErroDeNegocio,
};
