import { randomUUID } from 'node:crypto';
import pg from 'pg';

export async function isolatedDatabase() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database');
  const control = new pg.Pool({ connectionString });
  const schema = 'migration_test_' + randomUUID().replaceAll('-', '');
  await control.query('CREATE SCHEMA ' + schema);
  const pool = new pg.Pool({ connectionString, options: '-c search_path=' + schema, max: 5 });
  return {
    pool,
    async cleanup() {
      await pool.end();
      await control.query('DROP SCHEMA ' + schema + ' CASCADE');
      await control.end();
    },
  };
}
