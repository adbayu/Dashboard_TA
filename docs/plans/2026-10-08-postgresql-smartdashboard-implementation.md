# SmartDashboard PostgreSQL Implementation Plan

> For Hermes: execute in task order with TDD and review each migration/API boundary before applying it to the active database.

Goal: Move shared SmartDashboard domain state from browser-only localStorage to the existing PostgreSQL/Fastify backend, preserve Pilot records and behavior, align database migrations with `origin/feat/iot-system`, and support explicit safe import of legacy browser data.

Architecture: Keep the existing `users` and `sessions` identity/session system, while adding a 1:1 SmartDashboard profile for dashboard role/status and area assignments. Adopt numbered transactional migrations, port the peer IoT schema contract without unreviewed sample-device inserts, and add normalized Dashboard tables. Add authenticated, server-authorized APIs, then hydrate the existing `SmartStore` and its current page actions through those APIs. Keep UI preferences/chat history local; retain legacy localStorage until an opt-in import is verified.

Tech Stack: PostgreSQL 17, Fastify 5, `pg`, Node.js built-in test runner, React 19, Vite 8, Docker Compose.

---

## Verified constraints and contracts

- Current branch: `dev/antigravity`; do not switch branches, merge `origin/feat/iot-system`, or push.
- Current worktree has unrelated local changes in Docker, `server/app.ts`, `server/index.ts`, `server/pilot.test.ts`, V-Pet and documentation. Never stage them accidentally. Commit only exact plan/spec/code hunks for this work.
- The active PostgreSQL schema is version 1. It contains 4 users (1 Pilot admin, 3 Pilot users), 4 devices, 4 ownerships, and 2,086 readings. Preserve all records and identifiers.
- Existing schema is `server/schema.sql`; `server/db.ts` currently runs it as one transaction. `server/app.ts` uses the `pilot_session` cookie, scrypt password hashes, Origin checks, and Pilot-specific 10-account/20-device limits.
- `origin/feat/iot-system` has numbered migrations 001/002, `sensor_types`, `device_types`, `device_type_sensors`, `area_thresholds`, `device_events`, API key/usage tables, and reading ingestion metadata. Migration 002's warning defaults match the current SmartDashboard seed. Its TDS 0-5000 ppm envelope is explicitly provisional upstream, so preserve it as catalog metadata but do not present or enforce it as a verified hardware maximum until the sensor specification is confirmed. Omit its three sample device inserts during schema upgrade.
- Existing dashboard identifiers are strings such as `AR-01`, `IOT-001`, `U-001`, `MON-1`, `H-1`, `HV-1`, and `PET-*`; Pilot IDs are UUIDs. Preserve dashboard IDs in `legacy_id` fields or a deterministic import map. `temp` in SmartDashboard maps to canonical IoT sensor code `water_temperature`.
- Preserve Pilot role meanings (`admin/user`) and Pilot quota semantics. Add separate dashboard role/status and a Pilot-scope marker so Dashboard-only users/devices do not consume Pilot caps. Do not trust role, status, area assignment, points, or IDs sent by the browser.
- Existing client simulation is not real telemetry. Persist it only with an explicit simulator/source marker; do not label it physical device data.
- Real credentials and personal data must not be sent over the existing HTTP LAN URL. Run local auth/browser tests on loopback; enable LAN use for real accounts only after HTTPS or a trusted private-network setup.
- No `docker compose down -v`, `DROP TABLE`, reset, or replacement of current Pilot rows. Before applying migrations to the active volume, take and verify a logical backup outside the repository.

## API and data contracts

- `dashboard_profiles`: one row per dashboard-enabled `users.id`; `dashboard_role` is `pengelola|pengguna`; `status` is `aktif|menunggu|nonaktif`; profile fields are nullable where legacy Pilot accounts have no profile. Existing users start with least privilege (`pengguna`, no assigned areas). A one-time bootstrap endpoint may grant the first dashboard manager only to an authenticated Pilot admin when no manager exists.
- `pilot_access` (or an equivalent explicit marker) remains true for current Pilot accounts and new Pilot invitations. Dashboard-only signup/invites set it false. Existing Pilot routes and quotas continue to apply only to Pilot-scoped users/devices.
- `areas.id` remains text to preserve legacy area IDs. Dashboard device rows use `legacy_id`, `area_ref`, and the peer IoT device-type/sensor catalog. Dashboard `readings` may have no Pilot ownership; add an area reference/source path without changing or deleting existing Pilot ownership-based readings.
- Shared domain tables: dashboard categories/configuration, user-area assignments, manual monitoring, daily mortality, HPP items, harvests, pets/care events, point rules, missions/progress, badges/claims, append-only point ledger, and import batch/legacy-ID mapping.
- `GET /api/dashboard/bootstrap` returns role-authorized state. Dashboard mutations use specific typed endpoints. Server derives user ID/role from the session, applies area checks, validates payloads, and commits related writes atomically.
- Legacy import has preview and explicit confirmation, is idempotent, ignores password/session/auth material, never auto-elevates user records, preserves localStorage, and reports conflicts/unmapped legacy users. Import request body limit is bounded and suitable for the current snapshot size.
- Empty database responses stay empty; the client must not silently substitute seeded demo domain records after API failure.

## Execution tasks

### Task 1: Add isolated migration/API test helpers

Objective: Make migration and Dashboard API tests run in a disposable PostgreSQL schema, never the public schema.

Files:
- Create `server/testDb.ts` for random-schema pool setup/cleanup, or extract the existing setup from `server/pilot.test.ts` without changing its behavior.
- Create `server/db.test.ts` for migration ordering/atomicity cases.
- Modify `package.json` to expose a combined API test command if separate test files are added.

Steps:
1. Add a failing test that creates a random schema, invokes the migration entry point twice, and verifies versions are recorded once.
2. Run `docker compose --env-file docker.env.example --env-file .env.docker.lan exec -T api sh -lc 'TEST_DATABASE_URL="$DATABASE_URL" npm run test:pilot'` and confirm the new test fails for the missing runner behavior.
3. Implement only the test helper needed for schema isolation. Test cleanup must drop only the generated random schema.
4. Re-run `npm run test:pilot`; expect existing Pilot tests to remain green and the new test to fail only at the unimplemented assertion.

### Task 2: Introduce numbered migration runner and baseline 001

Objective: Replace the monolithic runner with ordered, transactional numbered migrations while recognizing the already-applied version 1.

Files:
- Create `server/migrations/001_pilot.sql` from the verified current Pilot baseline in `server/schema.sql`.
- Modify `server/db.ts` to discover `NNN_name.sql`, acquire advisory lock `90260909`, run each pending migration in its own transaction, and record each version after successful SQL.
- Modify `server/index.ts` to report versions newly applied in this invocation separately from the current schema version, including no-op reruns.
- Remove `server/schema.sql` only after the new baseline and tests prove equivalent; otherwise leave it documented as a frozen legacy reference and ensure runtime no longer executes it.

Steps:
1. Add tests for numeric ordering, malformed filename rejection, skip of applied versions, rollback on SQL error, and repeat-run idempotence.
2. Run `npm run test:pilot`; confirm failures before implementation.
3. Implement the runner and copy the baseline. Remove the self-recording `INSERT` from migration SQL so the runner is the sole version recorder.
4. Run `npm run test:pilot` and `npm run typecheck`; expect version 1 only on an empty schema and no duplicate execution on the second call.

### Task 3: Port compatible IoT migration 002

Objective: Add the colleague branch's IoT catalog/ingestion contract without adding fake device rows or changing existing Pilot readings.

Files:
- Create `server/migrations/002_iot_platform.sql`, based on `origin/feat/iot-system:server/migrations/002_iot_platform.sql` after review.
- Modify `server/pilot.test.ts` only for compatibility assertions; preserve existing tests and current local changes.

Steps:
1. Add migration tests for the catalog tables, device/readings columns, legacy model-to-type mapping, and 4 existing Pilot devices/readings retained.
2. Run `npm run test:pilot`; confirm the new contract tests fail before the migration exists.
3. Port the schema changes and canonical sensor/device-type catalog. Keep warning defaults aligned with the current app, retain the upstream TDS 0-5000 ppm value only as provisional catalog metadata, and do not enforce it as a hardware limit until the sensor specification is confirmed. Remove the TODO and sample `devices` INSERTs. Keep Pilot models and credentials nullable only as required for catalog-driven non-Pilot devices.
4. Run `npm run test:pilot` and `npm run typecheck`; verify existing Pilot provision, ingest, history, quota and ownership tests still pass.

### Task 4: Add Dashboard domain migration 003

Objective: Create normalized tables and constraints for every role feature that needs persistent data.

Files:
- Create `server/migrations/003_dashboard_domain.sql`.
- Add migration tests in `server/db.test.ts` or `server/dashboard.test.ts`.

Steps:
1. Test required table/constraint behavior first: dashboard profile/roles, areas, categories, user-area assignments, monitoring, mortality, HPP, harvests, pets/care, point rules, missions/progress, badges/claims, ledger and import batches.
2. Implement FK/unique/CHECK/index definitions. Keep `areas.id` text for `AR-*`; keep UUID user/device IDs and stable legacy-ID mapping for browser records.
3. Add `pilot_access` or equivalent markers with legacy rows defaulting to Pilot scope; scope Pilot quotas to Pilot rows. Add a Dashboard source marker for non-Pilot devices.
4. Allow Dashboard readings without Pilot ownership by adding a nullable area reference/source path; retain the existing `(device_id,message_id)` idempotency key and all existing rows.
5. Ensure mortality is unique per `(area_id,date)` and population cannot become negative. Ensure point ledger rows are append-only by API convention and audit actor/reason.
6. Run `npm run test:pilot` and `npm run typecheck`; expect migration 003 to pass on an empty schema and a schema containing the current Pilot baseline.

### Task 5: Prove upgrade safety from the live v1 shape

Objective: Verify old Pilot rows survive the numbered migration sequence before touching the active volume.

Files:
- Modify `server/db.test.ts` and `server/pilot.test.ts`.

Steps:
1. In a random test schema, create the exact v1 baseline and insert fixture rows for users/devices/ownerships/readings, then mark version 1 applied.
2. Run the migration runner and assert IDs, row counts, credentials hashes, readings JSON, ownership links and roles are unchanged; assert versions 1/2/3 only once.
3. Run the test twice. The second run must make no changes.
4. Run the complete API test suite; do not run migrations on the public schema in this task.

### Task 6: Add Dashboard authorization and first-manager bootstrap

Objective: Derive Dashboard access from the server session and enforce least privilege before data APIs are added.

Files:
- Create `server/dashboardAuth.ts` for profile loading and authorization helpers.
- Modify `server/app.ts` to register the dashboard routes/hooks without changing existing Origin/Cookie/CSRF behavior.
- Add tests in `server/dashboard.test.ts`.

Steps:
1. Test unauthenticated, inactive, pending, normal user, assigned-area user, unassigned-area user, Dashboard manager, and Pilot-only route authorization.
2. Implement role/profile helpers using `request.actor` from the existing session; never accept actor or area scope from the request body.
3. Implement one-time bootstrap restricted to an authenticated Pilot admin only when there is no active dashboard manager; serialize with a transaction/lock.
4. Run `npm run test:pilot` and confirm both Pilot and Dashboard role gates pass.

### Task 7: Add server-backed session, registration and profile APIs

Objective: Replace client-only login/profile/password storage with the existing server identity/session system.

Files:
- Modify `server/app.ts` or create `server/dashboardRoutes.ts` and register it from `server/app.ts`.
- Modify `server/domain.ts` only if password validation/hash helpers need shared tests.
- Add auth/profile cases in `server/dashboard.test.ts`.

Steps:
1. Test Dashboard login/session read, logout, registration email uniqueness, password minimum, role spoofing, pending manager approval, profile update ownership, and password change.
2. Add rate-limited Dashboard registration. Store only `passwordHash`; force `users.role='user'`; assign `pilot_access=false`; derive requested manager role as `menunggu`.
3. Add session profile read/update and password change. Do not import localStorage passwords or session IDs.
4. Keep Pilot invitation flow and its invitation verification behavior unchanged; Dashboard manager-created users must use the server invitation/password-acceptance path.
5. Run `npm run test:pilot` and `npm run typecheck`.

### Task 8: Add authorized Dashboard read/bootstrap APIs

Objective: Return a complete server-backed snapshot filtered by role and assigned area.

Files:
- Create/modify `server/dashboardRoutes.ts` and repository/query helpers.
- Add cases to `server/dashboard.test.ts`.

Steps:
1. Test empty state, manager-wide state, assigned-area user state, unassigned user state, and direct-ID leakage attempts.
2. Implement `GET /api/dashboard/bootstrap` for the authenticated actor: authorized profiles/areas/devices/categories/readings/operations/pets/gamification only.
3. Derive summary/leaderboard values from persistent rows; do not create duplicate summary tables or expose unrelated area names/telemetry.
4. Translate canonical sensor code `water_temperature` to SmartDashboard `temp` only at the API boundary.
5. Run `npm run test:pilot`.

### Task 9: Add manager CRUD APIs for master data and users

Objective: Persist manager operations through validated, transactional server endpoints.

Files:
- Modify `server/dashboardRoutes.ts` or a new `server/dashboardAdminRoutes.ts`.
- Add tests to `server/dashboard.test.ts`.

Steps:
1. Test create/update/disable and invalid references for users, areas, categories, and devices; test that Pilot quota counts ignore Dashboard-only rows.
2. Implement manager-only endpoints for account status/role, area assignments, area CRUD, category/sensor configuration, and device placement/configuration.
3. Prevent deleting referenced areas/categories/devices; use soft-disable or explicit conflict responses.
4. Record point adjustments through ledger, not by accepting a client-provided balance.
5. Run `npm run test:pilot` and typecheck.

### Task 10: Add area-operation APIs and transactional mortality correction

Objective: Persist monitoring, population/mortality, HPP and harvest records with server-side area checks.

Files:
- Modify `server/dashboardRoutes.ts` and repository transaction helpers.
- Add tests to `server/dashboard.test.ts`.

Steps:
1. Test cross-area rejection, manual monitoring validation, HPP CRUD, harvest validation, same-day mortality edits, deletion rollback, and nonnegative population.
2. Implement operator writes only for assigned areas; managers may write any area.
3. In one transaction, update a day's mortality record and apply only `new_count - previous_count` to population. Deleting the record reverses its current count once.
4. Run API tests and verify both roles read the same rows after refresh.

### Task 11: Add pet and gamification APIs

Objective: Make pet care, EXP, missions, badge claims, and points server-authoritative.

Files:
- Modify `server/dashboardRoutes.ts` and existing pure logic in `src/data/petProgress.js` only if shared rules need server tests or a mirrored server helper.
- Add tests to `server/dashboard.test.ts` and targeted `.mjs` tests for shared pure calculations.

Steps:
1. Test pet ownership/area visibility, care progression, EXP rounding, manager configuration, reset behavior, mission completion idempotency, badge claim thresholds, and point corrections.
2. Persist pet state plus care events; execute care/point-ledger writes in transactions.
3. Make the server recompute points/EXP from allowed activity rather than trusting totals sent by the client.
4. Run `npm run test:pilot`, `npm run test:vpet`, and `npm run typecheck`.

### Task 12: Add opt-in legacy import with preview and idempotency

Objective: Let a manager safely import browser-local domain data without importing credentials or overwriting server records.

Files:
- Modify `server/dashboardRoutes.ts` or create `server/dashboardImport.ts`.
- Add tests in `server/dashboard.test.ts`.

Steps:
1. Test schema validation, import size limit, missing/duplicate IDs, unmapped users, role/status spoofing, duplicate retries, server conflicts, and password/session stripping.
2. Implement preview and confirm endpoints with a bounded body limit and unique import-batch key.
3. Map only existing server identities by normalized email; do not create/promote accounts from client role fields. Import farm-wide records only for a manager; user-level records only for the authenticated owner.
4. Preserve the source localStorage, tag simulated telemetry, and return imported/skipped/conflict counts. Never silently overwrite server state.
5. Run API tests and retry the same import to prove idempotency.

### Task 13: Add a typed browser API service

Objective: Centralize API calls and structured loading/error handling.

Files:
- Create `src/services/dashboardApi.js`.
- Reuse or factor `src/services/pilotApi.js` for same-origin credentials, timeouts, and structured errors.
- Add focused Node tests only if the project test harness can import the service without Vite transforms; otherwise verify through browser tests.

Steps:
1. Define functions for bootstrap, auth/profile, manager operations, operational writes, pet/gamification and import preview/confirm.
2. Ensure failed requests throw visible errors and never fall back to seeded live domain data.
3. Verify request bodies never include passwords except login/register/change-password, and never include current user ID/role as authority.

### Task 14: Convert SmartStore to server hydration and safe local preferences

Objective: Keep the existing `useSmart` API for page components while making PostgreSQL the domain source of truth.

Files:
- Modify `src/store/SmartStore.jsx`.
- Modify `src/SmartApp.jsx` for initial loading, API error and empty states.
- Add store/domain tests in available existing test scripts.

Steps:
1. Add failing tests for bootstrap loading, unauthenticated state, API failure, empty database, and no fabricated demo fallback.
2. Load `/api/dashboard/bootstrap` after server session discovery. Keep theme/chat/local UI preferences in a separate local key only.
3. Remove global writes of the full domain state to `aquasmart_smart_v1`; retain the old snapshot untouched until explicit import.
4. Preserve current derived helpers and public page-facing state shape, mapping null/empty values safely.
5. Run `npm run test:vpet`, `npm run build`, and typecheck.

### Task 15: Connect user pages and actions to persistent APIs

Objective: Keep current user workflows while saving all domain changes through the API.

Files:
- Modify `src/store/SmartStore.jsx` action implementations.
- Update `src/pages/AreaDetail.jsx`, `src/pages/ListIot.jsx`, `src/pages/VPet.jsx`, `src/pages/Gamifikasi.jsx`, and `src/pages/Profil.jsx` only where async results/loading/errors need handling.

Steps:
1. Replace local mutations for profile, device details, monitoring, mortality, HPP, harvest, pet care, mission completion and badge claims with server calls.
2. Refresh/patch state only from server responses. Keep area filtering; do not let a page submit another user's area ID.
3. Ensure duplicate taps/retries do not double-award points or mortality.
4. Run `npm run test:vpet`, `npm run build`, and targeted browser tests for each workflow.

### Task 16: Connect manager pages to persistent APIs

Objective: Make manager edits change the same records read by users.

Files:
- Modify `src/store/SmartStore.jsx` manager action implementations.
- Update `src/pages/admin/AdminUsers.jsx`, `AdminIot.jsx`, `AdminCategories.jsx`, `AdminAreas.jsx`, `AdminVPet.jsx`, and `AdminPoints.jsx` for async feedback/errors.

Steps:
1. Connect account approval/area assignment, category/device/area configuration, pet configuration and point rules to API endpoints.
2. Remove client-side-only creation of passwords and direct point-balance edits; manager-created accounts use invitations.
3. Verify a manager update is visible to an assigned user after reload, while unassigned users receive no record details.
4. Run `npm run build`, `npm run typecheck`, `npm run test:vpet`, and server API tests.

### Task 17: Replace demo login and add opt-in import UI

Objective: Remove plaintext demo credentials and let users deliberately import their legacy snapshot.

Files:
- Modify `src/pages/Login.jsx`, `Daftar.jsx`, `Profil.jsx`, `src/data/seed.js`, `src/SmartApp.jsx`, and add an import dialog/page component.

Steps:
1. Remove the publicly displayed demo password and client-side password reset path. Use same-origin server login and password rules aligned with backend.
2. Keep user role/status display sourced from server. Public user registration is rate-limited; manager requests remain pending.
3. Add a manager-only legacy import preview and confirmation; explain that the browser snapshot stays intact until verified.
4. Show API loading/error/empty states; do not imply that an import or server save succeeded until the response confirms it.
5. Verify login, logout, register, pending-manager rejection, import preview, confirm, retry, and source localStorage retention in browser tests.

### Task 18: Update deployment/docs and run final verification

Objective: Document the new storage/auth boundary and validate the active database upgrade safely.

Files:
- Modify `README.md`, Compose migration command/status messaging, and API health checks as needed.
- Do not alter LAN binding/firewall behavior or publish a new endpoint.

Steps:
1. Run in isolated test schema: API tests, `npm run test:vpet`, `npm run typecheck`, `npm run build`, `npm run lint`, and asset validation.
2. Confirm on the active database that v1 baseline/schema match. Create a logical `pg_dump` backup outside the repository and verify it with `pg_restore --list`.
3. Only after backup and isolated upgrade pass, run the numbered migration service against the active database. Do not run `down -v` or reset.
4. Read back migration versions and counts for existing users/devices/ownerships/readings; expected pre-upgrade counts remain 4/4/4/2,086.
5. Exercise loopback browser flows for manager and user roles. Do not use real credentials on HTTP LAN. Confirm visible empty/loading/error behavior and cross-role read-back.
6. Run `git diff --check`; inspect staged paths and ensure no unrelated pre-existing changes are committed. Never push.

## Amandemen Task 4, 9, 10, 12, 15, 16, dan 18 — Batch Bibit, Pertumbuhan, dan Ekonomi Ikan

Amandemen ini tidak menambah fase bernomor baru. Jalankan tiap kelompok di dalam parent task-nya: skema pada Task 4 sebelum Task 5, pembuatan area/stok dan harga oleh pengelola pada Task 9, operasi area pada Task 10, impor pada Task 12, layar pengguna pada Task 15, layar pengelola pada Task 16, dan verifikasi pada Task 18. Spesifikasi perilaku dan rumus: `docs/superpowers/specs/2026-10-09-fish-batch-economics-design.md`.

### Task 4 amendment — tambahkan model batch ke migration 003

**Objective:** Persistensikan spesies/harga, batch tebar, bobot, mortalitas, panen, dan biaya tertaut tanpa menghitung bibit dua kali.

**Files:**
- Modify `server/migrations/003_dashboard_domain.sql`.
- Modify `server/db.test.ts`.

**Steps:**
1. Tambahkan failing isolated migration tests untuk tabel/constraint: `fish_species`, `fish_species_prices`, `fish_stocking_batches`, `fish_growth_samples`, `fish_mortality_events`, `fish_batch_harvests`, dan `fish_batch_adjustments`; selaraskan nama final dengan domain tables Task 4. Uji jumlah awal/sampel positif, harga nonnegatif, unique sampel per batch/tanggal, mortalitas per batch/tanggal, histori legacy per area/tanggal, FK, dan indeks.
2. Jalankan `npm run test:pilot`; pastikan tes baru gagal karena tabel/constraint batch belum tersedia.
3. Implementasikan DDL aditif dan FK `batch_id` nullable pada tabel HPP Task 4 (atau nama ekuivalennya), bukan tabel HPP duplikat. Penyesuaian jumlah batch hanya negatif; penambahan ikan menjadi batch restock baru. Jangan menambah perangkat contoh atau merekonstruksi batch historis.
4. Jalankan `npm run test:pilot` dan `npm run typecheck` pada schema acak kosong dan schema upgrade 001/002; pastikan rerun aman dan seluruh data Pilot fixture tetap identik. Jangan menjalankan migration pada database aktif.

### Task 9 amendment — pembuatan kolam, batch awal, dan harga spesies

**Objective:** Buat kolam aktif dan batch tebar pertamanya dalam satu transaksi serta izinkan hanya pengelola mengubah harga/kg.

**Files:**
- Modify `server/dashboardRoutes.ts` and `server/dashboard.test.ts`.

**Steps:**
1. Tulis failing API tests: kolam ikan aktif baru tanpa batch ditolak; kolam aktif baru dengan spesies/tanggal/jumlah/harga bibit membuat area dan batch bersama-sama; kegagalan batch membatalkan area; kolam istirahat boleh tanpa batch; area legacy aktif yang belum diinisialisasi tetap dapat dibaca; restock membuat batch baru; hanya pengelola dapat mengubah harga efektif per spesies; snapshot lama tetap utuh.
2. Jalankan `npm run test:pilot`; pastikan test baru gagal pada route/kontrak yang belum ada.
3. Implementasikan transaksi create-area untuk kolam aktif baru, katalog spesies ternormalisasi, dan endpoint harga/kg khusus pengelola. Area legacy tidak dipaksa memiliki batch sintetis.
4. Jalankan `npm run test:pilot` dan `npm run typecheck`; pastikan test lulus termasuk rollback area+batch dan otorisasi role.

### Task 10 amendment — aturan hitung dan operasi area di server

**Objective:** Simpan harga dan aktivitas batch melalui API dengan otorisasi area, transaksi, snapshot harga, dan hasil ekonomi yang konsisten.

**Files:**
- Create `server/fishEconomics.ts` dan `server/fishEconomics.test.ts`.
- Modify `server/dashboardRoutes.ts` (dibuat pada Task 6–8), `server/dashboard.test.ts`, dan `package.json` agar test baru masuk `npm run test:pilot`.

**Steps:**
1. Tulis failing unit tests untuk umur batch, laju gram/hari, estimasi nilai stok hidup, kerugian langsung bibit, snapshot estimasi nilai yang tidak jadi diperoleh, margin sementara, dan laba/rugi batch tertutup. Uji harga/bobot kosong, bobot menurun, dan harga nol.
2. Jalankan `npm run test:pilot`; pastikan tes helper gagal karena `server/fishEconomics.ts` belum dibuat.
3. Implementasikan helper murni di `server/fishEconomics.ts` memakai hitungan ikan integer, nilai uang/bobot decimal, dan tanggal eksplisit. Estimasi nilai kematian tidak boleh menjadi biaya kedua pada margin batch.
4. Tambahkan failing API tests untuk sampel, mortalitas, panen, snapshot harga/bobot, HPP tertaut/tidak tertaut, akses silang area, idempotensi retry, koreksi delta hari yang sama, populasi negatif, serta transaksi atomik.
5. Jalankan `npm run test:pilot`; pastikan API tests gagal sebelum endpoint/domain transaction diimplementasikan.
6. Implementasikan API dan transaksi. Batch hanya dapat ditutup saat jumlah tersisa nol; sisa yang tidak dipanen memerlukan pengurangan bertanggal dan beralasan. Koreksi harga historis meninggalkan audit.
7. Jalankan `npm run test:pilot` dan `npm run typecheck`; pastikan sesi hilang, role salah, dan area tidak tertugaskan ditolak.

### Task 12 amendment — impor legacy tanpa asumsi batch historis

**Objective:** Tampilkan data lama di preview tanpa menciptakan umur, biaya, atau pertumbuhan yang tidak diketahui.

**Files:**
- Modify `server/dashboardImport.ts` (dibuat pada Task 12), `server/dashboard.test.ts`, dan komponen preview Task 17 bila diperlukan.

**Steps:**
1. Tambahkan failing import tests: populasi lama tetap menjadi baseline legacy tanpa tanggal tebar sintetis; mortalitas area/tanggal lama tidak ditautkan otomatis; HPP “Benih …” tidak menjadi biaya bibit batch kedua; konflik/beban yang belum dipetakan muncul di preview.
2. Jalankan API tests dan pastikan kasus legacy gagal sebelum implementasi.
3. Implementasikan pemetaan opt-in. Kolam lama tetap menyimpan populasi/histori area; pengelola secara eksplisit membuat batch baseline dengan tanggal/jumlah/harga yang diketahui. Histori mortalitas tetap tak tertaut sampai pemetaan sadar dilakukan.
4. Tampilkan jumlah record yang tidak dipetakan dan tindakan yang diperlukan; uji konfirmasi serta retry idempotent.
5. Jalankan `npm run test:pilot`; pastikan Pilot dan sumber localStorage tetap utuh.

### Task 15 amendment — alur pengguna untuk pertumbuhan dan ekonomi

**Objective:** Pengguna melihat dan mencatat data batch hanya pada area tugasnya, dengan label estimasi/aktual yang jelas.

**Files:**
- Modify `src/services/dashboardApi.js`, `src/store/SmartStore.jsx`, `src/pages/AreaDetail.jsx`, dan kontrak terkait di `server/dashboard.test.ts`.

**Steps:**
1. Tambahkan failing API/bootstrap tests di `server/dashboard.test.ts` untuk batch, spesies, harga terbaru, bobot, mortalitas, panen, dan HPP tertaut; sertakan API error/empty responses.
2. Jalankan `npm run test:pilot`; pastikan kontrak baru gagal sebelum client/store terhubung.
3. Implementasikan service/store actions async; state diubah dari respons server dan mutasi memakai idempotency key. API failure tidak fallback ke seed/localStorage sebagai kebenaran.
4. Ubah `src/pages/AreaDetail.jsx` untuk menampilkan umur, jumlah hidup, sampel terbaru/tanggal, laju pertumbuhan bila ada dua sampel, nilai stok berlabel estimasi, kerugian bibit langsung, dan panen aktual. Tambahkan form sampel, mortalitas, serta panen (ekor, kg, harga aktual diawali harga acuan); bila ada beberapa batch, pengguna wajib memilih batch.
5. Uji empty/loading/error state, akses direct-ID, dan mutasi pada browser lokal; pastikan pengguna area lain tidak melihat data.
6. Jalankan `npm run test:pilot`, `npm run test:vpet`, `npm run typecheck`, dan `node node_modules/vite/bin/vite.js build`.

### Task 16 amendment — alur pengelola untuk stok awal dan harga/kg

**Objective:** Pengelola membuat batch tebar awal untuk kolam aktif dan mengatur harga per spesies tanpa mengubah histori transaksi.

**Files:**
- Modify `src/pages/admin/AdminAreas.jsx`, `src/pages/AreaDetail.jsx`, `src/store/SmartStore.jsx`, `src/services/dashboardApi.js`, dan `server/dashboard.test.ts`.

**Steps:**
1. Pastikan API tests Task 9 mencakup role dan validasi kolam; tambahkan regression test HPP tertaut/umum di `server/dashboard.test.ts`.
2. Jalankan `npm run test:pilot` dan pastikan regression test gagal sebelum HPP batch linking selesai.
3. Implementasikan form kolam aktif di `src/pages/admin/AdminAreas.jsx` dengan spesies, tanggal tebar, jumlah bibit, harga/ekor, total otomatis, dan populasi turunan; status istirahat boleh kosong.
4. Tampilkan spesies dipelihara dan form harga/kg bertanggal berlaku; perubahan harga tersimpan sebagai histori. Tambahkan pilihan batch opsional di form HPP pada `src/pages/AreaDetail.jsx`; bibit awal hanya dihitung melalui batch.
5. Jalankan `npm run test:pilot`, `npm run typecheck`, `npm run lint`, dan `node node_modules/vite/bin/vite.js build`; uji alur pengelola serta visibilitas update lintas role di browser lokal.

### Task 18 amendment — verifikasi ekonomi dan audit UI AFTER

**Objective:** Buktikan perhitungan batch dan akses kedua role konsisten tanpa menyentuh database aktif sebelum preflight migration utama lulus.

**Files:**
- Tests: `server/db.test.ts`, `server/dashboard.test.ts`, `server/fishEconomics.test.ts`.
- UI: `src/pages/admin/AdminAreas.jsx`, `src/pages/AreaDetail.jsx`.

**Steps:**
1. Jalankan schema/API suite pada schema uji: `docker compose --env-file docker.env.example --env-file .env.docker.lan exec -T api sh -lc 'TEST_DATABASE_URL="$DATABASE_URL" npm run test:pilot'`.
2. Jalankan `npm run test:vpet`, `npm run typecheck`, `npm run lint`, `node node_modules/vite/bin/vite.js build`, dan `npm run cek:aset`.
3. Uji browser lokal: pengelola membuat kolam/batch dan memperbarui harga; pengguna area merekam sampel, mortalitas, dan panen; keduanya melihat populasi sama setelah refresh; pengguna area lain tidak dapat membaca data.
4. Cocokkan hasil dengan unit test: biaya bibit satu kali, HPP tertaut/umum terpisah, estimasi kematian tidak dihitung dua kali, dan laba aktual hanya memakai transaksi panen saat batch ditutup.
5. Setelah fitur UI berfungsi, jalankan audit antislop mode AFTER dan laporkan temuan bernomor. Jangan lakukan polish di luar syarat fungsi sebelum pengguna memilih temuan.
6. Migration aktif tetap mengikuti backup, preflight, dan verifikasi salinan yang diwajibkan Task 18; minta konfirmasi eksplisit pengguna untuk target/waktu sebelum menjalankannya. Tidak ada `down -v`, reset, atau akses DB publik.
7. Jalankan `git diff --check`, pastikan staging hanya mencakup file tugas, dan jangan push.

**Tambahan Definition of done:** Batch awal/restock dapat ditelusuri terpisah; umur, laju bobot, mortalitas, panen, dan snapshot harga konsisten; estimasi jelas dibedakan dari aktual; hanya HPP tertaut masuk ekonomi batch; data legacy/HPP bibit tidak diduplikasi; otorisasi area diverifikasi di server.

## Definition of done

- Numbered migrations are repeatable and upgrade both empty schemas and v1 without losing existing Pilot data.
- Peer IoT schema contracts are represented without blind branch merge or unresolved TODO assumptions.
- PostgreSQL stores all mutable role data listed in the approved design; dashboard aggregates are derived.
- Server, not the browser, authorizes roles/area assignments and computes points/mortality effects.
- SmartDashboard no longer treats the full localStorage blob as live truth; opt-in import is safe, idempotent, auditable, and leaves the original untouched until verified.
- Fish batch economics records stocking, sample growth, mortality, harvest, and price snapshots without duplicate seed/HPP costs or fabricated historic values.
- Both role flows build and pass tests; Pilot API contracts and quotas remain intact.
- No real credentials pass over the current HTTP LAN URL; no database volume or existing data is deleted.
