require('dotenv').config();

// Falha rápido: servidor não sobe com configuração incompleta.
const obrigatorias = ['DATABASE_URL', 'JWT_SECRET'];
const faltando = obrigatorias.filter((k) => !process.env[k] || process.env[k].trim() === '');

if (faltando.length > 0) {
  console.error(`Variáveis de ambiente ausentes: ${faltando.join(', ')}`);
  process.exit(1);
}

// Exige o formato gerado por randomBytes(32).toString('hex'): barra placeholders.
if (!/^[0-9a-f]{64,}$/i.test(process.env.JWT_SECRET)) {
  console.error('JWT_SECRET inválido: gere com crypto.randomBytes(32).toString("hex") (64+ caracteres hex).');
  process.exit(1);
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT || 3000,
};
