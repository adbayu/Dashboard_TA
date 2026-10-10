import { readFile, readdir } from 'node:fs/promises';
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

export function migrationVersion(filename: string) {
  const match = /^(\d{3})_[a-z0-9_]+\.sql$/.exec(filename);
  if (!match) throw new Error('Invalid migration filename: ' + filename);
  return Number(match[1]);
}

export function orderedMigrationFiles(entries: string[]) {
  const files = entries
    .filter(name => name.endsWith('.sql'))
    .map(name => ({ name, version: migrationVersion(name) }))
    .sort((a, b) => a.version - b.version);
  if (files.length && files[0].version !== 1) throw new Error('Migration sequence must start at version 001');
  for (let index = 1; index < files.length; index++) {
    if (files[index - 1].version === files[index].version) throw new Error('Duplicate migration version: ' + files[index].version);
    if (files[index].version !== files[index - 1].version + 1) throw new Error('Missing migration before version ' + files[index].version);
  }
  return files;
}

export async function migrations() {
  const directory = new URL('./migrations/', import.meta.url);
  const files = orderedMigrationFiles(await readdir(directory));
  return Promise.all(files.map(async file => ({ ...file, sql: await readFile(new URL(file.name, directory), 'utf8') })));
}

const pilotTables = ['users', 'sessions', 'devices', 'ownerships', 'readings'];
async function existingPilotTables(client: pg.PoolClient) {
  const result = await client.query<{ table_name: string }>(
    'SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=ANY($1::text[])',
    [pilotTables],
  );
  return result.rows.map(row => row.table_name);
}

function validateMigrationHistory(versions: number[], latestKnownVersion: number) {
  for (let index = 0; index < versions.length; index++) {
    if (versions[index] !== index + 1) throw new Error('Migration history is not a contiguous prefix; refusing to proceed');
  }
  if ((versions.at(-1) ?? 0) > latestKnownVersion) throw new Error('Database migration history is newer than available migrations');
}

export async function migrate(pool: pg.Pool) {
  const files = await migrations();
  if (!files.length) throw new Error('No numbered database migrations found');
  const latestKnownVersion = files.at(-1)!.version;
  const newlyApplied: number[] = [];
  for (const file of files) {
    let wasApplied = false;
    await transaction(pool, async client => {
      await client.query('SELECT pg_advisory_xact_lock(90260909)');
      const history = await client.query<{ exists: boolean }>("SELECT to_regclass('schema_migrations') IS NOT NULL AS exists");
      const hasHistory = history.rows[0].exists;
      const pilotTablesPresent = await existingPilotTables(client);
      if (!hasHistory && pilotTablesPresent.length) {
        throw new Error('Existing Pilot tables have no migration history; validate the v1 baseline before migrating');
      }
      const historyRows = hasHistory
        ? await client.query('SELECT version FROM schema_migrations ORDER BY version')
        : { rows: [] as Array<{ version: number }> };
      const versions = historyRows.rows.map(row => Number(row.version));
      validateMigrationHistory(versions, latestKnownVersion);
      if (!versions.length && pilotTablesPresent.length) {
        throw new Error('Existing Pilot tables have no version 1 record; validate the v1 baseline before migrating');
      }
      if (versions.includes(file.version)) return;
      const currentVersion = versions.at(-1) ?? 0;
      if (file.version !== currentVersion + 1) throw new Error('Cannot apply migration ' + file.version + ' after version ' + currentVersion);
      await client.query(file.sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [file.version]);
      wasApplied = true;
    });
    if (wasApplied) newlyApplied.push(file.version);
  }
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const current = result.rows.map(row => Number(row.version));
  validateMigrationHistory(current, latestKnownVersion);
  return { applied: newlyApplied, current };
}
