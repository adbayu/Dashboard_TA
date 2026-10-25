# Audit Keamanan JagoFarm IoT — 25 Oktober 2026

Ruang lingkup: repo `C:\TA\Dashboard_TA` (branch `main`, HEAD saat audit), kode `server/` (Fastify 5 + PostgreSQL) dan `src/` (React 19 + Vite), konfigurasi deploy (`deploy/`, `docker/`, `compose.yaml`), dependency (`npm audit`), serta `firmware/src`.

Metode: audit statis read-only (baca kode + grep terarah + `npm audit`). Tidak ada perubahan kode, tidak ada uji dinamis ke server berjalan (Postgres/Docker tidak dipakai agar tidak mengubah state), tidak ada uji perangkat fisik.

Catatan: **repo ini tidak berisi PHP sama sekali** (0 file `.php`). 144 file JS/JSX/TS/TSX. Jadi CVE PHP Oktober tidak relevan; yang relevan adalah CVE paket JS/Node.

---

## 0. Status perbaikan (25 Oktober, sesi yang sama)

| ID | Temuan | Status |
|---|---|---|
| H-1a | Cegah kredensial QA ter-commit | **Selesai** — `Test-case/` masuk `.gitignore` |
| H-1b | Cabut key/sesi/kredensial bocor | **Belum** — hanya bisa di VPS (bagian 3) |
| M-1 | Pratinjau QR anonim tanpa batas | **Selesai** — 20 permintaan / 10 menit per IP untuk permintaan tanpa kredensial |
| M-2 | Header keamanan lapisan statis | **Selesai di repo**, aktif setelah `web` redeploy |
| M-3 | Login tanpa lockout + CPU scrypt | **Selesai** — lockout 8 gagal / 15 menit per email, antrean scrypt maks 4 paralel |
| M-4 | Portal provisioning terbuka | **Selesai di kode**, butuh reflash unit |
| L-1 | Password/akun demo di bundle produksi | **Selesai** — `__DEMO_MODE__`; 0 kemunculan di `dist` hasil build baru |
| L-2 | `/docs` publik di produksi | **Selesai** — 404 saat `NODE_ENV=production` |
| L-3 | Ingest v1 backfill sebelum rotasi | **Batal, bukan temuan** — lihat koreksi di bagian L-3 |
| L-4 | Audit log admin | **Ditunda** — butuh migration 008 + update 3 assertion di `db.test.ts` |
| L-5 | `document.write` cetak QR | **Selesai** — DOM via `createElement` |
| L-6 | Dependency rentan | **Sebagian** — 2 high + 4 moderate hilang; sisa 3 moderate khusus build Tailwind |

Gate setelah perubahan: `typecheck` lulus, `lint` lulus (hanya warning lama `PetKarakter.jsx`), `build` lulus, `test:pilot` 23/23, `test:v1` 86/86, `test:security` 4/4 (baru), `test:vpet` 91/91, `test:qr` 4/4, `git diff --check` bersih.

Dua suite `src/` sudah merah sebelum perubahan ini dan bukan regresi (diverifikasi terhadap HEAD): `frontendReview.test.js` menuntut `PublicAreaLabel` di `DetailInformation.jsx` (0 kemunculan di HEAD) dan `uiContrast.test.js` (border alpha `glass-input` + parsing `rgb(var(--c-...))`).

## 1. Temuan

### H-1 (High) — Kredensial live tersimpan plaintext di working tree dan TIDAK di-ignore git

Bukti:
- `Test-case/shot2/api-qa2.sh:6` → `LIVE=jf_live_dac1…` (API key 64 hex, prefix cocok dengan key "QA2 curl admin" environment **live**, scope `devices:read, devices:write, readings:read, admin` di `Test-case/shot2/key_curl.json`).
- Session cookie aktif: `Test-case/shot2/user-cookie.txt`, `mitra-cookie.txt`, `cookie.txt` (token `pilot_session` 64 hex).
- Credential device: `Test-case/shot2/cred.txt`, `device1.json`, `device2.json`, `rotate.json`, `activation2.txt`.
- `git check-ignore Test-case/shot2/api-qa2.sh` → **NOT IGNORED**; `Test-case/` untracked (`?? Test-case/`), jadi satu `git add -A` / `git add .` akan meng-commit semua kredensial. Belum pernah masuk history (`git log --all -- Test-case` kosong), jadi belum bocor lewat git.

Dampak: siapa pun yang bisa membaca folder repo (atau commit berikutnya) memegang akses admin penuh ke API live, plus sesi pengguna/mitra yang mungkin masih valid.

Remediasi:
1. Cabut key live tersebut: `DELETE /api/v1/keys/<id>` dengan sesi admin, atau `UPDATE api_keys SET revoked_at=clock_timestamp() WHERE prefix='jf_live_dac1'`.
2. Hapus semua sesi: `DELETE FROM sessions;`.
3. Rotasi credential device yang tercantum di file-file itu (kalau device masih dipakai).
4. Tambah `Test-case/` (atau minimal `Test-case/**/*cookie*`, `*key*`, `cred*`) ke `.gitignore`, lalu bersihkan isi file kredensial; simpan hanya placeholder.

### M-1 (Medium) — Preview QR tidak butuh autentikasi + kode device mudah ditebak (enumerasi)

Bukti:
- `server/features/pilot/app.ts:223` — preHandler auth di-skip total untuk `GET /api/v1/devices` yang punya `?code=`.
- `server/v1/devices.ts:160-180` — cabang `query.code` jalan tanpa `requireActor()`, mengembalikan `name`, `areaRef`, `type`, daftar `sensors`, `claimed`, `activationValid`.
- `server/v1/devices.ts:113-123` — `allocateCode()` membuat kode berurutan `PREFIX-001`, `PREFIX-002`, … sehingga seluruh device (maks 20 unit pilot) bisa ditebak.

Dampak: tanpa login, penyerang bisa memetakan nama unit/area dan status klaim semua device (120 req/menit per IP, cukup untuk 20 kode). `activationValid` sendiri tidak bisa dipalsukan tanpa kode aktivasi 64 hex.

Remediasi: beri limit lebih ketat khusus preview (mis. 10/menit/IP), jangan kirim `name`/`areaRef` sebelum kode aktivasi valid, atau wajibkan token preview sekali pakai di URL QR.

### M-2 (Medium) — Header keamanan lapisan statis tidak lengkap pada topologi deploy (Caddy)

Bukti: `deploy/Caddyfile:8-12` hanya `Referrer-Policy`, `X-Content-Type-Options`, `-Server`. Topologi deploy memakai `file_server` Caddy (`deploy/Caddyfile:22-33`), bukan container nginx — jadi `X-Frame-Options DENY` yang ada di `docker/nginx/default.conf` **tidak ikut terpakai**. HSTS hanya dikirim API (`server/features/pilot/app.ts:184`, hanya saat `production`), sehingga dokumen HTML statis tidak pernah dapat HSTS. Tidak ada CSP dan tidak ada Permissions-Policy di mana pun.

Dampak: clickjacking pada UI dashboard, dan tidak ada lapisan kedua bila suatu saat ada XSS di bundle.

Remediasi (contoh di blok `header` Caddy):
```
Strict-Transport-Security "max-age=31536000; includeSubDomains"
X-Frame-Options "DENY"
Permissions-Policy "geolocation=(), microphone=(), camera=()"
Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
```

### M-3 (Medium) — Login tanpa lockout per akun, dan scrypt mahal bisa dipakai untuk kehabisan CPU

Bukti: `server/features/pilot/app.ts:274-288` — limit hanya `10 / 5 menit` per IP; tidak ada counter per email. `server/features/masuk/security.ts:2` — scrypt `N=131072, r=8, p=1` ≈ ratusan ms–1 s CPU per percobaan. Endpoint `POST /api/invitations/accept` (`app.ts:313-320`) juga memanggil scrypt dan hanya dibatasi per IP.

Dampak: brute force terdistribusi (banyak IP) tidak terhalang; rentetan request login dari banyak IP bisa menghabiskan CPU node API (efek DoS ke seluruh layanan).

Remediasi: backoff/lockout per email (mis. 10 gagal → tunda bertahap), batasi konkurensi hashing (semaphore), dan pertimbangkan captcha pada kegagalan berulang.

### M-4 (Medium, firmware) — Portal provisioning WiFiManager terbuka tanpa password

Bukti: `firmware/src/main.cpp:221` (`setConfigPortalTimeout(300)`), `:246` (`manager.startConfigPortal(apName.c_str())` — tanpa argumen password), field `api_url` dan `credential` di `:228-230`.

Dampak: selama 5 menit jendela provisioning, siapa pun dalam jangkauan WiFi bisa masuk ke portal, mengubah `api_url` ke server penyerang, atau mengintip alur instalasi. Credential device diketik manual oleh installer, jadi risiko utamanya pengalihan endpoint/harvesting, bukan pembacaan NVS.

Remediasi: AP berpassword (acak per unit, dicetak di label/serial), validasi ketat host `api_url` terhadap domain resmi, dan pertahankan pinning root CA (`firmware/include/root_ca.h` sudah ada).

### L-1 (Low) — Password & akun demo ikut ter-bundle ke build produksi

Bukti: `src/kelola-user/data/seed.js:6` (`DEMO_PASSWORD = 'jagofarm123'`), dipakai `src/masuk/pages/Login.jsx:5` dan `src/kelola-user/pages/AdminUsers.jsx`; terbukti 3 kemunculan literal di `dist/assets/SmartApp-*.js`. Jalur login lokal tidak aktif saat `VITE_IOT_SOURCE=api` (default, `src/services/iotApi.js:24-32`), jadi tidak memberi akses server — hanya kredensial demo yang terkirim ke browser.

Remediasi: import seed demo secara dinamis hanya saat `IOT_SOURCE === 'local'` agar ter-tree-shake dari build produksi.

### L-2 (Low) — `/docs` dan `/docs/openapi.json` publik di produksi

Bukti: `server/features/pilot/app.ts:210-213` (`publicRoutes`). Dampak: seluruh permukaan API + skema terbuka tanpa login (informasi untuk penyerang). Remediasi: batasi ke admin atau matikan saat `NODE_ENV=production`.

### L-3 — BATAL (bukan temuan)

Klaim awal: path ingest v1 tidak memeriksa `credential_since`. Setelah `server/features/pilot/app.ts` dibaca ulang, baris 414-416 sudah memuat `AND d.credential_since<=$4::timestamptz` (dengan `$4 = measuredAt`), sama seperti v2 (`server/v1/ingest.ts:51`). Temuan ini dicabut dan tidak ada perubahan kode.

### L-4 (Low) — Tidak ada audit log aksi admin

Hanya `api_usage` untuk API key (`app.ts:251-266`, `readings-export.ts:166-181`). Pembuatan/rotasi device, undangan akun, dan perubahan threshold tidak tercatat aktor+target. Remediasi: tabel `admin_audit(actor_id, action, target, at, ip)`.

### L-5 (Low) — `document.write` jendela cetak QR menyisipkan `kode` tanpa escape

Bukti: `src/shared/qr/components/AksiQr.jsx:174-178`. Saat ini `kode` selalu berasal dari server dengan pattern `[A-Z0-9-]{3,32}` (`server/v1/common.ts:27`), jadi belum bisa dieksploitasi; tetap rapuh bila sumber berubah. Remediasi: bangun DOM dengan `textContent` / `img.src = url`.

### L-6 (Low) — Dependency rentan (`npm audit`: 2 high, 7 moderate)

- `vite 8.2.2` (high, `GHSA-587h-7wmj-h5pm` + 4 lainnya) — build/dev tool.
- `undici 7.x` via `@scalar/fastify-api-reference@1.75.0` (high `GHSA-xjj6-f33q-929c`) — hanya untuk halaman `/docs`.
- `nodemailer 10.0.9` (4 moderate addressparser/DKIM) — runtime, dipakai mengirim undangan (`server/index.ts:74-89`).
- `fast-uri` (moderate/low) via fastify — runtime.
- `tailwindcss`/`postcss`/`postcss-selector-parser` — build only.

Remediasi: `npm install nodemailer@10.2.1 @scalar/fastify-api-reference@1.76.0` lalu `npm audit fix`; `fast-uri` sudah 4.2.3 (perlu bump fastify/lockfile). Review ulang setelah update.

---

## 2. Yang sudah benar (terverifikasi di kode)

- **SQL injection**: semua query parameterized; fragmen dinamis hanya dari whitelist kolom/placeholder (`devices.ts:386-398`, `events.ts:44-92`, `readings-export.ts:308-312`, `device-types.ts:146`). Tidak ada interpolasi input user ke SQL.
- **Password**: scrypt N=131072 + salt unik + `timingSafeEqual`; dummy hash untuk menyamakan waktu saat email tidak ada (`security.ts`, `app.ts:163,279`).
- **Token/kunci**: 32 byte acak, disimpan SHA-256, lookup prefix + `timingSafeEqual` (`auth/api-key.ts`), `activation_hash` + expiry 24 jam.
- **Sesi**: cookie `httpOnly`, `SameSite=strict`, `path=/api`, `secure` saat produksi; token lama dihapus saat login (anti fixation); origin check untuk semua non-GET yang membawa cookie (`app.ts:203-208`, 281-287).
- **Otorisasi**: setiap route v1 punya `config.scope`/`requireAdmin`, dan kepemilikan device dicek ulang lewat SQL (`v1/access.ts`) — tidak ditemukan IDOR; device sandbox dipisah per environment key.
- **Validasi input**: AJV `additionalProperties:false`, `removeAdditional:false`, `coerceTypes:false`, bodyLimit 4 KB, semua UUID/pattern ketat, cursor divalidasi (`events.ts:28-37`, `readings.ts:70-84`).
- **Error & log**: 5xx → `UNAVAILABLE` + requestId tanpa detail; error validasi diganti pesan generik; logger meredaksi `req.headers` dan field sensitif (`app.ts:78-81`, 164-179).
- **Secret config**: `.env` tidak tracked, `.dockerignore` mengecualikan `.env`, startup fail-fast tanpa mencetak nilai (`server/index.ts:30-33`).
- **Deploy**: `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`, APP_ORIGIN wajib HTTPS di produksi (`index.ts:64`), container `no-new-privileges` + `cap_drop: ALL`, user `node`/`nginx-unprivileged`, API tidak publish port langsung.
- **SSE**: maks 5 koneksi per actor + visibilitas per event saat publish (`stream.ts:65-67,153-178`).
- **Export Excel**: cap 200.000 baris, maks 2 ekspor aktif/actor, 5/menit, `statement_timeout` 10 s, nama file disanitasi.
- **Firmware**: tidak ada credential/SSID hardcoded; credential 64 hex diminta lewat portal dan divalidasi (`main.cpp:112-230`); root CA dipin.

---

## 3. Berkas yang diubah pada sesi perbaikan

Server:
- `server/auth/preview-limit.ts` (baru) — kuota pratinjau anonim per IP.
- `server/auth/login-failure-limit.ts` (baru) — lockout login per email.
- `server/auth/security-limits.test.ts` (baru) + script `test:security`.
- `server/features/masuk/security.ts` — antrean scrypt (4 paralel, 32 antrean).
- `server/features/pilot/app.ts` — kuota pratinjau, lockout login, `/docs` ditutup saat produksi.

Klien:
- `src/kelola-user/data/seed.js`, `vite.config.js` — data demo hanya ada di mode lokal.
- `src/shared/qr/components/AksiQr.jsx` — cetak QR tanpa `document.write`.

Deploy/firmware/dependency:
- `deploy/Caddyfile` — HSTS, CSP, XFO, Permissions-Policy.
- `firmware/src/main.cpp` — password AP provisioning dari MAC.
- `.gitignore`, `package.json`, `package-lock.json` — ignore bukti QA + bump dependency.

Tidak ada commit yang dibuat; perubahan ditinggal di working tree untuk direview.

---

## 4. Wajib dikerjakan di VPS

1. Backup: `docker compose exec -T database pg_dump -U pilot jagofarm | gzip > ~/jagofarm-$(date +%F).sql.gz`
2. Cabut key live bocor: `UPDATE api_keys SET revoked_at=clock_timestamp() WHERE prefix='jf_live_dac1';`
3. Hapus sesi: `DELETE FROM sessions;`
4. Rotasi credential device yang bocor (`POST /api/v1/devices/:id/credentials/rotate`), lalu update alat.
5. Verifikasi: request dengan key/cookie lama harus 401.
6. Pastikan 3001/5432 tertutup (`ss -lntp` + firewall); hanya 22/80/443.
7. `docker compose up -d --build web` lalu `curl -I https://DOMAIN` harus memuat HSTS/CSP/XFO.
8. `docker compose up -d --build api` setelah perubahan dependency, lalu `docker compose exec api npm audit --omit=dev`.
9. Cek env runtime: `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`, `APP_ORIGIN=https://…`, `deploy/.env` mode 600.
10. Mailpit 8025 tetap hanya lewat SSH tunnel.
11. Reflash unit terpasang untuk password AP baru (portal kini meminta password `JagoFarm-Setup-XXXX`).

---

## 5. Belum diuji

- Uji dinamis ke VPS/server produksi (tidak ada akses host).
- Pemindaian QR fisik dan provisioning perangkat setelah perubahan firmware.
- Perilaku rate limit/lockout lewat HTTP penuh di belakang proxy (unit test lulus, integrasi HTTP khusus belum ada).
- Validitas sesi/kunci di `Test-case/shot2` terhadap server pilot — sampai dicabut, anggap masih hidup.
