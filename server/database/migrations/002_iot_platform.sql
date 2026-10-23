CREATE TABLE sensor_types (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text NOT NULL,
  unit text NOT NULL,
  min_value double precision NOT NULL,
  max_value double precision NOT NULL,
  decimals smallint NOT NULL DEFAULT 2 CHECK (decimals BETWEEN 0 AND 4),
  warn_low double precision,
  warn_high double precision,
  CHECK (min_value < max_value),
  CHECK (warn_low IS NULL OR warn_high IS NULL OR warn_low < warn_high)
);

CREATE TABLE device_types (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9-]{3,32}$'),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('satuan', 'paket')),
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE device_type_sensors (
  type_id uuid NOT NULL REFERENCES device_types(id),
  sensor_code text NOT NULL REFERENCES sensor_types(code),
  label text NOT NULL,
  PRIMARY KEY (type_id, sensor_code)
);

ALTER TABLE devices
  ADD COLUMN code text UNIQUE,
  ADD COLUMN type_id uuid REFERENCES device_types(id),
  ADD COLUMN area_ref text,
  ADD COLUMN legacy_id text UNIQUE,
  ADD COLUMN is_sandbox boolean NOT NULL DEFAULT false,
  ADD COLUMN firmware text,
  ADD COLUMN calibrated_at timestamptz,
  ADD COLUMN last_rssi smallint,
  ALTER COLUMN model DROP NOT NULL,
  ALTER COLUMN credential_hash DROP NOT NULL,
  ALTER COLUMN allocated_to DROP NOT NULL;

CREATE TABLE area_thresholds (
  area_ref text NOT NULL,
  sensor_code text NOT NULL REFERENCES sensor_types(code),
  warn_low double precision,
  warn_high double precision,
  PRIMARY KEY (area_ref, sensor_code),
  CHECK (warn_low IS NULL OR warn_high IS NULL OR warn_low < warn_high)
);

CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL
    CHECK (scopes <@ ARRAY['devices:read', 'devices:write', 'readings:read', 'admin']::text[]),
  environment text NOT NULL CHECK (environment IN ('live', 'test')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE TABLE api_usage (
  key_id uuid NOT NULL REFERENCES api_keys(id),
  route text NOT NULL,
  status smallint NOT NULL,
  duration_ms integer NOT NULL,
  at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX api_usage_key_time ON api_usage(key_id, at DESC);

CREATE TABLE device_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES devices(id),
  type text NOT NULL CHECK (type IN ('online', 'offline', 'threshold_low', 'threshold_high', 'threshold_clear')),
  sensor_code text REFERENCES sensor_types(code),
  value double precision,
  at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX device_events_device_time ON device_events(device_id, at DESC);

ALTER TABLE readings
  ADD COLUMN ingest_version smallint NOT NULL DEFAULT 1 CHECK (ingest_version IN (1, 2)),
  ADD COLUMN ingest_type text,
  ADD COLUMN ingest_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE readings AS r SET ingest_type = d.model FROM devices AS d
WHERE d.id = r.device_id AND r.ingest_type IS NULL;

-- Warning defaults mirror SmartDashboard seed settings; the 0-5000 ppm TDS envelope is from the peer catalog, not a verified hardware maximum.
INSERT INTO sensor_types (code, name, unit, min_value, max_value, warn_low, warn_high) VALUES
  ('ph', 'pH', 'pH', 0, 14, 6.2, 7.6),
  ('tds', 'TDS', 'ppm', 0, 5000, 400, 900),
  ('water_temperature', 'Suhu air', '°C', -10, 100, 24, 30),
  ('ec', 'EC', 'mS/cm', 0, 100, NULL, NULL),
  ('air_temperature', 'Suhu udara', '°C', -50, 80, NULL, NULL),
  ('humidity', 'Kelembapan', '%RH', 0, 100, NULL, NULL);

INSERT INTO device_types (id, code, name, kind, description, active) VALUES
  ('10000000-0000-4000-8000-000000000001', 'AQ-PH', 'Sensor pH', 'satuan', 'Sensor pH satuan.', true),
  ('10000000-0000-4000-8000-000000000002', 'AQ-TMP', 'Sensor suhu air', 'satuan', 'Sensor suhu air satuan.', true),
  ('10000000-0000-4000-8000-000000000003', 'AQ-TDS', 'Sensor TDS', 'satuan', 'Sensor TDS satuan.', true),
  ('10000000-0000-4000-8000-000000000004', 'AQ-WATER-01', 'Paket kualitas air', 'paket', 'Paket pH, TDS, dan suhu air.', true),
  ('10000000-0000-4000-8000-000000000005', 'PILOT-WATER-V1', 'Pilot air v1', 'paket', 'Model perangkat pilot air versi 1.', false),
  ('10000000-0000-4000-8000-000000000006', 'PILOT-ENV-V1', 'Pilot lingkungan v1', 'paket', 'Model perangkat pilot lingkungan versi 1.', false);
INSERT INTO device_type_sensors (type_id, sensor_code, label) VALUES
  ('10000000-0000-4000-8000-000000000001', 'ph', 'pH'),
  ('10000000-0000-4000-8000-000000000002', 'water_temperature', 'Suhu air'),
  ('10000000-0000-4000-8000-000000000003', 'tds', 'TDS'),
  ('10000000-0000-4000-8000-000000000004', 'ph', 'pH'),
  ('10000000-0000-4000-8000-000000000004', 'tds', 'TDS'),
  ('10000000-0000-4000-8000-000000000004', 'water_temperature', 'Suhu air'),
  ('10000000-0000-4000-8000-000000000005', 'water_temperature', 'Suhu air'),
  ('10000000-0000-4000-8000-000000000005', 'ph', 'pH'),
  ('10000000-0000-4000-8000-000000000005', 'ec', 'EC'),
  ('10000000-0000-4000-8000-000000000006', 'air_temperature', 'Suhu udara'),
  ('10000000-0000-4000-8000-000000000006', 'humidity', 'Kelembapan');
UPDATE devices AS d SET type_id = t.id FROM device_types AS t
WHERE d.type_id IS NULL AND t.code = CASE d.model
  WHEN 'water-v1' THEN 'PILOT-WATER-V1'
  WHEN 'environment-v1' THEN 'PILOT-ENV-V1'
END;
