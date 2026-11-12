const pool = require('../db/connection');

const ESTADOS_RESGATE = ['ATIVA', 'RECUPERACAO_LOCAL', 'RECUPERACAO_HARDWARE', 'REVOGADA'];

// Só para conferir a prova da CCH no Service. Nunca vai para a resposta HTTP.
const obterHashHerdeiro = async (contaId) => {
  const r = await pool.query('SELECT hash_cont_herdeiro FROM contas WHERE id = $1;', [contaId]);
  return r.rows[0] ? r.rows[0].hash_cont_herdeiro : null;
};

// Ativa, troca ou remove (novoHashHerdeiro = null) a CCH e grava o backup com o
// Envelope do Herdeiro atualizado, na MESMA transação: tudo ou nada.
// FOR UPDATE serializa com PUT /backup, Kill Switch, rotação da CCP e resgate.
// Retorna { resultado: 'OK' | 'SEM_CONTA' | 'ESTADO' | 'HASH_MUDOU' | 'VERSAO', ... }.
const definirHerdeiro = async ({ contaId, hashDonoAtual, novoHashHerdeiro, payload, versionCounter }) => {
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
    if (hashNoBanco !== hashDonoAtual) {
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
      'UPDATE contas SET hash_cont_herdeiro = $1, ultimo_sincronismo = CURRENT_TIMESTAMP WHERE id = $2;',
      [novoHashHerdeiro, contaId]
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

// Resgate pelo herdeiro, numa transação só: arquiva a chave do dono (ban permanente),
// vincula o dispositivo do herdeiro, leva a conta a RECUPERACAO_HARDWARE e CONSOME a CCH.
// hashHerdeiroVerificado é o hash que o Service conferiu: se mudou ou foi consumido
// no meio do caminho, nada acontece.
const resgatar = async ({ contaId, hashHerdeiroVerificado, publicKey }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const c = await client.query(
      'SELECT status, public_key, hash_cont_herdeiro FROM contas WHERE id = $1 FOR UPDATE;',
      [contaId]
    );
    if (c.rowCount === 0) {
      await client.query('ROLLBACK');
      return { resultado: 'SEM_CONTA' };
    }
    const conta = c.rows[0];

    if (!conta.hash_cont_herdeiro || conta.hash_cont_herdeiro !== hashHerdeiroVerificado) {
      await client.query('ROLLBACK');
      return { resultado: 'HERANCA_INDISPONIVEL' };
    }
    if (!ESTADOS_RESGATE.includes(conta.status)) {
      await client.query('ROLLBACK');
      return { resultado: 'ESTADO' };
    }
    // O dispositivo do herdeiro não pode ser o mesmo que está sendo revogado.
    if (publicKey === conta.public_key) {
      await client.query('ROLLBACK');
      return { resultado: 'CHAVE_EM_USO' };
    }
    const rev = await client.query('SELECT 1 FROM chaves_revogadas WHERE public_key = $1;', [publicKey]);
    if (rev.rowCount > 0) {
      await client.query('ROLLBACK');
      return { resultado: 'CHAVE_REVOGADA' };
    }

    if (conta.public_key) {
      await client.query(
        "INSERT INTO chaves_revogadas (public_key, conta_id, motivo) VALUES ($1, $2, 'KILL_SWITCH_HERDEIRO');",
        [conta.public_key, contaId]
      );
    }
    const u = await client.query(
      `UPDATE contas
       SET public_key = $1, status = 'RECUPERACAO_HARDWARE', hash_cont_herdeiro = NULL
       WHERE id = $2
       RETURNING id, public_key, status;`,
      [publicKey, contaId]
    );
    await client.query('COMMIT');
    return { resultado: 'OK', conta: u.rows[0] };
  } catch (erro) {
    await client.query('ROLLBACK');
    // 23505: public_key já vinculada a outra conta (RN01), pega pela UNIQUE do banco.
    if (erro.code === '23505') return { resultado: 'CHAVE_EM_USO' };
    throw erro;
  } finally {
    client.release();
  }
};

module.exports = { obterHashHerdeiro, definirHerdeiro, resgatar };
