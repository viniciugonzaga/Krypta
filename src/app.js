const express = require('express');
const contaRoutes = require('./routes/contaRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Servidor Krypta operando!' });
});

app.use('/', contaRoutes);
app.use('/', hardwareRoutes);
app.use('/', authRoutes);

module.exports = app;
