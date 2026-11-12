const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const contaRoutes = require('./routes/contaRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const authRoutes = require('./routes/authRoutes');
const backupRoutes = require('./routes/backupRoutes');
const contingenciaRoutes = require('./routes/contingenciaRoutes');
const herancaRoutes = require('./routes/herancaRoutes');
const { naoEncontrado, erroGlobal } = require('./middlewares/errorHandler');

const app = express();

// Atrás de proxy reverso o req.ip seria o IP do proxy e todos os clientes dividiriam o
// mesmo limite. TRUST_PROXY = nº de proxies confiáveis à frente da API. Valor errado
// permite forjar X-Forwarded-For e fugir do rate limit: só configure se houver proxy.
const proxies = Number.parseInt(process.env.TRUST_PROXY, 10);
if (proxies > 0) app.set('trust proxy', proxies);

// Headers de segurança e remoção do X-Powered-By.
app.use(helmet());

// CORS só para o portal web. Desktop e Mobile não são navegadores e não passam por aqui.
// Sem CORS_ORIGINS, nenhuma origem de navegador é liberada.
const origens = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: origens.length > 0 ? origens : false,
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

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
app.use('/', herancaRoutes);

// Sempre por último.
app.use(naoEncontrado);
app.use(erroGlobal);

module.exports = app;
