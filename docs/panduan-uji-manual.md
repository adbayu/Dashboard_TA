# Panduan manual: menjalankan JagoFarm Dashboard_TA dan memeriksa sendiri

Dokumen ini ditulis untuk dijalankan tangan, tanpa alat bantu. Semua perintah
memakai PowerShell (PowerShell yang biasa Anda pakai di Windows).
Catatan: jangan pakai `taskkill //PID` di git-bash; di dokumen ini semuanya
memakai PowerShell supaya tidak ada jebakan path.

Isi:
  Bagian 0  Ringkas: 4 terminal
  Bagian 1  Database + Mailpit (Docker)
  Bagian 2  Backend API pilot
  Bagian 3  UI pilot
  Bagian 4  Uji tangan antislop (yang diperbaiki di audit 001 & 002)
  Bagian 5  Uji tangan backend lewat curl
  Bagian 6  Mematikan semuanya
  Bagian 7  Kalau ada yang gagal

---

## Bagian 0. Ringkas: 4 terminal

Isi yang sudah berjalan saat ini (dari sesi audit):
  - Docker: kontainer `dashboard_ta-database-1` (port 5433) dan `dashboard_ta-mailbox-1` (1025, 8025)
  - API pilot: node server/index.ts di 127.0.0.1:3001
  - UI pilot (dev, ada proxy /api): vite di http://localhost:5173
  - Pratinjau hasil build: vite preview di http://127.0.0.1:4173

Cara memeriksa cepat bahwa ketiganya hidup:

```powershell
docker compose ps
(Invoke-WebRequest http://127.0.0.1:3001/api/health -UseBasicParsing).Content
(Invoke-WebRequest http://localhost:5173/ -UseBasicParsing).StatusCode
(Invoke-WebRequest http://127.0.0.1:4173/ -UseBasicParsing).StatusCode
```

Harapan: dua kontainer `Up`, `{"status":"ok"}`, lalu `200` dua kali.

---

## Bagian 1. Database + Mailpit (Docker)

Penting: mesin ini sudah punya PostgreSQL sendiri di port 5432 (service Windows).
Karena itu database pilot dipindah ke **5433** lewat `compose.local.yaml`, supaya
PostgreSQL Anda tidak diganggu. Jangan hapus berkas itu.

```powershell
cd C:\JagoFarm_TA\Dashboard_TA
docker compose -f compose.yaml -f compose.local.yaml up -d
docker compose ps
```

Harapan: `database` di `127.0.0.1:5433->5432/tcp`, `mailbox` di `1025` dan `8025`.

Migrasi (sekali saja, aman diulang):

```powershell
npm run db:migrate
```

Harapan: `Migration 1 applied. No telemetry deleted.`

Bila ingin melihat ukuran database dan jumlah pesan telemetri:

```powershell
npm run db:size
```

Mailpit (kotak surat uji untuk undangan) bisa dibuka di browser:
  http://127.0.0.1:8025

---

## Bagian 2. Backend API pilot

Terminal 1:

```powershell
cd C:\JagoFarm\Dashboard_TA
npm run api
```

Harapan: baris log `Server listening at http://127.0.0.1:3001`.
Biarkan terminal ini terbuka.

Akun admin pilot (sudah dibuat saat audit). Kalau perlu dibuat ulang dari nol:

```powershell
$env:ADMIN_EMAIL = 'admin@jagofarm.test'
$secure = Read-Host 'Password admin (minimal 12 karakter)' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
npm run db:admin
Remove-Item Env:ADMIN_PASSWORD
```

Catatan: `npm run db:admin` menolak email yang sudah ada. Jadi kalau akunnya
sudah ada, perintah ini akan berhenti dengan pesan batas/duplikat — itu wajar.

Simulator perangkat (opsional, untuk melihat data bergerak). Butuh tiga nilai
dari seorang admin: Device ID, credential, dan kode aktivasi. Ambil lewat UI
pilot di `/pilot/admin` (bagian "Simpan sekarang: rahasia hanya ditampilkan
sekali"). Lalu di terminal terpisah:

```powershell
$env:DEVICE_ID = '<uuid perangkat>'
$env:DEVICE_CREDENTIAL = '<64 huruf hex>'
$env:DEVICE_MODEL = 'water-v1'
$env:API_URL = 'http://127.0.0.1:3001'
npm run simulator
```

Harapan: `Simulator through backend. Commands: offline, online. Sampling every
30 seconds.` lalu `Connected; buffered=0`. Kiriman pertama muncul paling lambat
30 detik. Hentikan dengan Ctrl+C.

---

## Bagian 3. UI pilot

Terminal 2:

```powershell
cd C:\JagoFarm_TA\Dashboard_TA
npm run dev
```

Harapan: `Local: http://localhost:5173/`. Buka http://localhost:5173/pilot

PENTING: port 5173 dipakai karena `vite.config.js` mem-proxy `/api` ke
`127.0.0.1:3001`, dan `APP_ORIGIN` di `.env` bernilai `http://localhost:5173`.
Kalau dibuka lewat port lain, API menolak dengan "Origin tidak diizinkan."

Alur tangan yang bisa Anda coba:
  1. Buka http://localhost:5173/pilot → masuk dengan admin@jagofarm.test
  2. Buka menu "Admin Pilot" → kirim undangan ke alamat email apa pun (mis. `coba@jagofarm.test`)
  3. Buka http://127.0.0.1:8025 → klik email "Undangan Pilot JagoFarm" → salin tautan `#invite=...`
  4. Buka tautan itu → buat password 12+ karakter → akun aktif
  5. Keluar, masuk dengan akun baru → halaman perangkat (masih kosong, itu benar)
  6. Sebagai admin: alokasikan unit, salin kode aktivasi, lalu di akun baru tekan
     "+ Pasang unit" dan tempel kodenya

---

## Bagian 4. Uji tangan antislop

### 4.1 Yang diperbaiki di audit 001 (tampilan SmartDashboard)

Buka http://127.0.0.1:4173 (pratinjau hasil build). Kalau halaman tampak lama,
tekan Ctrl+Shift+R (pratinjau menyajikan berkas hasil build, bukan sumber hidup).

a) Em dash (tanda pisah "—") tidak boleh muncul di teks yang Anda baca.
   Cara paling cepat: Ctrl+F di browser, cari karakter `—`. Harapan: 0 hasil
   di semua halaman (masuk, dashboard, List IoT, Kelola Area, V-Pet, Gamifikasi,
   Chatbot, Detail Information, Profil, dan seluruh halaman pengelola).

b) Indikator fokus sidebar.
   Tekan Tab beberapa kali dari awal halaman. Harapan: kotak fokus pucat-hijau
   (`#b1f0ce`) jelas terlihat mengelilingi menu sidebar. Sebelumnya tidak
   terlihat sama sekali (rasio 1.01:1; sekarang 11.4:1).

c) Modal tidak boleh menutupi sidebar.
   Halaman pengelola mana pun → tekan tombol tambah (mis. "Tambah kategori").
   Dengan modal terbuka, klik menu sidebar lain (mis. Kelola IoT).
   Harapan: halaman berpindah. Sebelumnya klik itu tidak terjadi apa-apa.

d) Form HPP rata sebaris.
   Kelola Area → buka salah satu kolam → bagian "Harga Pokok Produksi".
   Harapan: kelima kolom (nama item, jumlah, satuan, harga, tombol Tambah)
   sejajar rapi di satu baris. Sebelumnya kolom "Harga satuan" turun 16px.

e) Nama area tidak terpotong.
   Halaman Kelola Area → lihat kartu "Kolam Nila A" → baris Komoditas.
   Harapan: "Kangkung & Pakcoy" terbaca utuh (dulu terpotong elipsis).

f) Avatar bukan foto orang.
   Buka /profil. Harapan: foto profil berupa inisial nama (mis. "BS") di kotak
   berwarna, dan 6 pilihan avatar juga berupa inisial, bukan foto orang.

g) Keadaan data rusak ditampilkan.
   Buka DevTools (F12) → Console → jalankan:
     localStorage.setItem('aquasmart_smart_v1','{bukan json')
   lalu muat ulang. Harapan: muncul kotak peringatan kuning "Data tersimpan di
   browser ini tidak bisa dibaca." plus tombol "Kembalikan data demo" yang
   bekerja. Setelah diklik, peringatan hilang.

### 4.2 Yang diperbaiki di audit 002 (UI pilot)

Buka http://localhost:5173/pilot (butuh server dev, Bagian 3).

a) Alamat pilot bertahan saat muat ulang.
   Masuk sebagai operator → klik "Lihat detail" sebuah perangkat → alamat
   menjadi `http://localhost:5173/pilot/perangkat/<uuid>` → tekan F5.
   Harapan: tetap di halaman detail pilot. Sebelumnya laman berubah menjadi
   halaman masuk SmartDashboard. Coba juga Ctrl+D (bookmark) lalu buka
   bookmark itu: harus mendarat di halaman yang sama.

b) Tombol "Pasang unit" (dulu "+ Tambah Perangkat") membuka bagian pemasangan.
   Klik tombol itu → muncul kotak "Pasangkan perangkat simulator" berisi kolom
   kode aktivasi 64 karakter.

c) Indikator fokus pilot.
   Tekan Tab dari awal halaman. Harapan: kotak fokus hijau gelap (`#134b35`)
   jelas terlihat, kontras 10:1 (sebelumnya amber 2.49:1).

d) Nama produk di header: "JagoFarm" tanpa kapsul "Pilot" lagi. Status pilot
   tetap disebut di baris akun dan di kaki halaman.

e) Em dash: Ctrl+F cari `—` di halaman pilot. Harapan: 0 hasil.

---

## Bagian 5. Uji tangan backend lewat PowerShell

Semua perintah ini aman (hanya membaca, kecuali yang ditandai).

1) Kesehatan API
```powershell
(Invoke-WebRequest http://127.0.0.1:3001/api/health -UseBasicParsing).Content
```
Harapan: `{"status":"ok"}`

2) Tanpa sesi harus ditolak
```powershell
try { Invoke-WebRequest http://127.0.0.1:3001/api/session -UseBasicParsing } catch { $_.Exception.Response.StatusCode.value__ }
```
Harapan: `401`

3) Masuk dan simpan cookie untuk perintah berikutnya
```powershell
$body = @{ email='admin@jagofarm.test'; password='<password admin Anda>' } | ConvertTo-Json
$sesi = Invoke-WebRequest http://127.0.0.1:3001/api/session/login -Method Post -Body $body -ContentType 'application/json' -Headers @{ Origin='http://localhost:5173' } -SessionVariable web -UseBasicParsing
$sesi.StatusCode
$sesi.Headers['Set-Cookie']
```
Harapan: `200`, dan cookie mengandung `HttpOnly`, `SameSite=Strict`, `Path=/api`.

4) POST dari origin asing harus ditolak
```powershell
try {
  Invoke-WebRequest http://127.0.0.1:3001/api/session/logout -Method Post -Headers @{ Origin='http://jahat.example' } -WebSession $web -UseBasicParsing
} catch { $_.Exception.Response.StatusCode.value__ }
```
Harapan: `403`

5) Cabut cookie di browser vs HttpOnly
   Buka DevTools di halaman pilot → Console → ketik `document.cookie`.
   Harapan: kosong (cookie sesi tidak bisa dibaca JavaScript).

6) Batas percobaan login
   Lakukan 11 kali login dengan password salah berturut-turut. Harapan: setelah
   beberapa kali muncul `429 Rate limit exceeded`. Tunggu 5 menit untuk reset,
   atau nyalakan ulang `npm run api`.

7) Batas akun pilot
   Kirim undangan ke 10 alamat berbeda. Harapan: percobaan ke-11 dijawab
   `400`/`409` dengan pesan "Batas pilot 10 akun tercapai."

8) Isolasi data antar akun (bukti paling meyakinkan)
   - Buat dua akun operator (dua undangan, dua password).
   - Alokasikan satu unit ke akun A, pasang di akun A.
   - Masuk sebagai akun B → halaman perangkat harus kosong.
   Harapan: akun B tidak melihat unit milik A sama sekali.

---

## Bagian 6. Mematikan semuanya

```powershell
# API dan dev server
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*server/index.ts*' -or $_.CommandLine -like '*vite*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Pratinjau (kalau Anda memakai npm run preview)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*vite*preview*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Kontainer
cd C:\JagoFarm_TA\Dashboard_TA
docker compose -f compose.yaml -f compose.local.yaml down
```

`down` mematikan kontainer tetapi **tidak** menghapus datanya (volume bernama
`pilot_database` tetap ada). Kalau memang ingin menghapus data pilot:
`docker compose -f compose.yaml -f compose.local.yaml down -v` (perintah ini
menghapus seluruh isi database pilot).

Docker Desktop juga boleh ditutup dari ikonnya di system tray.

---

## Bagian 7. Kalau ada yang gagal

| Gejala | Sebab yang paling sering | Tindakan |
| --- | --- | --- |
| `/pilot` menampilkan "Balasan /api tidak berupa JSON" | UI dibuka lewat port selain 5173, atau API belum jalan | Jalankan `npm run api`, buka http://localhost:5173/pilot |
| "Origin tidak diizinkan." saat klik-klik | Port bukan 5173 | Pakai 5173, atau ubah `APP_ORIGIN` di `.env` + nyalakan ulang API |
| `npm run db:migrate` gagal | Kontainer database belum siap/belum jalan | `docker compose ps`, tunggu `healthy`, ulangi |
| Login dijawab 401 padahal password benar | Batas 10 percobaan per 5 menit | Tunggu 5 menit atau nyalakan ulang API |
| Pratinjau 4173 menampilkan tampilan lama | Pratinjau menyajikan hasil build | `node node_modules/vite/bin/vite.js build`, lalu muat ulang dengan Ctrl+Shift+R |
| Undangan tidak muncul di Mailpit | Alamat berbeda, atau Mailpit baru dinyalakan | Lihat http://127.0.0.1:8025 dan tekan Refresh |
| Simulator berhenti dengan "Invalid buffer" | Berkas `.pilot-buffer.json` rusak dari run sebelumnya | Hapus berkas itu lalu jalankan lagi |
| Halaman pilot tampak "tidak selesai memuat" | Tab browser tidak aktif, jadi polling memang dihentikan | Klik jendela browser (perilaku ini disengaja untuk hemat beban) |

---

## Catatan apa yang belum saya uji

- Masa berlaku undangan dan kode aktivasi 24 jam: tidak bisa diuji sekejap,
  butuh menunggu sehari.
- Perangkat keras fisik: seluruh pilot memakai simulator, sesuai catatan di kaki
  halaman pilot.
- Email produksi: Mailpit hanya kotak surat uji.
