// env primeiro: valida a configuração antes de carregar o resto.
const { PORT } = require('./config/env');
const app = require('./app');

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
