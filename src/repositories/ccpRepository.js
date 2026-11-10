const pool = require('../db/connection');

// Rotação da CCP: troca o hash e grava o backup (com o novo Envelope da CCP) na MESMA
// transação. Se qualquer passo falhar, nada muda: o servidor nunca fica com uma prova
// que não corresponde ao envelope guardado no backup.
// FOR UPDATE serializa com PUT /backup, Kill Switch e outras rotações.
// Retorna { resultado: 'OK' | 'SEM_CONTA' | 'ESTADO' | 'HASH_MUDOU' | 'VERSAO', ... }.
const rotacionarCcp = async ({ contaId, hashAtual, novoHash, payload, versionCounter }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const c = await client.query(
      'SELECT status, hash_cont_dono FROM contas WHERE id = $1 FOR UPDATE;',
      [contaId]
    );
    if (c.rowCount === 0) {
      await client.query('ROLLBACK');
      return { resultado: 'SEM_CONTA' };
    }
    const { status, hash_cont_dono: hashNoBanco } = c.rows[0];
    if (status !== 'ATIVA') {
      await client.query('ROLLBACK');
      return { resultado: 'ESTADO', status };
    }
    // O hash que o Service conferiu precisa ser o mesmo que está no banco agora.
    if (hashNoBanco !== hashAtual) {
      await client.query('ROLLBACK');
      return { resultado: 'HASH_MUDOU' };
    }

    const r = await client.query(
      `INSERT INTO backups (conta_id, payload_cifrado, version_counter)
       VALUES ($1, $2, $3)
       ON CONFLICT (conta_id) DO UPDATE
         SET payload_cifrado = EXCLUDED.payload_cifrado,
             version_counter = EXCLUDED.version_counter,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE backups.version_counter < EXCLUDED.version_counter
       RETURNING version_counter, atualizado_em;`,
      [contaId, payload, versionCounter]
    );
    if (r.rowCount === 0) {
      await client.query('ROLLBACK');
      return { resultado: 'VERSAO' };
    }

    await client.query(
      'UPDATE contas SET hash_cont_dono = $1, ultimo_sincronismo = CURRENT_TIMESTAMP WHERE id = $2;',
      [novoHash, contaId]
    );
    await client.query('COMMIT');
    return { resultado: 'OK', ...r.rows[0] };
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
};

module.exports = { rotacionarCcp };
