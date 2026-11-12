import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('krypta'),
  JWT_SECRET: z.string().min(20),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // E-mail
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('Krypta <no-reply@krypta.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;