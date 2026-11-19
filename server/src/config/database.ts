// server/src/config/database.ts
import * as mysql from 'mysql2/promise';
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';
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

// ------------------------------------------------------------
// SELECT → lista de linhas
// ------------------------------------------------------------
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

// ------------------------------------------------------------
// INSERT / UPDATE / DELETE → affectedRows, insertId...
// (MySQL não tem RETURNING como o PostgreSQL: usamos affectedRows
// para saber se o UPDATE condicional aplicou e depois um SELECT.)
// ------------------------------------------------------------
export async function execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as ResultSetHeader;
}

// ------------------------------------------------------------
// TRANSAÇÕES
// Tudo dentro de fn roda numa conexão só. Se fn lançar erro,
// nada é gravado (ROLLBACK). Use com SELECT ... FOR UPDATE para
// travar a linha da conta enquanto a operação acontece.
// ------------------------------------------------------------
export type Tx = {
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  execute: (sql: string, params?: any[]) => Promise<ResultSetHeader>;
};

export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const conn: PoolConnection = await pool.getConnection();
  const tx: Tx = {
    query: async <R = any>(sql: string, params?: any[]) => {
      const [rows] = await conn.execute(sql, params);
      return rows as R[];
    },
    execute: async (sql: string, params?: any[]) => {
      const [result] = await conn.execute(sql, params);
      return result as ResultSetHeader;
    },
  };

  try {
    await conn.beginTransaction();
    const result = await fn(tx);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Erro de UNIQUE duplicado no MySQL (equivale ao 23505 do PostgreSQL) */
export function isDuplicateError(err: unknown): boolean {
  return (err as { code?: string })?.code === 'ER_DUP_ENTRY';
}
