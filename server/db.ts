import { readdir, readFile } from 'node:fs/promises';
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
  const directory = new URL('./migrations/', import.meta.url);
  const migrations = (await readdir(directory))
    .filter(file => /^\d+_[\w-]+\.sql$/.test(file))
    .map(file => ({ file, version: Number(file.slice(0, file.indexOf('_'))) }))
    .sort((a, b) => a.version - b.version || a.file.localeCompare(b.file));

  for (const migration of migrations) {
    const sql = await readFile(new URL(migration.file, directory), 'utf8');
    await transaction(pool, async client => {
      await client.query('SELECT pg_advisory_xact_lock(90260909)');
      await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY)');
      const applied = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', [migration.version]);
      if (applied.rowCount) return;
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT DO NOTHING', [migration.version]);
    });
  }
}
