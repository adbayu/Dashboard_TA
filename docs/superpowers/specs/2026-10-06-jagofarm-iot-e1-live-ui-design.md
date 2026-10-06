# JagoFarm IoT E1 Live UI Design

## Goal

Connect List IoT and Device Detail to real backend readings, history, events, and live updates, and add the existing backend credential-rotation operation to Kelola IoT.

## Scope

Included:

- Extend `src/services/iotApi.js` and its tests for latest readings, aggregated history, device events, and credential rotation.
- Add one shared, reference-counted, fetch-based SSE client used by List IoT and Device Detail.
- Display API readings with effective thresholds and sensor states in List IoT and Detail.
- Display per-sensor 24-hour history, aggregated at five-minute buckets, and recent device events in Detail.
- Add confirmation and one-time credential reveal for credential rotation in Kelola IoT.
- Preserve the documented loading, empty, error, and data states, keyboard operation, dark mode, and responsive behavior.

Excluded:

- E2 Monitoring page or sidebar badge.
- Developer sandbox panel.
- Claim-after-login behavior.
- Any audit-007 document or commit.

## Source of Truth

Use `docs/iot/03-api-contract.md` for routes and payloads, `docs/iot/05-ux-design.md` for page content and four states, `docs/iot/06-design-system.md` for chart, status, secret-reveal, and live-indicator patterns, `docs/iot/07-test-plan.md` for acceptance intent, and `DESIGN.md` for Lumina Aqua visual direction. Existing backend handlers are authoritative when implementation details differ from older frontend notes.

## Architecture

### API adapter

Add adapter methods that use the existing `pilotApi` request path and response handling:

- `getDeviceLatest(id)` calls `/v1/devices/:id/latest`.
- `getDeviceReadings(id, { sensor, from, to, bucket = '5m' })` calls `/v1/devices/:id/readings` with encoded query values.
- `getDeviceEvents(id, options)` calls `/v1/events?deviceId=...` and returns the backend event page.
- `rotateDeviceCredential(id)` posts to `/v1/devices/:id/credentials/rotate` exactly as documented.

The local example source stays read-only and never invents telemetry or credentials. API failures remain visible and never fall back to sample data.

### Shared stream client

Use one module-level client shared by page subscribers. A fetch-based SSE transport is required because native `EventSource` hides HTTP response status, reconnects autonomously, and does not permit setting `Last-Event-ID` manually. The client will:

- Keep at most one stream request in flight for all active subscribers.
- Send same-origin credentials and `Accept: text/event-stream`.
- Parse `reading` and `device_event` SSE frames, including event IDs, across arbitrary stream chunk boundaries.
- On initial non-200 response, including 429, or initial request failure, stop stream attempts and switch subscribers to 30-second refresh polling.
- After an established 200 stream ends or errors, publish reconnecting status and make one sequential reconnect using the last received event ID.
- If that reconnect is non-200 or fails, stop reconnect attempts and switch to 30-second refresh polling.
- Never start a new connection before the prior response reader has settled; stop and release the connection when no subscribers remain.

The client exposes subscription lifecycle, status changes (`connecting`, `live`, `reconnecting`, `polling`), parsed events, and a refresh notification for fallback polling. Poll notifications are shared so simultaneous subscribers do not create competing timers.

### List IoT

Load the device list and each device's latest reading from the backend. Render real values, measurement time, effective threshold, and state. Apply live `reading` frames only to matching devices, using the effective threshold returned by the latest snapshot. Keep list-level loading/error/empty states and the existing filter-empty state. When stream fallback is active, refresh latest readings every 30 seconds and display “Diperbarui tiap 30 detik”.

### Device Detail

Load device metadata, latest readings, events, and 24-hour history for each configured sensor. Use five-minute buckets for history. Present all current sensor values with their effective threshold and state, a selectable sensor history chart with average and min/max band plus effective threshold lines, and the recent event log. Keep the backend `/latest` response authoritative for threshold metadata; live raw readings update values and state against that metadata. Live device events are reflected in the log, while initial history comes from `/events`. Show live, reconnecting, or polling status using documented Indonesian labels.

### Kelola IoT credential rotation

Add a row action that opens a keyboard-accessible confirmation modal explaining that the old credential stops working immediately and the device must be reprovisioned. Call the adapter's exact contract route only after confirmation. Show the returned credential in a one-time reveal state, with copy feedback and explicit saved confirmation before dismissal. Never log, persist, or reuse the secret. Backend errors, including conflict for an unprovisioned device and not-found for sandbox devices, remain visible without replacing device data.

## Visual and Interaction Direction

Design Read: operational IoT screens for JagoFarm operators and administrators, using Lumina Aqua's calm, scannable visual language; ENERGY 1 / RHYTHM 2 / MOTION 1.

- Current readings are the focal point because they drive field decisions.
- History and event log follow as diagnostic evidence.
- Use existing semantic tokens, Material Symbols, Manrope/Hanken Grotesk, and existing radius/size conventions.
- Disable chart animation. Do not add pulsing status dots or decorative motion.
- Use status text plus icon and color, never color alone.
- Preserve the shared modal focus trap, initial focus, Escape close, and focus return behavior.
- Verify light and dark themes, 360px and 841px widths, and desktop with no horizontal overflow.

## Error and Empty Behavior

- List IoT keeps distinct loading, no-device, no-filter-match, and error states.
- Detail gives readable loading and error states and honest empty states for missing latest values, empty history, and no events.
- History and events do not fabricate values when the API returns empty arrays.
- Initial SSE failure and failed reconnect use 30-second polling; a lost established connection shows reconnecting during its single retry.
- Credential rotation errors use visible alert text and retain the confirmation flow for retry.

## Testing

- Add adapter tests first for exact routes, query encoding, response pass-through, and rotation error handling.
- Add shared stream-client tests first for single connection/ref-counting, arbitrary chunk parsing, reading/event dispatch, status transitions, initial non-200 fallback, one sequential reconnect with `Last-Event-ID`, reconnect non-200 fallback, polling cadence, and teardown.
- Run frontend unit tests, project lint, and production build.
- Run the app and click through list/detail navigation, filters, stream status transitions, chart sensor selection, retry/error states, and credential rotation reveal/copy/close behavior with keyboard and pointer input in light/dark mode and target widths.
- OpenCode does not commit. The orchestrator commits E1 only after its 100% phase gate; audit-007 remains deferred until E2 and F finish the requested UI sequence.

## Design Self-Review

- Scope includes only the requested E1 adapter, shared stream, List IoT, Detail, and credential rotation.
- Routes and data shapes follow the current API contract, including plural `credentials/rotate`.
- No fabricated telemetry, history, events, statistics, or credentials are added.
- The fetch stream design is necessary to meet explicit response-code and replay-header requirements.
- No placeholders or unimplemented actions are specified.
