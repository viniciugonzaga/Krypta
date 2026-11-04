// env primeiro: valida a configuração antes de carregar o resto.
const { PORT } = require('./config/env');
const app = require('./app');
const ttlJob = require('./jobs/ttlJob');

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  ttlJob.iniciar();
});
