import { randomUUID } from 'node:crypto';
import { createTransport } from 'nodemailer';
import { database, migrate, transaction } from './db.js';
import { passwordHash } from './domain.js';
import { buildApp } from './app.js';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + ' is required');
  return value;
}
function port(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(name + ' must be a valid port');
  return value;
}
const connectionString = required('DATABASE_URL');
try {
  if (!['postgres:', 'postgresql:'].includes(new URL(connectionString).protocol)) throw new Error();
} catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL; value withheld'); }
const pool = database(connectionString);
pool.on('error', () => console.error('Database connection failed'));
const command = process.argv[2];
try {
  if (command === 'migrate') {
    await migrate(pool);
    console.log('Migration 1 applied. No telemetry deleted.');
    await pool.end();
  } else if (command === 'admin') {
    const email = required('ADMIN_EMAIL').toLowerCase();
    const password = required('ADMIN_PASSWORD');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) throw new Error('Valid ADMIN_EMAIL and ADMIN_PASSWORD (12–128 characters) required');
    const encoded = await passwordHash(password);
    await transaction(pool, async client => {
      await client.query('LOCK TABLE users IN EXCLUSIVE MODE');
      if (Number((await client.query('SELECT count(*) FROM users')).rows[0].count) >= 10) throw new Error('Pilot account limit reached');
      await client.query("INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'admin')", [randomUUID(), email, encoded]);
    });
    console.log('Admin Pilot created. Existing accounts are never overwritten.');
    await pool.end();
  } else if (command === 'size') {
    console.table((await pool.query("SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size, pg_size_pretty(pg_total_relation_size('readings')) AS telemetry_with_indexes, (SELECT count(*) FROM readings) AS messages")).rows);
    await pool.end();
  } else {
    if (command) throw new Error('Unknown command');
    const origin = new URL(required('APP_ORIGIN'));
    const production = process.env.NODE_ENV === 'production';
    if (origin.href !== origin.origin + '/' || !['http:', 'https:'].includes(origin.protocol)) throw new Error('APP_ORIGIN must be an origin without a path');
    if (production && origin.protocol !== 'https:') throw new Error('Production requires HTTPS');
    if (!production && origin.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) throw new Error('HTTP is allowed only on loopback');
    const smtpHost = required('SMTP_HOST');
    const smtpPort = port('SMTP_PORT', 1025);
    const from = required('SMTP_FROM');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) throw new Error('SMTP_FROM must be an email address');
    if (!!process.env.SMTP_USER !== !!process.env.SMTP_PASS) throw new Error('SMTP_USER and SMTP_PASS must be set together');
    if (process.env.SMTP_SECURE && !['true', 'false'].includes(process.env.SMTP_SECURE)) throw new Error('SMTP_SECURE must be true or false');
    const transport = createTransport({
      host: smtpHost, port: smtpPort, secure: process.env.SMTP_SECURE === 'true',
      requireTLS: production && !['localhost', '127.0.0.1', 'mailbox'].includes(smtpHost),
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 5000,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS! } : undefined,
    });
    const app = await buildApp({ pool, origin: origin.origin, production, logger: true,
      sendInvite: async (email, token) => {
        await transport.sendMail({ from, to: email, subject: 'Undangan Pilot JagoFarm',
          text: 'Buka ' + origin.origin + '/#invite=' + token + '\nBerlaku 24 jam. Buat password untuk memverifikasi alamat email. Jangan bagikan tautan ini.',
        });
      },
    });
    await pool.query('SELECT version FROM schema_migrations WHERE version=1');
    await app.listen({ port: port('PORT', 3001), host: process.env.HOST ?? '127.0.0.1' });
    const shutdown = async () => { await app.close(); transport.close(); await pool.end(); };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }
} catch {
  console.error('Pilot startup/command failed. Check configuration, migration, database and account uniqueness. Secrets withheld.');
  await pool.end();
  process.exitCode = 1;
}
