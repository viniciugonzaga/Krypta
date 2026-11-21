// server/src/config/env.ts
// Lê e valida o .env na inicialização. Se faltar algo obrigatório,
// o servidor nem sobe — melhor falhar cedo do que rodar inseguro.
import 'dotenv/config';
import { z } from 'zod';

const HEX_64 = /^[0-9a-f]{64,}$/i;

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3333),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // ============ BANCO (MySQL / MariaDB) ============
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().default(3306),
    DB_USER: z.string().default('root'),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().default('krypta'),

    // ============ TOKENS ============
    JWT_SECRET: z.string().min(20),
    JWT_EXPIRES_IN: z.string().default('24h'), // token do portal (admin_web)
    REFRESH_EXPIRES_IN_DAYS: z.coerce.number().default(7),
    HARDWARE_TOKEN_EXPIRES_IN: z.string().default('15m'), // token do dispositivo

    // ============ COFRE (API zero-knowledge) ============
    // Segredo do servidor aplicado antes do bcrypt nas provas da CCP/CCH.
    // Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    // FAÇA BACKUP FORA DO BANCO: perdê-lo invalida todas as provas de contingência.
    PASSWORD_PEPPER: z
      .string()
      .regex(HEX_64, 'PASSWORD_PEPPER deve ter 64+ caracteres hexadecimais (gere com crypto.randomBytes(32))'),

    // ============ REDE ============
    // Várias origens separadas por vírgula. Ex. em produção:
    // CORS_ORIGIN=https://app.seudominio.com.br,tauri://localhost
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    // Nº de proxies confiáveis à frente da API (Hostinger usa 1). 0 = nenhum.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Só desenvolvimento: multiplica os limites de tentativas (ignorado em produção).
    RATE_LIMIT_MULT: z.coerce.number().min(1).default(1),

    // ============ E-MAIL ============
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    MAIL_FROM: z.string().default('Krypta <no-reply@krypta.local>'),
    // Fora de produção, se preenchido, SÓ estes endereços recebem e-mail
    // (separados por vírgula). Evita mandar e-mail para contas de teste.
    SMTP_ONLY_TO: z.string().default(''),
    // Quem recebe as mensagens do formulário de Contato (vazio = o endereço do MAIL_FROM)
    SUPPORT_EMAIL: z.string().default(''),

    // ============ LOGIN SOCIAL (opcional) ============
    GOOGLE_CLIENT_ID: z.string().default(''),
  })
  .refine((e: { PASSWORD_PEPPER: string; JWT_SECRET: string }) => e.PASSWORD_PEPPER !== e.JWT_SECRET, {
    message: 'JWT_SECRET e PASSWORD_PEPPER devem ser valores diferentes.',
    path: ['PASSWORD_PEPPER'],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

/**
 * Origens do app desktop (Tauri). Só existem dentro do Krypta instalado:
 * nenhum site da internet consegue ter essas origens.
 *   Windows: http://tauri.localhost   ·   macOS/Linux: tauri://localhost
 */
const ORIGENS_DESKTOP = ['http://tauri.localhost', 'https://tauri.localhost', 'tauri://localhost'];

/** Lista de origens liberadas no CORS (as do .env + as do app desktop) */
export const corsOrigins = [
  ...new Set([
    ...env.CORS_ORIGIN.split(',')
      .map((o: string) => o.trim())
      .filter(Boolean),
    ...ORIGENS_DESKTOP,
  ]),
];

export const isProduction = env.NODE_ENV === 'production';

/** Endereços liberados para receber e-mail fora de produção (vazio = todos) */
export const smtpOnlyTo = env.SMTP_ONLY_TO.split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);
