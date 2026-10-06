CREATE SEQUENCE IF NOT EXISTS sandbox_device_code_seq;

SELECT setval(
  'sandbox_device_code_seq',
  COALESCE(MAX(substring(code FROM 8)::bigint), 1),
  COUNT(*) > 0
)
FROM devices
WHERE is_sandbox = true AND code ~ '^AQ-SBX-[0-9]+$';

CREATE TABLE sandbox_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
