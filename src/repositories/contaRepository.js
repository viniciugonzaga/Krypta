const pool = require('../db/connection');

// Repository: só SQL. Sem validação, sem regra de negócio, sem HTTP.
// Nenhuma consulta devolve hash_cont_dono nem senha_admin_hash, exceto as
// funções dedicadas à verificação de credencial (obterHashContDono, obterContaPorEmail).

// Cadastro via WEB: só email + senha administrativa. Conta nasce PENDENTE_PAREAMENTO.
const criarConta = async ({ email, senhaAdminHash }) => {
  const r = await pool.query(
    `INSERT INTO contas (email, senha_admin_hash)
     VALUES ($1, $2)
     RETURNING id, email, status, criado_em;`,
    [email, senhaAdminHash]
  );
  return r.rows[0];
};

// Primeiro pareamento: PENDENTE_PAREAMENTO -> ATIVA. O WHERE status trava re-pareamento.
const parearHardware = async ({ contaId, publicKey, hashContDono }) => {
  const r = await pool.query(
    `UPDATE contas
     SET public_key = $1, hash_cont_dono = $2, status = 'ATIVA', ultimo_sincronismo = CURRENT_TIMESTAMP
     WHERE id = $3 AND status = 'PENDENTE_PAREAMENTO'
     RETURNING id, email, public_key, status, ultimo_sincronismo, criado_em;`,
    [publicKey, hashContDono, contaId]
  );
  return r.rows[0] || null;
};

const obterContaPorId = async (id) => {
  const r = await pool.query(
    `SELECT id, email, public_key, status, ultimo_sincronismo, criado_em
     FROM contas WHERE id = $1;`,
    [id]
  );
  return r.rows[0] || null;
};

const obterContaPorEmail = async (email) => {
  const r = await pool.query(
    `SELECT id, email, public_key, status, senha_admin_hash, criado_em
     FROM contas WHERE email = $1;`,
    [email]
  );
  return r.rows[0] || null;
};

const obterContaPorPublicKey = async (publicKey) => {
  const r = await pool.query(
    'SELECT id, email, public_key, status FROM contas WHERE public_key = $1;',
    [publicKey]
  );
  return r.rows[0] || null;
};

// Só para conferir a prova da CCP no Service. Nunca vai para a resposta HTTP.
const obterHashContDono = async (contaId) => {
  const r = await pool.query('SELECT hash_cont_dono FROM contas WHERE id = $1;', [contaId]);
  return r.rows[0] ? r.rows[0].hash_cont_dono : null;
};

// Transição atômica: só aplica se o estado atual estiver em "de".
const transicionarEstado = async ({ contaId, de, para }) => {
  const r = await pool.query(
    `UPDATE contas SET status = $1
     WHERE id = $2 AND status = ANY($3::text[])
     RETURNING id, email, public_key, status, ultimo_sincronismo, criado_em;`,
    [para, contaId, de]
  );
  return r.rows[0] || null;
};

const chaveRevogada = async (publicKey) => {
  const r = await pool.query('SELECT 1 FROM chaves_revogadas WHERE public_key = $1;', [publicKey]);
  return r.rowCount > 0;
};

// Kill Switch: arquiva a public_key (ban permanente) e revoga, numa transação só.
// FOR UPDATE serializa com PUT /backup e com outras transições.
const revogarConta = async ({ contaId, motivo, estadosPermitidos }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c = await client.query(
      'SELECT public_key, status FROM contas WHERE id = $1 FOR UPDATE;',
      [contaId]
    );
    const conta = c.rows[0];
    if (!conta || !conta.public_key || !estadosPermitidos.includes(conta.status)) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      'INSERT INTO chaves_revogadas (public_key, conta_id, motivo) VALUES ($1, $2, $3);',
      [conta.public_key, contaId, motivo]
    );
    const u = await client.query(
      `UPDATE contas SET status = 'REVOGADA', public_key = NULL
       WHERE id = $1
       RETURNING id, email, public_key, status, ultimo_sincronismo, criado_em;`,
      [contaId]
    );
    await client.query('COMMIT');
    return u.rows[0];
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
};

// Recuperação de hardware: novo dispositivo numa conta REVOGADA.
const parearNovoHardware = async ({ contaId, publicKey }) => {
  try {
    const r = await pool.query(
      `UPDATE contas SET public_key = $1, status = 'RECUPERACAO_HARDWARE'
       WHERE id = $2 AND status = 'REVOGADA'
       RETURNING id, email, public_key, status, ultimo_sincronismo, criado_em;`,
      [publicKey, contaId]
    );
    return r.rows[0] || null;
  } catch (erro) {
    if (erro.code === '23505') return null; // corrida: public_key já vinculada a outra conta
    throw erro;
  }
};

module.exports = {
  criarConta,
  parearHardware,
  obterContaPorId,
  obterContaPorEmail,
  obterContaPorPublicKey,
  obterHashContDono,
  transicionarEstado,
  chaveRevogada,
  revogarConta,
  parearNovoHardware,
};
