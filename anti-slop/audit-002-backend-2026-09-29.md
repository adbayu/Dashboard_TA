# Audit Anti-Slop 002 — Backend Pilot JagoFarm (Fastify + PostgreSQL)

Tanggal: 2026-09-29
Lingkup: `server/` (app.ts, db.ts, domain.ts, index.ts, simulator.ts, schema.sql) + UI pilot
(`src/PilotApp.jsx`, `src/pilot.css`, `src/services/pilotApi.js`).
Status: **LAPORAN SAJA. Tidak ada satu pun perbaikan yang dijalankan pada backend** (diminta eksplisit).
Cara uji: API dijalankan sungguhan (`127.0.0.1:3001`), PostgreSQL 17 di kontainer (port 5433),
Mailpit di 1025/8025, UI pilot di `http://localhost:5173/pilot` (dev server, proxy `/api`).
Semua angka di bawah hasil panggilan HTTP nyata, bukan pembacaan kode.

Prioritas: Hard Gate = TINGGI, Purpose-Gate = SEDANG, Quality Locks = RENDAH.

---

## Status perbaikan (diperbarui 2026-09-29, belum di-push)

**Semua temuan di laporan ini sudah DIPERBAIKI dan diuji ulang.** Satu temuan
(B-2) ternyata keliru dan saya tarik — lihat catatan koreksi di bawah.

| No | Aturan | Perbaikan | Bukti setelah perbaikan |
| --- | --- | --- | --- |
| B-1 | R-24 | `BrowserRouter` pilot memakai `basename="/pilot"`; fallback sesi 401 kembali ke `/pilot`, bukan akar; tautan ke SmartDashboard jadi `/masuk` | `/pilot` tetap `http://localhost:5173/pilot` setelah login; F5 di `/pilot/perangkat` tetap di pilot; `http://localhost:5173/pilot/perangkat/<uuid>` sekarang mendarat di halaman detail pilot (dulu halaman masuk SmartDashboard) |
| B-3 | R-32 | Warna indikator fokus `#9b6417` → `#134b35` | Terukur 10.07:1 di atas panel putih, 9.35:1 di atas latar halaman (dulu 2.49:1). Diuji pada 4 elemen pertama yang dijangkau Tab |
| B-4 | R-05/C-2 | Tombol heading jadi "+ Pasang unit" (sesuai fungsinya: memasang unit dengan kode aktivasi dari admin, bukan menambah perangkat) | Label baru terbaca di UI pilot |
| B-5 | R-04 | Emoji di `<title>` | Tidak berlaku lagi: judul sekarang "AquaSmartponik: Dashboard TA JagoFarm" tanpa emoji (sudah bersih sebelum perbaikan ini) |
| B-6 | R-09 | Kapsul "Pilot" di brand dihapus; status pilot dibawa baris akun + footer | `document.querySelector('.pilot-brand span')` → tidak ada; brand terbaca "JagoFarm" |
| B-7 | R-10/R-12 | Kaca header dilepas; bayangan tiga lapis → satu lapis; latar hampir pekat | `backdrop-filter: none`, `box-shadow` satu lapis `rgba(25,60,44,.08) 0 1px 3px` |
| B-8 | R-31 | Skala radius pilot ditulis sebagai variabel (10/12/20/999 px); 7 radius liar (6/16/22/24) diselaraskan | Seluruh `border-radius` di pilot.css kini memakai variabel skala |
| B-9 | R-27 | Pesan galat badan non-JSON tidak lagi menebak sebab | "Balasan /api tidak berupa JSON. Server tidak menjawab sebagai API." |
| — | R-03 | Bonus temuan saat uji: skip link pilot hanya 26px | Setelah difokus terukur 58px (syarat 44px) |

Regresi yang dijalankan setelah perbaikan: 15/15 uji kontrak API lulus,
0 kegagalan kontras di UI pilot (3 halaman) dan di SmartApp (9 halaman × 2 tema),
0 teks terpotong, 0 em dash di teks UI, 0 error runtime.

### Koreksi: B-2 ditarik (temuan saya salah)

B-2 menyebut ada 2 em dash di `src/PilotApp.jsx`. Setelah diperiksa ulang:
`grep -c "—" src/PilotApp.jsx` → **0**. Tidak ada em dash di berkas itu, baik di
teks UI maupun di komentar. Halaman pilot juga terbukti 0 em dash saat dirender.
Jadi B-2 tidak pernah nyata; yang saya lihat saat itu adalah em dash di berkas
lain (sudah ditangani di laporan 001). Temuan ini ditarik, bukan "diperbaiki".

---

## TINGGI

### B-1. R-24 (aturan navigasi) — rute UI pilot mati begitu halaman dimuat ulang
`PilotApp.jsx` memakai `BrowserRouter` dengan rute `/`, `/perangkat/:id`, `/admin` tanpa awalan
`/pilot`. Sementara `src/main.jsx` memilih aplikasi dari path: hanya `'/pilot'` atau `'/pilot/…'`
yang memuat PilotApp, sisanya SmartApp. Bukti terukur:
- buka `http://localhost:5173/pilot` → UI pilot hidup, tetapi URL **berubah menjadi `http://localhost:5173/`**;
- muat ulang di URL itu → yang muncul halaman masuk SmartDashboard (h1 "Masuk ke dashboard aquaponik Anda"), bukan pilot;
- `http://localhost:5173/perangkat/<uuid>` (alamat detail perangkat) dimuat ulang → SmartDashboard ("Masuk ke dashboard aquaponik Anda"), bukan detail perangkat.
Akibat bagi pengguna: tombol bookmark, refresh, dan tombol kembali browser memindahkan pengguna
keluar dari pilot. Tautan "Lihat detail" hanya bekerja sebagai navigasi internal.
Perbaikan yang disarankan (belum dikerjakan): `basename="/pilot"` pada `BrowserRouter` di
`PilotApp.jsx`, ATAU bangun rute pilot dengan awalan `/pilot/…` seperti pola SmartApp.

### B-2. R-02 — em dash (—) di teks yang dilihat pengguna
Ditemukan **2** tempat di UI pilot:
- `src/PilotApp.jsx` (tooltip tombol segarkan): teks "Terakhir … — muat ulang".
- `src/PilotApp.jsx` (catatan koneksi): "Terhubung bukan berarti …" memakai tanda pisah yang sama.
(Saat audit ini dijalankan, teks yang benar-benar dirender sudah bersih: 0 em dash di halaman `/pilot`,
`/pilot/perangkat`, `/perangkat/:id`, `/pilot/akun`. Jadi temuan ini menyangkut berkas yang belum
masuk bundel terakhir, bukan yang sedang tampil.)
Catatan: seluruh `server/*.ts` (pesan galat API, teks email undangan) **bersih** dari em dash.

### B-3. R-32 — indikator fokus pilot kontras 2.49:1 (syarat non-teks 3:1)
`pilot.css` memakai `outline: 3px solid #9b6417` (amber tua) untuk `:focus-visible`. Terukur
terhadap latar panel `#fff` dan latar `#f6f7f2`:

| warna | latar | rasio |
| --- | --- | --- |
| `#9b6417` | `#ffffff` (panel) | **2.49:1** — gagal 3:1 |
| `#9b6417` | `#f6f7f2` (latar halaman) | **2.49:1** — gagal 3:1 |

Terukur di runtime sebagai `outline: solid 3px rgb(155, 100, 23)` pada 5 elemen pertama yang
dijangkau Tab (Langsung ke konten, JagoFarm Pilot, Perangkat, Keluar, Tambah Perangkat). Warnanya
konsisten (bagus) tetapi ambangnya tidak terpenuhi. Indikator fokus wajib memenuhi 3:1 (WCAG 1.4.11).

### B-4. R-05 (spirit: kontrol tidak menunjuk tempat yang nyata) — asisten kalimat
`pilot-heading` menampilkan tombol "+ Tambah Perangkat" kepada setiap pengguna, termasuk akun
operator yang tidak berhak mengalokasikan unit (alokasi hanya lewat `POST /api/admin/devices`).
Terukur: tombol ada dan ikut dijangkau Tab di akun operator. Yang terjadi saat diklik: formulir
pemasangan (`/api/devices/pair`) yang memang hanya menerima kode aktivasi — bukan menambah
perangkat. Di sisi API, benar: `GET /api/devices` untuk operator hanya berisi unit miliknya,
`GET /api/devices/<milik orang lain>` → 404, dan `POST /api/admin/*` ditolak 403 untuk non-admin.

---

## SEDANG

### B-5. R-04 — emoji di judul halaman
`index.html` memakai `<title>🐴 AquaSmartponik: Dashboard TA JagoFarm</title>`; emoji kuda
muncul di tab browser dan riwayat. Sisa branding lama, tidak ada hubungannya dengan produk.

### B-6. R-09 — "badge" versi pilot tampil sebagai kapsul kecil
Judul "JagoFarm **Pilot**" memakai kapsul bergaris tipis. Menurut aturan ini, kapsul boleh
dipakai bila benar-benar menandai status. Di sini status pilot memang nyata, tetapi teksnya
jelas: baris kaki sudah menyatakan "Pilot software. Bukan hardware fisik." Jadi kapsulnya
mengulang informasi, bukan menambah.

### B-7. R-12/R-10 — panel pilot memakai kaca + bayangan berlapis
`pilot.css`: `.pilot-header` memakai `backdrop-filter: blur(20px) saturate(140%)` ditambah
`box-shadow: 0 8px 30px …, 0 1px 3px …, inset 0 1px 0 #fff`. Artinya judul + bayangan + garis
dalam dipakai bersamaan pada elemen yang sama, di aplikasi yang isinya tabel dan angka.
Tidak ada salah satu pun yang salah, tetapi tumpukannya melebihi dosis yang aturan ini izinkan.

---

## RENDAH

### B-8. R-31 — beberapa keputusan tanpa alasan tertulis
Tidak ada `DESIGN.md`/`AGENTS.md` di repo (lihat laporan 001). Untuk backend, tidak ada catatan
mengapa `secret()` memakai 32 byte heksadesimal (bukan base64url), mengapa batas pilot 10 akun /
20 unit, atau mengapa polling UI 30 detik. Semuanya pilihan yang wajar, hanya tidak tercatat.

### B-9. R-27 — status "gagal memuat" ada, tetapi tidak membedakan sebab
`pilotApi.js` memetakan kegagalan jaringan ke "Backend tidak tersedia. Data contoh tidak
digunakan sebagai pengganti." dan respons tak terbaca ke "Respons API tidak valid. Periksa
routing /api." Bagus: tidak ada diam-diam memakai data contoh. Kurang: galat non-JSON
(mis. port salah) dilaporkan sebagai masalah routing, padahal sebabnya bisa lain.

---

## YANG LULUS (dengan bukti terukur)

Keamanan & isolasi data (Hard Gate lain):
- Tanpa sesi: `GET /api/session` → 401 "Silakan masuk."; endpoint tak dikenal tanpa sesi → 401.
- Origin: POST tanpa `Origin` → 403; `Origin: http://jahat.example` → 403. `GET /api/health` dari
  origin asing tidak mengirim `Access-Control-Allow-Origin`, jadi browser tidak bisa membacanya.
- Cookie sesi: `HttpOnly; SameSite=Strict; Path=/api; Max-Age=43200`; `document.cookie` di
  halaman pilot kosong (terbukti tidak bisa dibaca JS).
- Header: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` pada respons sukses
  maupun galat.
- Validasi payload: body kosong → 400; email bukan format → 400; field tambahan (mis. `admin: true`)
  → 400 (karena `additionalProperties: false`).
- Rate limit: 12 percobaan login berturut-turut → 7×429 setelah 5×401; batas 10 per 5 menit berlaku.
- Undangan: token sekali pakai (pemakaian kedua → 400), sandi 8 karakter ditolak 400, sandi 15
  karakter diterima 200, email benar-benar terkirim ke Mailpit (subject "Undangan Pilot JagoFarm",
  berisi tautan `#invite=…`, menyebut masa berlaku 24 jam).
- Isolasi kepemilikan data: akun kedua tidak melihat perangkat akun pertama (`GET /api/devices` → 0
  baris), membuka detail milik orang lain → 404, memakai kode aktivasi milik orang lain → 400.
- Aktivasi sekali pakai: pemasangan kedua dengan kode yang sama → 400.
- Telemetri: kredensial salah/kosong → 401; jumlah sensor tidak sesuai → 400; nilai di luar
  jangkauan sensor (pH 99) → 400; waktu >60 detik di masa depan → 400; kiriman ulang identik →
  200 `{duplicate:true}` (idempoten); id sama dengan isi berbeda → 409.
- Telemetri benar-benar mengalir ke PostgreSQL: tabel `readings` berisi 4 baris setelah uji;
  `npm run db:size` melaporkan `messages: 4`, `telemetry_with_indexes: 64 kB`;
  `GET /api/devices/<id>/history` mengembalikan baris lengkap (message_id, measured_at,
  received_at, readings) dan menolak cursor tidak valid dengan 400.
- Simulator resmi (`npm run simulator`) berjalan: "Simulator through backend. Commands: offline,
  online. Sampling every 30 seconds." Setelah dijalankan, telemetri tersimpan
  (`readings: {"water_temperature":27.85,"ph":6.94,"ec":1.31}`) dan terbaca lewat UI pilot
  ("Suhu air 27,17 °C · pH 7,02 · EC 1,33 mS/cm, Pengukuran terakhir 29/9/2026, 15.19.35").
- Status perangkat dihitung dari data nyata (`online` <90 detik, `stale` ≥90 detik, `offline`
  ≥180 detik) dan hasilnya tampil benar di UI ("Tidak terhubung | 2").
- R-25 di UI pilot: 0 kegagalan kontras di `/pilot`, `/pilot/perangkat`, `/pilot/akun`, dan
  halaman detail perangkat.
- R-17/R-18/R-36: pesan galat API spesifik dan jujur ("Email atau password salah.", "Batas pilot
  10 akun tercapai."); tidak ada klaim keamanan/sertifikasi yang dibuat-buat.

---

## Catatan lingkungan saat audit (bukan temuan kode)

- Mesin ini sudah punya PostgreSQL sendiri di port 5432, jadi database pilot dijalankan di **5433**
  lewat `compose.local.yaml` (tambahan lokal, tidak mengubah `compose.yaml`).
- `.env` dibuat dari `.env.example` (DATABASE_URL diarahkan ke 5433). Sandi admin pilot dibuat
  saat `npm run db:admin` dan tidak ditulis ke berkas ini.
- Yang belum diuji karena butuh waktu >24 jam: kedaluwarsa undangan dan kedaluwarsa kode aktivasi
  (keduanya memakai `now()+interval '24 hours'`).
