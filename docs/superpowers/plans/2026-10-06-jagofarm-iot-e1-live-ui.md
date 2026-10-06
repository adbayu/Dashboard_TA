# JagoFarm IoT E1 Live UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Connect List IoT and Device Detail to API telemetry, history, events, and a shared single-connection SSE client, and add one-time credential rotation in Kelola IoT.

**Architecture:** Keep HTTP route details in `iotApi`, isolate the shared fetch-based SSE lifecycle and parser in `iotStream`, and let the existing pages subscribe and render response-driven state. Build the detail history from the documented per-sensor aggregated readings endpoint and rotate credentials only after explicit admin confirmation.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 3, Chart.js 4 with `react-chartjs-2`, Node built-in test runner, existing `pilotApi` adapter.

## Global Constraints

- Implement E1 only; do not add the Monitoring page/sidebar badge, Developer sandbox panel, or claim-after-login.
- Follow the API contract in `docs/iot/03-api-contract.md`, UX in `docs/iot/05-ux-design.md`, design system in `docs/iot/06-design-system.md`, and Lumina Aqua `DESIGN.md`.
- Use `/v1/devices/:id/credentials/rotate` exactly and expose its credential only in a one-time reveal.
- On initial SSE non-200, including 429, stop stream attempts and poll every 30 seconds with “Diperbarui tiap 30 detik”.
- When an established 200 stream drops, show “Menyambung ulang...” and make one sequential reconnect with `Last-Event-ID` through the shared client. If that response is non-200, stop stream attempts and poll every 30 seconds.
- Never overlap stream requests; preserve same-origin credentials and do not use example telemetry as an API fallback.
- Maintain loading, empty, error, and populated states, keyboard focus behavior, light/dark support, and no horizontal overflow at 360px, 841px, or desktop.
- Use ENERGY 1 / RHYTHM 2 / MOTION 1; chart animation remains disabled.
- Run tests, lint, build, and browser click-through. OpenCode does not commit; the orchestrator commits E1 only after the 100% phase gate. Do not write audit-007 until E2 and F complete the requested UI sequence.

---

### Task 1: Add IoT telemetry and credential API adapter methods

**Files:**
- Modify: `src/services/iotApi.js`
- Test: `src/services/iotApi.test.js`

**Interfaces:**
- Produces `getDeviceLatest(id)`, `getDeviceReadings(id, { sensor, from, to, bucket = '5m' })`, `getDeviceEvents(id, { limit = 50, cursor } = {})`, and `rotateDeviceCredential(id)`.
- API responses pass through without fabricating values. Local-source telemetry and credential rotation remain unavailable and read-only.

- [x] **Step 1: Write failing route and query tests.** Add a `createIotApi` test whose injected `request` records calls and returns contract-shaped latest, points, event-page, and credential responses. Assert encoded device IDs, encoded query parameters, HTTP method, and exact plural rotation route.
- [x] **Step 2: Run the focused test and confirm the methods are missing.**

Run: `node --test src/services/iotApi.test.js`

Expected: the new assertions fail because the requested adapter methods are not implemented.

- [x] **Step 3: Implement only the four adapter methods.** Reuse `request`, `requireApiWrite`, `URLSearchParams`, and the existing path-encoding convention. Do not add local readings or a credential.
- [x] **Step 4: Run the focused test and the existing adapter tests.**

Run: `node --test src/services/iotApi.test.js`

Expected: all tests in that file pass, including existing no-example-fallback behavior.

### Task 2: Build a shared fetch-based SSE client

**Files:**
- Create: `src/services/iotStream.js`
- Test: `src/services/iotStream.test.js`

**Interfaces:**
- `createIotStreamClient({ fetchImpl, setIntervalImpl, clearIntervalImpl, pollIntervalMs })` returns `subscribe(handlers)` and `getSubscriberCount()` for deterministic lifecycle tests.
- Handlers receive `onStatus(status)`, `onReading(data)`, `onDeviceEvent(data, id)`, and `onRefresh()` notifications.
- Export one shared `iotStreamClient` configured for `/api/v1/stream` and a 30-second fallback poll interval.

- [x] **Step 1: Write failing lifecycle tests.** Assert two subscribers share one request; removing one keeps the request alive; removing the final subscriber aborts it and clears the polling timer.
- [x] **Step 2: Run the focused test and confirm the factory is missing.**

Run: `node --test src/services/iotStream.test.js`

Expected: FAIL because `iotStream.js` does not exist.

- [x] **Step 3: Write failing SSE parsing tests.** Feed `ReadableStream` chunks split inside field names, JSON, newlines, and frame boundaries. Assert named `reading` and `device_event` dispatch, and that only a `device_event` frame with `id` advances the replay ID.
- [x] **Step 4: Run the parser tests and confirm they fail for the missing parser.**
- [x] **Step 5: Implement a small line-buffering SSE parser and reference-counted fetch client.** Send `credentials: 'same-origin'` and `Accept: text/event-stream`; serialize requests; set `Last-Event-ID` on the single reconnect after an established stream drops; avoid native EventSource automatic reconnect.
- [x] **Step 6: Write failing tests for stream state transitions.** Cover initial non-200 including 429 to polling with no reconnect, initial network failure to polling, established stream drop to reconnecting, exactly one concurrent reconnect with `Last-Event-ID`, reconnect non-200 to polling, successful reconnect, and shared 30-second refresh notifications.
- [x] **Step 7: Run the focused test and confirm those cases fail before implementation.**
- [x] **Step 8: Implement transitions and polling.** No new stream request begins until the prior fetch/read loop has settled. Stop retries once initial or reconnect failure selects polling. Poll ticks notify current subscribers through the shared timer.
- [x] **Step 9: Run all stream-client tests and verify they pass.**

Run: `node --test src/services/iotStream.test.js`

Expected: all parser, lifecycle, status, reconnect, polling, and cleanup tests pass.

### Task 3: Add tested IoT reading and event presentation helpers

**Files:**
- Create: `src/utils/iotPresentation.js`
- Test: `src/utils/iotPresentation.test.js`

**Interfaces:**
- Export pure helpers for reading presentation, effective-threshold state evaluation, event labels, and history summary formatting.
- List and Detail subscribe directly to the shared stream in their existing React effects; each effect returns the client's unsubscribe callback.

- [x] **Step 1: Write failing tests for null and numeric value formatting, normal/low/high/unknown states, effective threshold labels, empty and populated history summaries, all five documented event labels, and unknown event values.**
- [x] **Step 2: Run the focused test and confirm it fails because the helper module is missing.**

Run: `node --test src/utils/iotPresentation.test.js`

Expected: FAIL because `iotPresentation.js` does not exist.

- [x] **Step 3: Implement only the pure helpers needed by List and Detail.** Do not add sample readings or event fallbacks.
- [x] **Step 4: Run the focused test and confirm all helper cases pass.**

Run: `node --test src/utils/iotPresentation.test.js`

Expected: all helper tests pass.

### Task 4: Render real latest readings in List IoT

**Files:**
- Modify: `src/pages/ListIot.jsx`
- Create: `src/components/iot/Readings.jsx`
- Use: `src/services/iotStream.js`
- Use: `src/utils/iotPresentation.js`

**Interfaces:**
- Shared reading presentation accepts sensor metadata and API reading records with `value`, `unit`, `state`, `threshold`, and `measuredAt`.
- List state stores latest response by device ID and updates only the matching device from stream reading frames.

- [x] **Step 1: Ensure Task 3 helper tests cover null values, decimal formatting, all four sensor states, effective area/default threshold labels, and measurement-time formatting.**
- [x] **Step 2: Run those tests and confirm they pass before adding page behavior.**
- [x] **Step 3: Load `getDeviceLatest` for each returned device and preserve list loading/error/empty handling.** Keep the current API failure visible and never substitute local sample data.
- [x] **Step 4: Subscribe to shared stream events.** Apply matching `reading` frame values using threshold metadata from the latest snapshot. On shared fallback refresh, re-fetch latest values every 30 seconds. Show the exact live/reconnecting/polling label from the approved state machine.
- [x] **Step 5: Replace “Belum ada data” placeholders with actual per-sensor presentation.** Preserve current card focus behavior, filtering, device click-through, and small-screen wrapping.
- [x] **Step 6: Run focused helper tests, full unit tests, lint, and build.** Confirm null latest values remain an honest empty reading state.

### Task 5: Render Device Detail readings, chart, and event log

**Files:**
- Modify: `src/pages/ListIot.jsx` (`DeviceDetail`)
- Create: `src/components/iot/ReadingChart.jsx`
- Create: `src/components/iot/EventList.jsx`
- Use: `src/components/iot/Readings.jsx`
- Use: `src/services/iotStream.js`
- Use: `src/utils/iotPresentation.js`

**Interfaces:**
- Detail loads device, latest, one 24-hour `bucket=5m` reading series per configured sensor, and a recent `/events` page filtered by device ID.
- Chart receives sensor metadata, aggregate points, and the effective threshold; event list receives contract event records.

- [x] **Step 1: Add failing pure helper tests for chart summary and event labels.** Cover empty points, min/max/last summary, all five event types, null sensor/value fields, and unknown values without invented labels.
- [x] **Step 2: Run the focused tests and confirm missing behavior.**
- [x] **Step 3: Load detail and its telemetry resources with per-request cancellation/stale-result protection.** Keep metadata errors retryable, render an honest empty state for no readings/events, and do not discard useful device metadata merely because history is empty.
- [x] **Step 4: Build the selectable per-sensor 24-hour chart.** Use Chart.js average line, min/max band, effective low/high threshold lines, Indonesian number/time formatting, and `animation: false`. Read colors from Lumina Aqua theme tokens and verify both themes.
- [x] **Step 5: Subscribe to stream events.** Update the selected device's latest values and event log; on polling fallback refresh latest, history, and events without overlapping requests.
- [x] **Step 6: Preserve empty, loading, and error states and keyboard operation for sensor selection, chart, and retry.**
- [x] **Step 7: Run focused tests, full unit tests, lint, and build.**

### Task 6: Add safe credential rotation in Kelola IoT

**Files:**
- Modify: `src/pages/admin/AdminIotPage.jsx`
- Modify: `src/services/iotApi.js` and `src/services/iotApi.test.js` only if Task 1 test gaps remain.

**Interfaces:**
- A live, non-sandbox device row can open a rotation confirmation. Confirmation calls `iotApi.rotateDeviceCredential(device.id)`.
- Success opens a one-time secret reveal with copy feedback and “Sudah saya simpan” acknowledgement. The modal cannot close until the secret is copied or explicitly acknowledged as saved.

- [x] **Step 1: Add a failing adapter test that confirms the exact POST route and preserves backend errors/status.** If Task 1 already covers both, retain that test and do not duplicate it.
- [x] **Step 2: Add the row action, confirmation copy, and error state.** Use the existing `IconButton`, `Modal`, focus trap, and feedback patterns. Hide this operation for sandbox rows when `isSandbox` is true.
- [x] **Step 3: Add one-time reveal behavior.** State contains the credential only while the reveal is open. Copy writes to clipboard and announces “Tersalin”; checkbox/acknowledgement enables close. Clear the secret on close. Show that firmware must be reprovisioned because the previous credential stops working immediately.
- [x] **Step 4: Exercise 409 unprovisioned and 404 sandbox/error responses.** Keep the error readable and permit retry without implying success.
- [x] **Step 5: Run adapter tests, full unit tests, lint, and build.**

### Task 7: Run E1 verification and recorded UI click-through

**Files:**
- Inspect all E1 source diffs; do not create audit-007 or modify unrelated documentation.

- [x] **Step 1: Run the complete frontend unit suite.**

Run: `node --test`

Expected: exit code 0 and no failed tests.

- [x] **Step 2: Run project lint.**

Run: `npx --no-install oxlint src`

Expected: no errors.

- [x] **Step 3: Run the documented production build.**

Run: `node node_modules/vite/bin/vite.js build`

Expected: exit code 0.

- [x] **Step 4: Run the app and click through E1 controls in light and dark mode at 360px, 841px, and desktop.** Record each result: list load/error/retry/filter/card navigation; stream initial non-200 fallback, established disconnect/reconnect and `Last-Event-ID`, reconnect failure/poll label; detail sensor selection/chart summary/event list; credential confirmation, copy, acknowledgement, and close; keyboard focus and Escape behavior.
- [x] **Step 5: Check browser console, request overlap, mobile horizontal overflow, and theme-specific contrast.** Do not claim the click-through passed without recording observed evidence.
- [x] **Step 6: Review git diff and status.** Confirm only scoped E1 code/tests and the uncommitted design/plan work documents changed; confirm no commit and no `anti-slop/audit-007-*` file exists.
