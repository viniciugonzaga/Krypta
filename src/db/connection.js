const { Pool } = require('pg');
const { DATABASE_URL } = require('../config/env');

const pool = new Pool({ connectionString: DATABASE_URL });

// Teste rápido de conexão na inicialização.
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao ligar ao banco de dados:', err.message);
  } else {
    console.log('Ligação ao PostgreSQL efetuada com sucesso! Hora:', res.rows[0].now);
  }
});

module.exports = pool;
