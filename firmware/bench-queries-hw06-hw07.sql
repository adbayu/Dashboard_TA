-- Read-only bench queries for HW-06 (Wi-Fi outage) and HW-07 (restart).
-- psql variables: schema, device_id, from_ts, to_ts.
-- Use a half-open UTC interval [from_ts, to_ts). No credential values are used.

-- QUERY: minute_counts
WITH bounds AS (
  SELECT :'device_id'::uuid AS device_id,
         :'from_ts'::timestamptz AS from_ts,
         :'to_ts'::timestamptz AS to_ts
), minute_slots AS (
  SELECT generate_series(
    date_trunc('minute', from_ts),
    date_trunc('minute', to_ts - interval '1 microsecond'),
    interval '1 minute'
  ) AS minute
  FROM bounds
  WHERE to_ts > from_ts
), minute_counts AS (
  SELECT date_trunc('minute', r.measured_at) AS minute, count(*)::integer AS sample_count
  FROM :"schema".readings AS r
  CROSS JOIN bounds AS b
  WHERE r.device_id = b.device_id
    AND r.measured_at >= b.from_ts
    AND r.measured_at < b.to_ts
  GROUP BY date_trunc('minute', r.measured_at)
)
SELECT slots.minute, coalesce(counts.sample_count, 0)::integer AS sample_count
FROM minute_slots AS slots
LEFT JOIN minute_counts AS counts USING (minute)
ORDER BY slots.minute;

-- QUERY: gaps_over_two_intervals
WITH ordered AS (
  SELECT r.measured_at,
         lag(r.measured_at) OVER (ORDER BY r.measured_at, r.message_id) AS previous_at
  FROM :"schema".readings AS r
  WHERE r.device_id = :'device_id'::uuid
    AND r.measured_at >= :'from_ts'::timestamptz
    AND r.measured_at < :'to_ts'::timestamptz
)
SELECT previous_at,
       measured_at,
       extract(epoch FROM (measured_at - previous_at))::integer AS gap_seconds,
       greatest(0, floor(extract(epoch FROM (measured_at - previous_at)) / 30)::integer - 1) AS missed_30_second_slots
FROM ordered
WHERE previous_at IS NOT NULL
  AND measured_at - previous_at > interval '90 seconds'
ORDER BY previous_at;

-- QUERY: duplicate_message_groups
SELECT r.device_id, r.message_id, count(*)::integer AS copies
FROM :"schema".readings AS r
WHERE r.device_id = :'device_id'::uuid
  AND r.measured_at >= :'from_ts'::timestamptz
  AND r.measured_at < :'to_ts'::timestamptz
GROUP BY r.device_id, r.message_id
HAVING count(*) > 1
ORDER BY r.device_id, r.message_id;

-- QUERY: offline_online_events
SELECT e.type, e.at
FROM :"schema".device_events AS e
WHERE e.device_id = :'device_id'::uuid
  AND e.type IN ('offline', 'online')
  AND e.at >= :'from_ts'::timestamptz
  AND e.at <= :'to_ts'::timestamptz
ORDER BY e.at, e.id;
