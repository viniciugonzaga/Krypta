import * as mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  charset: 'utf8mb4_unicode_ci',
});

// Testa conexão ao iniciar
export async function testConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`✅ Conectado ao MySQL — ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  } catch (err) {
    console.error('❌ Falha ao conectar no MySQL. Verifique o XAMPP e as credenciais no .env');
    console.error(err);
    process.exit(1);
  }
}

// Helper de query
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}