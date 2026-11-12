import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// ============ CORS ============
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// ============ BODY PARSER ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============ HEALTH ============
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Krypta API rodando', timestamp: new Date() });
});

// ============ ROTAS ============
app.use('/api', routes);

// ============ ERRO ============
app.use(errorHandler);

// ============ BOOT ============
async function bootstrap() {
  await testConnection();
  app.listen(env.PORT, () => {
    console.log('');
    console.log('  🛡️  KRYPTA API');
    console.log(`  🌐 http://localhost:${env.PORT}`);
    console.log(`  🗄️  MySQL: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    console.log(`  🔓 CORS: ${env.CORS_ORIGIN}`);
    console.log('');
  });
}

bootstrap().catch((err) => {
  console.error('❌ Falha ao iniciar:', err);
  process.exit(1);
});