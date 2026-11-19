// server/src/app.ts
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, corsOrigins } from './config/env.js';
import { testConnection } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

// ============ PROXY ============
// Atrás de proxy reverso (Hostinger) o req.ip seria o IP do proxy e todos
// os usuários dividiriam o mesmo limite de tentativas. TRUST_PROXY = nº de
// proxies confiáveis. Valor errado permite forjar o IP: local fica 0.
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

// ============ SEGURANÇA ============
// Headers de segurança e remoção do X-Powered-By.
app.use(
  helmet({
    // Permite que o front (outro domínio) carregue imagens/arquivos da API
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ============ CORS ============
// Só as origens do .env (CORS_ORIGIN, separadas por vírgula).
// Requisições sem Origin (app desktop/mobile nativo, curl, simulador)
// não passam pelo CORS do navegador e seguem normalmente.
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

// ============ BODY PARSER ============
// 2 MB cobre o backup de 1 MB depois da inflação de ~33% do base64.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ============ HEALTH ============
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Krypta API rodando', timestamp: new Date() });
});

// ============ ROTAS ============
app.use('/api', routes);

// ============ 404 + ERRO (sempre por último) ============
app.use(notFoundHandler);
app.use(errorHandler);

// ============ BOOT ============
async function bootstrap() {
  await testConnection();
  app.listen(env.PORT, () => {
    console.log('');
    console.log('  🛡️  KRYPTA API');
    console.log(`  🌐 http://localhost:${env.PORT}`);
    console.log(`  🗄️  MySQL: ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    console.log(`  🔓 CORS: ${corsOrigins.join(', ')}`);
    console.log(`  🔐 Cofre: pareamento + login por hardware ativos`);
    console.log('');
  });
}

bootstrap().catch((err) => {
  console.error('❌ Falha ao iniciar:', err);
  process.exit(1);
});

export default app;
