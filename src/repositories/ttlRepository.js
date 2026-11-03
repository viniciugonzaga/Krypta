const pool = require('../db/connection');

// Datas sempre calculadas no SQL. O sincronismo vai e volta como TEXTO: passar por
// Date do JS perde microssegundos e quebraria a igualdade com a coluna.

// Contas já dentro da janela de aviso (faltam <= diasAviso para o prazo).
const listarCandidatas = async ({ diasPrazo, diasAviso }) => {
  const r = await pool.query(
    `SELECT c.id,
            c.email,
            c.ultimo_sincronismo::text AS sincronismo_ref,
            FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.ultimo_sincronismo)) / 86400)::int AS dias_inativos,
            COALESCE(array_agg(a.nivel) FILTER (WHERE a.nivel IS NOT NULL), '{}') AS niveis_enviados
     FROM contas c
     LEFT JOIN avisos_ttl a
       ON a.conta_id = c.id AND a.sincronismo_ref = c.ultimo_sincronismo
     WHERE c.ultimo_sincronismo < CURRENT_TIMESTAMP - make_interval(days => $1::int - $2::int)
     GROUP BY c.id;`,
    [diasPrazo, diasAviso]
  );
  return r.rows;
};

// Só registra se o sincronismo ainda for o mesmo da leitura (usuário não renovou no meio).
const registrarAviso = async ({ contaId, nivel, sincronismoRef }) => {
  const r = await pool.query(
    `INSERT INTO avisos_ttl (conta_id, nivel, sincronismo_ref)
     SELECT id, $2::varchar, ultimo_sincronismo FROM contas
     WHERE id = $1 AND ultimo_sincronismo = $3::timestamp
     ON CONFLICT (conta_id, nivel, sincronismo_ref) DO NOTHING
     RETURNING id;`,
    [contaId, nivel, sincronismoRef]
  );
  return r.rowCount > 0;
};

// Um único DELETE que revalida tudo: prazo vencido E aviso H48 registrado há mais de
// 48h para o MESMO sincronismo. CASCADE apaga backups e avisos. Os hashes de contingência
// moram na própria linha da conta e saem junto.
const excluirExpiradas = async ({ diasPrazo }) => {
  const r = await pool.query(
    `DELETE FROM contas c
     WHERE c.ultimo_sincronismo < CURRENT_TIMESTAMP - make_interval(days => $1::int)
       AND EXISTS (
         SELECT 1 FROM avisos_ttl a
         WHERE a.conta_id = c.id
           AND a.nivel = 'H48'
           AND a.sincronismo_ref = c.ultimo_sincronismo
           AND a.enviado_em <= CURRENT_TIMESTAMP - INTERVAL '48 hours'
       )
     RETURNING c.id;`,
    [diasPrazo]
  );
  return r.rows.map((x) => x.id);
};

// Login por hardware prova que o dono segue ativo.
const renovarPrazo = async (contaId) => {
  await pool.query('UPDATE contas SET ultimo_sincronismo = CURRENT_TIMESTAMP WHERE id = $1;', [contaId]);
};

module.exports = { listarCandidatas, registrarAviso, excluirExpiradas, renovarPrazo };
