ALTER TABLE devices
  ADD COLUMN sandbox_scenario text NOT NULL DEFAULT 'normal'
    CHECK (sandbox_scenario IN ('normal', 'ph_turun', 'suhu_naik', 'offline'));

CREATE INDEX device_events_state_lookup
  ON device_events (device_id, sensor_code, id DESC);