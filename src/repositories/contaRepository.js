const pool = require('../db/connection');

// Repository: só SQL. Sem validação, sem regra de negócio, sem HTTP.

// Cadastro via WEB: só email + senha administrativa. Conta nasce
// PENDENTE_PAREAMENTO — sem hardware ainda (RF01/Módulo 7).
const criarConta = async ({ email, senhaAdminHash }) => {
  const query = `
    INSERT INTO contas (email, senha_admin_hash)
    VALUES ($1, $2)
    RETURNING id, email, status, criado_em;
  `;
  const resultado = await pool.query(query, [email, senhaAdminHash]);
  return resultado.rows[0];
};

// Pareamento via Desktop/Mobile: preenche public_key + hash_cont_dono
// e promove PENDENTE_PAREAMENTO -> ATIVA. Só funciona se a conta
// ainda estiver pendente (WHERE status = ...) — trava atômica contra
// re-pareamento acidental de conta já ativa.
const parearHardware = async ({ contaId, publicKey, hashContDono }) => {
  const query = `
    UPDATE contas
    SET public_key = $1, hash_cont_dono = $2, status = 'ATIVA', ultimo_sincronismo = CURRENT_TIMESTAMP
    WHERE id = $3 AND status = 'PENDENTE_PAREAMENTO'
    RETURNING id, email, public_key, status, ultimo_sincronismo, criado_em;
  `;
  const resultado = await pool.query(query, [publicKey, hashContDono, contaId]);
  return resultado.rows[0] || null;
};

const obterContaPorId = async (id) => {
  const query = `
    SELECT id, email, public_key, status, ultimo_sincronismo, criado_em
    FROM contas WHERE id = $1;
  `;
  const resultado = await pool.query(query, [id]);
  return resultado.rows[0] || null;
};

const obterContaPorEmail = async (email) => {
  const query = `
    SELECT id, email, public_key, status, senha_admin_hash, criado_em
    FROM contas WHERE email = $1;
  `;
  const resultado = await pool.query(query, [email]);
  return resultado.rows[0] || null;
};

// Usado no Challenge-Response: identifica a conta pela public_key
// que o hardware apresenta.
const obterContaPorPublicKey = async (publicKey) => {
  const query = `
    SELECT id, email, public_key, status
    FROM contas WHERE public_key = $1;
  `;
  const resultado = await pool.query(query, [publicKey]);
  return resultado.rows[0] || null;
};

module.exports = {
  criarConta,
  parearHardware,
  obterContaPorId,
  obterContaPorEmail,
  obterContaPorPublicKey,
};
