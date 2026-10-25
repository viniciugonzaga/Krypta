const pool = require('../db/connection');

// Upsert com guarda anti-rollback no próprio SQL: só grava se a versão nova
// for ESTRITAMENTE maior que a armazenada. Retorna null se foi rejeitado.
// Atualiza ultimo_sincronismo (gatilho do TTL, RN11) na mesma transação.
const salvarBackup = async ({ contaId, payload, versionCounter }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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
      return null;
    }

    await client.query(
      'UPDATE contas SET ultimo_sincronismo = CURRENT_TIMESTAMP WHERE id = $1;',
      [contaId]
    );
    await client.query('COMMIT');
    return r.rows[0];
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
};

const obterBackupPorContaId = async (contaId) => {
  const r = await pool.query(
    'SELECT payload_cifrado, version_counter, atualizado_em FROM backups WHERE conta_id = $1;',
    [contaId]
  );
  return r.rows[0] || null;
};

module.exports = { salvarBackup, obterBackupPorContaId };
