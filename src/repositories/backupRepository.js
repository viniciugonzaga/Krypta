const pool = require('../db/connection');

// Estado e versão checados DENTRO da transação, com a linha da conta travada
// (FOR UPDATE): um Kill Switch concorrente não deixa passar upload em conta revogada.
// Anti-rollback no SQL: só grava se a versão nova for ESTRITAMENTE maior.
// Retorna { resultado: 'OK' | 'SEM_CONTA' | 'ESTADO' | 'VERSAO', ... }.
const salvarBackup = async ({ contaId, payload, versionCounter, statusPermitidos }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const c = await client.query('SELECT status FROM contas WHERE id = $1 FOR UPDATE;', [contaId]);
    if (c.rowCount === 0) {
      await client.query('ROLLBACK');
      return { resultado: 'SEM_CONTA' };
    }
    const status = c.rows[0].status;
    if (!statusPermitidos.includes(status)) {
      await client.query('ROLLBACK');
      return { resultado: 'ESTADO', status };
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

    // Gatilho do TTL (RN11), na mesma transação do backup.
    await client.query(
      'UPDATE contas SET ultimo_sincronismo = CURRENT_TIMESTAMP WHERE id = $1;',
      [contaId]
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

const obterBackupPorContaId = async (contaId) => {
  const r = await pool.query(
    'SELECT payload_cifrado, version_counter, atualizado_em FROM backups WHERE conta_id = $1;',
    [contaId]
  );
  return r.rows[0] || null;
};

module.exports = { salvarBackup, obterBackupPorContaId };
