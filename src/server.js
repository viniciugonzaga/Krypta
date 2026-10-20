const app = require('./app.js');
require('./db/connection.js');
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});