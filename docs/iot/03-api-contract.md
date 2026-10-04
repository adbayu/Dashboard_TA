# API Contract: IoT System `/api/v1`

| Atribut | Isi |
| --- | --- |
| Status | Draft v0.1. Referensi final ada di `/docs` (OpenAPI), dokumen ini jadi acuan saat menulis schema route |
| Base URL lokal | `http://localhost:5173/api/v1` (lewat proxy Vite) atau `http://127.0.0.1:3001/api/v1` |
| Format | JSON UTF-8, kecuali `/stream` (SSE) dan `/qr` (SVG/PNG) |

## 1. Konvensi

- Waktu selalu ISO 8601 UTC dengan milidetik, contoh `2026-10-10T08:00:00.000Z`.
- Nama field memakai `camelCase`. Kode sensor memakai `snake_case` (`water_temperature`).
- Nilai sensor dikirim dalam satuan yang tercatat di `sensor_types.unit`: pH tanpa satuan, TDS dalam ppm, suhu dalam °C.
- Pagination berbasis cursor: response memuat `nextCursor`. Kalau `null`, berarti sudah halaman terakhir.
- Semua response memuat header `Cache-Control: no-store`, sama seperti pilot.

## 2. Autentikasi

| Klien | Cara |
| --- | --- |
| UI SmartDashboard | Cookie `pilot_session` dari `POST /api/session/login`. Request non-GET wajib membawa header `Origin` yang sama dengan `APP_ORIGIN` |
| Modul tim, mitra | `Authorization: Bearer jf_live_<64 hex>` atau `Bearer jf_test_<64 hex>` |
| ESP32 | `Authorization: Bearer <64 hex>` khusus untuk `POST /api/ingest` |

Mengirim cookie dan API key sekaligus akan ditolak dengan `400 AMBIGUOUS_AUTH`.

## 3. Scope

| Scope | Endpoint |
| --- | --- |
| `devices:read` | `GET /sensor-types`, `GET /device-types`, `GET /devices`, `GET /devices/:id` |
| `devices:write` | `POST /devices/claim`, `POST /devices/:id/release`, `PATCH /devices/:id` (nama dan area milik sendiri) |
| `readings:read` | `GET /devices/:id/latest`, `GET /devices/:id/readings`, `GET /sensors/:code/overview`, `GET /events`, `GET /stream` |
| `admin` | `POST/PATCH/DELETE /sensor-types`, `POST/PATCH /device-types`, `POST /devices`, `POST /devices/:id/qr`, `POST /devices/:id/activation`, `PUT /areas/:ref/thresholds` |

Sesi cookie memakai scope sesuai peran: `user` mendapat tiga scope pertama, `admin` mendapat keempatnya.
Pengecualian publik hanya `GET /devices?code=...` untuk pratinjau QR dengan field terbatas di bagian 6.3.

## 4. Error

Bentuk error sama dengan pilot, ditambah kode yang lebih spesifik:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Payload tidak valid.", "requestId": "req-1a" } }
```

| HTTP | `code` | Kapan |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Body, query, atau parameter tidak sesuai schema |
| 400 | `AMBIGUOUS_AUTH` | Cookie dan API key dikirim bersamaan |
| 401 | `UNAUTHENTICATED` | Tidak ada kredensial, kredensial salah, atau key sudah dicabut |
| 403 | `FORBIDDEN_SCOPE` | Kredensial valid tapi scope tidak cukup |
| 403 | `ORIGIN_REJECTED` | Request ber-cookie dengan `Origin` yang tidak diizinkan |
| 404 | `NOT_FOUND` | Resource tidak ada atau bukan milik actor (sengaja tidak dibedakan) |
| 409 | `CONFLICT` | Device sudah diklaim, `messageId` dipakai untuk payload berbeda, tipe masih dipakai |
| 429 | `RATE_LIMITED` | Melebihi batas. Lihat header `retry-after` |
| 503 | `UNAVAILABLE` | Database atau layanan internal tidak tersedia |

Route pilot lama (`/api/*` tanpa `v1`) tetap memakai `REQUEST_REJECTED` untuk semua 4xx supaya `PilotApp.jsx` tidak berubah.

## 5. Rate limit

| Kredensial | Batas (usulan awal) |
| --- | --- |
| Key `live` | 60 request per menit per key |
| Key `test` | 30 request per menit per key |
| Sesi cookie | 120 request per menit per IP (batas global pilot sekarang) |
| `POST /api/ingest` | 120 request per menit per IP (global) |

Setiap response membawa header `x-ratelimit-limit`, `x-ratelimit-remaining`, dan `x-ratelimit-reset` dari `@fastify/rate-limit`. Response 429 juga membawa `retry-after`.

## 6. Endpoint

### 6.1 Jenis sensor

`GET /sensor-types` (scope `devices:read`)

```json
{ "sensorTypes": [
  { "code": "ph", "name": "pH Air", "unit": "pH", "min": 0, "max": 14, "decimals": 2, "warnLow": 6.2, "warnHigh": 7.6 },
  { "code": "tds", "name": "TDS", "unit": "ppm", "min": 0, "max": 5000, "decimals": 0, "warnLow": 400, "warnHigh": 900 }
] }
```

`POST /sensor-types` (scope `admin`) dengan body yang sama untuk satu item. `PATCH /sensor-types/:code` hanya untuk `name`, `decimals`, `warnLow`, `warnHigh`. `DELETE` ditolak 409 kalau sensor dipakai oleh tipe mana pun.

Catatan: rentang `min` dan `max` untuk `tds` di atas adalah contoh format. Nilai finalnya mengikuti rentang ukur modul TDS yang dipakai (lihat [Firmware & Hardware](04-firmware-hardware.md)).

### 6.2 Tipe IoT

`GET /device-types?kind=satuan|paket` (scope `devices:read`)

```json
{ "deviceTypes": [
  { "id": "9b1c...", "code": "AQ-PH", "name": "Sensor pH", "kind": "satuan", "active": true,
    "sensors": [{ "code": "ph", "label": "Probe pH" }] },
  { "id": "41d2...", "code": "AQ-WATER-01", "name": "Paket Kualitas Air", "kind": "paket", "active": true,
    "sensors": [{ "code": "ph", "label": "Probe pH" }, { "code": "tds", "label": "Probe TDS" }, { "code": "water_temperature", "label": "DS18B20" }] }
] }
```

`POST /device-types` (scope `admin`)

```json
{ "code": "AQ-WATER-01", "name": "Paket Kualitas Air", "kind": "paket", "description": "",
  "sensors": [{ "code": "ph", "label": "Probe pH" }, { "code": "tds", "label": "Probe TDS" }, { "code": "water_temperature", "label": "DS18B20" }] }
```

Aturan: `satuan` tepat 1 sensor, `paket` minimal 2. `PATCH /device-types/:id` dapat mengubah `name`, `description`, `active`, dan daftar `sensors` hanya sebelum ada device yang memakai tipe tersebut. Setelah dipakai, perubahan sensor ditolak dengan 409 `CONFLICT`; buat tipe baru jika konfigurasi sensor berubah.

### 6.3 Device

`GET /devices?type=AQ-PH&area=AR-01&cursor=` (scope `devices:read`)

```json
{ "devices": [
  { "id": "5e0a...", "code": "AQ-PH-001", "legacyId": "IOT-001", "name": "Sensor pH Kolam Nila A",
    "type": { "code": "AQ-PH", "kind": "satuan" }, "areaRef": "AR-01",
    "status": "online", "lastMeasuredAt": "2026-10-10T08:00:00.000Z", "lastReceivedAt": "2026-10-10T08:00:01.120Z",
    "firmware": "0.3.0", "rssi": -58, "calibratedAt": "2026-10-08T03:00:00.000Z" }
], "nextCursor": null }
```

`status` bernilai `online`, `stale`, atau `offline`.

`GET /devices/:id` mengembalikan satu device dengan bentuk yang sama, ditambah `sensors` beserta ambang efektifnya.

`GET /devices?code=AQ-PH-001&c=<64 hex>` adalah pratinjau publik untuk halaman QR. Response hanya memuat `code`, `name`, `type`, `sensors`, `claimed`, dan `activationValid`. Endpoint ini tidak mengembalikan area, readings, ID pemilik, credential, atau kode aktivasi. `c` diperiksa terhadap hash aktivasi aktif dan tidak pernah dikembalikan. Kode alat tidak dikenal mendapat 404 `NOT_FOUND`.

`GET /devices?legacyId=IOT-001` memerlukan scope `devices:read` dan mengikuti batas akses device actor.

`POST /devices` (scope `admin`)

```json
// request
{ "typeCode": "AQ-WATER-01", "name": "Paket Kolam Nila B", "areaRef": "AR-02", "allocatedTo": null }
// response 201
{ "device": { "id": "c3f1...", "code": "AQ-PKT-001" },
  "credential": "<64 hex, hanya ditampilkan sekali>",
  "activationCode": "<64 hex, hanya ditampilkan sekali>" }
```

`POST /devices/:id/qr?format=svg|png` (scope `admin`) menerima body `{ "activationCode": "<64 hex>" }` dan mengembalikan gambar QR berisi `https://<APP_ORIGIN>/d/<code>?c=<activationCode>`. Server mencocokkan hash dan masa berlaku, lalu tidak menyimpan kode mentah. Kode salah, sudah diganti, sudah dipakai, atau kedaluwarsa mendapat 409 `CONFLICT`. Kode aktivasi baru dibuat lewat `POST /devices/:id/activation`, ditampilkan sekali, dan langsung membatalkan kode lama. Label dicetak saat alat siap dipasang ([ADR-0009](adr/0009-qr-dicetak-saat-pemasangan.md), [ADR-0011](adr/0011-qr-dibuat-dengan-kode-aktivasi-di-body.md)).

`POST /devices/claim` (scope `devices:write`)

```json
{ "code": "AQ-PKT-001", "activationCode": "<64 hex>" }
```

Response `200 { "deviceId": "c3f1..." }`. Kode salah, kedaluwarsa, atau bukan untuk akun ini mendapat 400. Device yang sudah punya pemilik mendapat 409.

`PATCH /devices/:id` (scope `devices:write`) mengubah `name` dan `areaRef` device milik sendiri. Admin juga bisa mengubah `firmware` dan `calibratedAt`.

`POST /devices/:id/release` (scope `devices:write`) melepas kepemilikan. Riwayat tetap milik pemilik lama.

### 6.4 Readings

`GET /devices/:id/latest` (scope `readings:read`)

```json
{ "measuredAt": "2026-10-10T08:00:00.000Z",
  "readings": [
    { "sensor": "ph", "value": 7.02, "unit": "pH", "state": "normal" },
    { "sensor": "tds", "value": 950, "unit": "ppm", "state": "high" }
  ] }
```

`state` bernilai `normal`, `low`, `high`, atau `unknown` (tidak ada ambang).

`GET /devices/:id/readings?sensor=ph&from=...&to=...&bucket=5m` (scope `readings:read`)

```json
{ "sensor": "ph", "bucket": "5m",
  "points": [ { "t": "2026-10-10T08:00:00.000Z", "avg": 7.01, "min": 6.98, "max": 7.04, "n": 10 } ],
  "threshold": { "low": 6.5, "high": 7.5, "source": "area" } }
```

`bucket` bernilai `1m`, `5m`, `1h`, atau `raw`. Mode `raw` dibatasi 100 baris per halaman dan memakai `cursor`, sama seperti `/api/devices/:id/history` di pilot. Rentang `from` sampai `to` maksimal 31 hari.

`GET /sensors/:code/overview` (scope `readings:read`) mengembalikan nilai terakhir satu jenis sensor di semua device milik actor:

```json
{ "sensor": "ph", "items": [
  { "deviceId": "5e0a...", "deviceCode": "AQ-PH-001", "areaRef": "AR-01", "value": 6.8, "state": "normal", "measuredAt": "..." },
  { "deviceId": "c3f1...", "deviceCode": "AQ-PKT-001", "areaRef": "AR-02", "value": 6.1, "state": "low", "measuredAt": "..." }
] }
```

### 6.5 Ambang per area

`PUT /areas/:ref/thresholds` (scope `admin`)

```json
{ "thresholds": [ { "sensor": "ph", "low": 6.5, "high": 7.5 }, { "sensor": "tds", "low": 500, "high": 900 } ] }
```

Mengirim `low` dan `high` bernilai `null` untuk sebuah sensor berarti kembali ke ambang default.

### 6.6 Log kejadian

`GET /events?deviceId=&type=&cursor=` (scope `readings:read`)

```json
{ "events": [
  { "id": 812, "deviceId": "c3f1...", "type": "threshold_low", "sensor": "ph", "value": 6.1, "at": "2026-10-10T08:05:00.000Z" }
], "nextCursor": "ODEx" }
```

### 6.7 Stream (SSE)

`GET /stream` (scope `readings:read`), header `Accept: text/event-stream`.

```
id: 813
event: reading
data: {"deviceId":"c3f1...","measuredAt":"2026-10-10T08:05:30.000Z","readings":{"ph":6.12,"tds":640,"water_temperature":27.6}}

id: 814
event: device_event
data: {"deviceId":"c3f1...","type":"threshold_low","sensor":"ph","value":6.12}

: heartbeat
```

Untuk browser, pakai `EventSource` dengan `withCredentials: true`. `EventSource` tidak bisa mengirim header `Authorization`, jadi klien API key perlu memakai library SSE yang mendukung header custom, atau polling `/latest`.

### 6.8 API key

| Endpoint | Fungsi |
| --- | --- |
| `GET /keys` | Daftar key milik akun (tanpa secret) |
| `POST /keys` | Buat key. Body `{ "name", "environment": "live" \| "test", "scopes": [] }`. Response memuat `secret` satu kali |
| `DELETE /keys/:id` | Cabut key, berlaku langsung |
| `GET /keys/:id/usage?days=7` | Jumlah request per hari, persentase error, dan 5 route terbanyak |

Endpoint `/keys` hanya bisa diakses dengan sesi cookie. API key tidak bisa dipakai untuk membuat key lain.

### 6.9 Sandbox

`PUT /sandbox/devices/:id/scenario` (sesi atau key `test`)

```json
{ "scenario": "ph_turun" }
```

Nilai yang valid: `normal`, `ph_turun`, `suhu_naik`, `offline`.

## 7. Ingest (untuk firmware)

`POST /api/ingest`. Endpoint ini sengaja tidak dipindah ke `/api/v1`, supaya alat yang sudah terpasang tidak perlu diubah URL-nya.

```json
{ "version": 2, "deviceId": "c3f1...", "type": "AQ-WATER-01",
  "messageId": "0b7e...", "measuredAt": "2026-10-10T08:00:00.000Z",
  "readings": { "ph": 7.02, "tds": 612, "water_temperature": 27.4 },
  "meta": { "rssi": -61, "fw": "0.3.0" } }
```

| Response | Arti | Yang dilakukan firmware |
| --- | --- | --- |
| `200 { accepted: true, duplicate: false }` | Diterima | Hapus pesan dari buffer |
| `200 { accepted: true, duplicate: true }` | Sudah pernah diterima | Hapus pesan dari buffer |
| `400` | Payload salah | Simpan pesan ke log error, jangan dikirim ulang terus-menerus |
| `401` | Credential salah atau sudah dirotasi | Berhenti mengirim, minta provisioning ulang |
| `409` | Tidak ada pemilik pada waktu pengukuran, atau `messageId` bentrok | Simpan ke log error, lanjut ke pesan berikutnya |
| `429`, `5xx`, timeout | Gangguan sementara | Coba lagi dengan backoff, pesan tetap di buffer |

Retry dengan `deviceId` dan `messageId` yang sama menghasilkan `duplicate: true` hanya jika `version`, `model` atau `type`, `measuredAt`, `readings`, dan `meta` sama. Perubahan pada salah satu field payload dengan `messageId` yang sama menghasilkan 409 `CONFLICT`.

## 8. Versi

- Perubahan yang menambah field atau endpoint tidak menaikkan versi.
- Menghapus atau mengganti arti field berarti `/api/v2`. `/api/v1` tetap hidup minimal 3 bulan setelah `v2` dirilis (usulan).
- Setiap perubahan dicatat di `docs/iot/changelog.md`.
