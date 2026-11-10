import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const isNeonConfigured = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')
);

/**
 * Returns a Neon HTTP Drizzle client ideal for single-trip serverless queries on Vercel.
 */
export function getNeonHttpDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Configure Neon Postgres connection string.');
  }
  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

/**
 * Returns a Neon WebSocket Pool for interactive ACID transactions (e.g. FOR UPDATE strike locking).
 */
let globalPool: Pool | null = null;
export function getNeonPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Configure Neon Postgres connection string.');
  }
  if (!globalPool) {
    globalPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return globalPool;
}
