CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  invite_hash text UNIQUE,
  invite_expires timestamptz
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  model text NOT NULL CHECK (model IN ('water-v1', 'environment-v1')),
  credential_hash text NOT NULL UNIQUE,
  credential_since timestamptz NOT NULL DEFAULT clock_timestamp(),
  allocated_to uuid NOT NULL REFERENCES users(id),
  activation_hash text UNIQUE,
  activation_expires timestamptz
);
CREATE TABLE IF NOT EXISTS ownerships (
  id uuid PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id),
  user_id uuid NOT NULL REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  ended_at timestamptz,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_device_owner ON ownerships(device_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS owner_devices ON ownerships(user_id, device_id);
CREATE TABLE IF NOT EXISTS readings (
  device_id uuid NOT NULL REFERENCES devices(id),
  message_id uuid NOT NULL,
  ownership_id uuid NOT NULL REFERENCES ownerships(id),
  measured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  readings jsonb NOT NULL,
  PRIMARY KEY (device_id, message_id)
);
CREATE INDEX IF NOT EXISTS reading_history ON readings(ownership_id, measured_at DESC, message_id DESC);
CREATE INDEX IF NOT EXISTS reading_received ON readings(ownership_id, received_at DESC);
INSERT INTO schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
