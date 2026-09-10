import { readFile } from 'node:fs/promises';
import pg from 'pg';

export function database(connectionString: string) {
  return new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
}
export async function transaction<Result>(pool: pg.Pool, run: (client: pg.PoolClient) => Promise<Result>) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function migrate(pool: pg.Pool) {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await transaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(90260909)');
    await client.query(sql);
  });
}
