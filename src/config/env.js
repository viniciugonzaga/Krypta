require('dotenv').config();

// Falha rápido: servidor não sobe com configuração incompleta.
const obrigatorias = ['DATABASE_URL', 'JWT_SECRET', 'PASSWORD_PEPPER'];
const faltando = obrigatorias.filter((k) => !process.env[k] || process.env[k].trim() === '');
if (faltando.length > 0) {
  console.error(`Variáveis de ambiente ausentes: ${faltando.join(', ')}`);
  process.exit(1);
}

// Segredos: exige o formato gerado por randomBytes(32).toString('hex'). Barra placeholders.
for (const chave of ['JWT_SECRET', 'PASSWORD_PEPPER']) {
  if (!/^[0-9a-f]{64,}$/i.test(process.env[chave])) {
    console.error(`${chave} inválido: gere com crypto.randomBytes(32).toString("hex") (64+ caracteres hex).`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET === process.env.PASSWORD_PEPPER) {
  console.error('JWT_SECRET e PASSWORD_PEPPER devem ser valores diferentes.');
  process.exit(1);
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PASSWORD_PEPPER: process.env.PASSWORD_PEPPER,
  PORT: process.env.PORT || 3000,
};
