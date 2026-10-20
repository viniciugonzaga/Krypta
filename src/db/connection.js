const { Pool } = require('pg');
require('dotenv').config(); // Carrega as variáveis secretas do .env

// O Pool gere as ligações ao banco de dados de forma eficiente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Um teste rápido para verificar se a ligação funciona
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao ligar ao banco de dados:', err.stack);
  } else {
    console.log('Ligação ao PostgreSQL efetuada com sucesso! Hora:', res.rows[0].now);
  }
});

module.exports = pool;