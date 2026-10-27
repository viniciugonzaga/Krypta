const express = require('express');
const contaRoutes = require('./routes/contaRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const authRoutes = require('./routes/authRoutes');
const backupRoutes = require('./routes/backupRoutes');
const contingenciaRoutes = require('./routes/contingenciaRoutes');
const { naoEncontrado, erroGlobal } = require('./middlewares/errorHandler');

const app = express();

// 2 MB cobre o payload de 1 MB após a inflação de ~33% do base64.
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor Krypta operando!' });
});

app.use('/', contaRoutes);
app.use('/', hardwareRoutes);
app.use('/', authRoutes);
app.use('/', backupRoutes);
app.use('/', contingenciaRoutes);

// Sempre por último.
app.use(naoEncontrado);
app.use(erroGlobal);

module.exports = app;
