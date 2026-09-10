# Pilot JagoFarm — implementasi Sprint 1

Panduan ini melengkapi, tidak mengganti, keputusan di PERSIAPAN-PILOT.md.
Yang diimplementasikan: akun undangan, sesi, alokasi/pairing simulator, telemetri PostgreSQL,
isolasi kepemilikan, daftar/detail dinamis, simulator jaringan, dan pengujian kontrak.
Ini **bukan pernyataan seluruh pilot sudah selesai**. Alert deterministik dan email alert
Sprint 2, email produksi, RAG, pet, store, MQTT, hardware, ekspor, retensi, backup,
penghapusan akun, dan akses dataset tim belum diimplementasikan.

## 1. Audit sumber data dan batas integrasi

| Bagian | Sumber | Perlakuan |
| --- | --- | --- |
| / dan /perangkat/:id | src/services/pilotApi.js → Fastify → PostgreSQL | API saja; tidak ada fallback fixture |
| /admin | Sesi backend, users/devices PostgreSQL | Admin mengundang dan provisioning; tidak bebas membaca telemetri |
| /demo/* | App.jsx, useFarmStore.js, iotSimulator.js | UI lama dipisah dan diberi label Data contoh / Demo |
| Role, sensor, log, ambang UI lama | localStorage dalam useFarmStore.js | Tidak menjadi otorisasi atau data pilot |
| Analitik, tanah, cuaca, profil, riwayat UI lama | Fixture/state browser/telemetri simulator browser | Belum dipindahkan ke API; hanya demo |
| Asisten demo | ragService.js, respons agronomi lokal atau endpoint konfigurasi lama | Banner bukan RAG nyata; kegagalan endpoint tidak lagi fallback diam-diam |

Audit ini terarah pada batas integrasi, bukan audit lengkap setiap konstanta fixture.
Modul demo dimuat terpisah; simulator browser tidak dijalankan ketika membuka pilot.
Frontend pilot tidak memanggil layanan RAG dan tidak mengirim telemetri ke layanan eksternal.

## 2. Persiapan lokal — PowerShell

Prasyarat: Node.js 22.20+ (atau Node 24 LTS), npm, Docker Desktop dengan engine aktif.
PostgreSQL dan SMTP yang sudah tersedia boleh menggantikan Docker.
tsx tersedia sebagai dependency runtime API. Build frontend dan typecheck memerlukan devDependencies.

1. Instal paket, salin contoh konfigurasi, jalankan PostgreSQL 17 dan Mailpit:

   ~~~powershell
   npm ci
   Copy-Item .env.example .env
   docker compose up -d
   npm run db:migrate
   ~~~

2. Buat satu Admin Pilot. Password tidak ditulis ke Git atau diberikan sebagai argumen proses:

   ~~~powershell
   $env:ADMIN_EMAIL = 'admin@example.test'
   $secure = Read-Host 'Password admin, minimal 12 karakter' -AsSecureString
   $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
   npm run db:admin
   Remove-Item Env:ADMIN_PASSWORD
   ~~~

   Perintah ini tidak menimpa atau menaikkan role akun yang sudah ada. Gagal bila email
   sudah ada atau total 10 akun tercapai. Admin bootstrap adalah identitas operator lokal;
   pengguna biasa tetap harus memverifikasi alamat melalui undangan.

3. Jalankan API dan frontend pada dua terminal:

   ~~~powershell
   npm run api
   ~~~

   ~~~powershell
   npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
   ~~~

   Buka http://localhost:5173. Tetap gunakan host tersebut agar cocok dengan APP_ORIGIN.
   Vite meneruskan /api ke 127.0.0.1:3001. Health check: http://127.0.0.1:3001/api/health.
   Port yang berbeda memerlukan penyesuaian APP_ORIGIN serta target proxy vite.config.js.

4. Masuk sebagai admin, buka **Admin Pilot**, undang pengguna A dan B.
   Buka mailbox uji http://localhost:8025, buka tautan undangan masing-masing,
   buat password. Token 24 jam, sekali pakai; token di fragment URL dihapus setelah
   dibaca UI agar tidak ikut request HTTP/referrer. Jika halaman ditutup sebelum aktivasi,
   buka kembali tautan dari mailbox. Undangan ulang menggantikan token sebelumnya.

5. Admin mengalokasikan **Pemantau air** dan **Pemantau lingkungan** ke akun A yang
   terverifikasi. Simpan hasil provisioning sebelum menutup panel. Berikan hanya
   activationCode ke akun A; credential khusus operator simulator. Masuk sebagai A,
   pilih **Tambah Perangkat**, pasangkan masing-masing kode. B tetap tidak melihat unit A.

Password contoh database Compose hanya untuk loopback lokal. Jangan gunakan di staging.
Jangan menjalankan docker compose down -v: opsi itu menghapus volume database.

## 3. Simulator dan putus/sambung

Jalankan **setelah pairing**, satu proses dan satu file buffer berbeda per unit:

~~~powershell
$env:API_URL = 'http://localhost:3001'
$env:DEVICE_ID = '<deviceId hasil provisioning>'
$env:DEVICE_MODEL = 'water-v1'
$env:DEVICE_CREDENTIAL = '<credential hasil provisioning; bukan activationCode>'
$env:SIMULATOR_BUFFER = "$env:TEMP/jagofarm-water-buffer.json"
npm run simulator
~~~

Untuk unit lingkungan gunakan environment-v1 dan file buffer lain. Jangan membuka dua
proses pada file buffer yang sama. Jangan menyimpan credential dalam VITE_* atau source.

- Setiap 30 detik simulator membuat ID kiriman UUID dan waktu pengukuran asli.
- Ketik offline lalu Enter: sampling berlanjut, kiriman disimpan di disk.
- Ketik online lalu Enter: buffer dikirim lagi tanpa mengubah ID/waktu pengukuran.
- Gangguan jaringan atau HTTP non-2xx mempertahankan buffer; retry siklus berikutnya.
- Buffer maksimal 120 kiriman (sekitar satu jam). Saat penuh, sampling baru berhenti;
  data lama tidak dibuang. Ini batas simulator awal, bukan kebijakan retensi database.
- File rusak atau milik unit lain ditolak; file tidak dihapus otomatis.
- Saat unit dipindahkan, kredensial lama dicabut. Gunakan buffer baru untuk kredensial
  baru; buffer lama tidak boleh ditulis ulang sebagai data pemilik baru.
- API_URL harus HTTPS kecuali localhost/loopback. Server HTTP lokal untuk pengembangan;
  HTTPS staging harus diterminasi reverse proxy tepercaya.

## 4. Kontrak API v1 yang dipakai implementasi

Origin browser sama dengan APP_ORIGIN. Mutasi browser wajib header Origin tersebut.
Sesi cookie pilot_session: HttpOnly, SameSite=Strict, Path=/api, masa berlaku 12 jam;
Secure ketika NODE_ENV=production. Logout mencabut sesi di database. Tidak ada token
login di localStorage. Password memakai scrypt N=131072,r=8,p=1 dengan salt unik.
Token undangan/aktivasi/sesi dan kredensial perangkat disimpan sebagai hash SHA-256.

Semua route di bawah diawali /api. Semua JSON request menolak properti ekstra dan
coercion tipe. Response sensitif tidak di-cache. Error:

~~~json
{"error":{"code":"REQUEST_REJECTED","message":"...","requestId":"req-1"}}
~~~

503 memakai code UNAVAILABLE; detail database/secret tidak masuk response/log aplikasi.
401: sesi/kredensial; 403: origin/role; 404: tidak ada/tidak berhak; 400: payload/kode;
409: konflik/kepemilikan/kapasitas; 429: percobaan terlalu sering.
Rate limit global 120 request/menit/IP; login/aktivasi/pairing 10/5 menit/IP;
undangan 10/jam/IP. Satu instance API pilot; penghitung limit berada di memori.
Reverse proxy perlu limit tambahan untuk staging dan tidak boleh mengekspos port API
langsung. trustProxy tidak diaktifkan secara membabi buta; request melalui satu proxy
akan berbagi batas IP sampai konfigurasi trusted proxy ditentukan.

| Method / route | Request / akses | Response sukses |
| --- | --- | --- |
| GET /health | Publik; memeriksa database dan tabel migrasi | {status:"ok"} |
| POST /session/login | {email,password} | {user:{id,email,role}}, cookie |
| GET /session | Sesi | {user:{id,email,role}} |
| POST /session/logout | Sesi + Origin | {ok:true} |
| POST /invitations/accept | {token,password} + Origin | {message} |
| GET /models | Sesi | {models}; definisi sensor/satuan/batas validasi |
| GET /admin/users | Admin | {users:[{id,email,role,verified}]} |
| POST /admin/invitations | Admin; {email} | {message}; token hanya dikirim ke email |
| POST /admin/devices | Admin; {userId,name,model,deviceId?} | {deviceId,model,credential,activationCode} sekali tampil |
| POST /devices/pair | Sesi; {code} | {deviceId} |
| GET /devices | Pemilik aktif | {devices:[...]} |
| GET /devices/:id | Pemilik aktif | {device:{id,name,model,sensors,source,status,started_at,measured_at,received_at,last_received_at,readings}} |
| GET /devices/:id/history?cursor=... | Periode milik akun, termasuk setelah dilepas | {readings:[...],nextCursor:null atau string} |
| POST /devices/:id/release | Pemilik aktif | {ok:true} |
| POST /ingest | Bearer credential perangkat, bukan sesi browser | {accepted:true,duplicate:boolean} |

Riwayat terbaru dulu, 100 baris/halaman; cursor opaque menggunakan pasangan timestamp
dan UUID, menjaga pagination ketika waktu pengukuran sama. Tiap baris berisi message_id,
measured_at, received_at, readings. latest ditentukan measured_at lalu message_id,
bukan urutan kedatangan. source selalu simulator pada pilot ini. Status koneksi bukan
status alert sensor. Tidak ada fixture endpoint/fallback produksi. Pengujian kontrak
menggunakan Fastify inject dengan handler yang sama dan PostgreSQL sungguhan; hanya
pengiriman undangan yang diganti mailbox in-memory saat tes otomatis. UI prototipe
lama tetap tersedia di /demo sebagai sumber contoh terpisah, bukan mock akun pilot.

### Pesan perangkat

~~~json
{
  "version": 1,
  "deviceId": "00000000-0000-4000-8000-000000000001",
  "model": "water-v1",
  "messageId": "00000000-0000-4000-8000-000000000002",
  "measuredAt": "2026-09-09T06:00:00.000Z",
  "readings": {"water_temperature": 27.2, "ph": 6.9, "ec": 1.3}
}
~~~

UUID contoh bukan unit yang telah disediakan. Gunakan UUID provisioning dan timestamp
aktual. Timestamp wajib UTC ISO dengan tiga digit milidetik, maksimum 60 detik di masa
depan. Payload maksimal 4096 byte. Sensor tepat sesuai model; nilai harus angka finite.

| Model | Kode | Satuan | Batas validasi awal (bukan ambang alert) |
| --- | --- | --- | --- |
| water-v1 | water_temperature | °C | -10..100 |
| water-v1 | ph | pH | 0..14 |
| water-v1 | ec | mS/cm | 0..100 |
| environment-v1 | air_temperature | °C | -50..80 |
| environment-v1 | humidity | %RH | 0..100 |

Idempotency key adalah (deviceId,messageId). Replay identik sukses duplicate=true;
ID sama dengan nilai/waktu berbeda ditolak 409. Kepemilikan ditentukan dari periode
waktu pengukuran dan kredensial yang berlaku. Data sebelum pairing atau sebelum
penerbitan kredensial baru ditolak. Kiriman historis sah masuk riwayat, bukan latest.
Tidak ada email sensor yang dipicu oleh ingestion Sprint 1.

### Skema dan migrasi

server/schema.sql memuat migrasi awal transaksional/idempotent, dikunci advisory lock:
users → sessions; users/devices → ownerships; ownerships/devices → readings.
Index unik membatasi satu pemilik aktif per unit dan satu kiriman per ID/unit.
Model/sensor didefinisikan sekali di server/domain.ts dan disajikan melalui /models;
tidak membuat tabel katalog tambahan untuk dua model tetap.

Admin tidak dapat memindahkan unit aktif. Pemilik melepas, admin mengalokasikan ulang
unit yang sama, kredensial dirotasi, pengguna baru melakukan pairing. Riwayat lama tetap
pada ownership_id lama. Tidak ada endpoint menghapus telemetri atau kebijakan retensi.
Total akun termasuk undangan tertunda dan admin dibatasi 10, total unit 20.

## 5. Validasi lokal

~~~powershell
npm run typecheck
npm run lint
npm run build
$env:TEST_DATABASE_URL = 'postgresql://pilot:pilot-local-only@localhost:5432/jagofarm'
npm run test:pilot
npm run db:size
~~~

Gunakan database pengujian, bukan produksi. Suite membuat schema acak khusus tes,
menjalankan migrasi dua kali, lalu menghapus **schema tes tersebut saja**. Akun database
tes perlu CREATE SCHEMA. TEST_DATABASE_URL wajib; tidak diam-diam memakai DATABASE_URL.
Suite menguji akun kosong, undangan, pairing sekali pakai termasuk balapan, isolasi
langsung API/admin, dua model, payload salah, deduplikasi, buffer terlambat, pagination,
restart aplikasi, perpindahan unit, sesi/CSRF, batas akun/unit, dan database gagal. Uji browser tetap perlu.

Checklist browser (Admin, A, B dalam profil/incognito terpisah):

- A/B baru benar-benar kosong; role UI tidak dapat memberi akses admin.
- Kode A gagal di B; kode yang sama tidak dapat dipakai ulang.
- Kedua model menampilkan satuan/sensor berbeda, grafik dan tabel tidak mencampur unit.
- Segarkan mengambil pembacaan baru; polling 30 detik hanya ketika tab terlihat;
  kembali ke tab/focus mengambil ulang. Nilai terakhir tetap terlihat saat error.
- Simulator offline/online mempertahankan timestamp, retry tidak menggandakan baris.
- API mati menampilkan error, bukan demo. Restart API dan refresh mempertahankan sesi/data.
- Uji pada lebar 390px dan desktop; keyboard dapat mengakses input, tombol, tabel.
- /demo/ dan /demo/ai tetap diberi label contoh, tidak memicu email pilot.

Ukur db:size sebelum dan setelah jumlah kiriman yang diketahui. Catat ukuran database,
ukuran readings termasuk index, dan jumlah pesan. Gunakan database uji terpisah dan
hentikan simulator setelah pengujian. Hosting hanya 2 GB: jangan menjalankan ingestion
tanpa pemantauan atau menjanjikan retensi permanen. Tidak ada penghapusan otomatis.

## 6. Staging Kroombox — masih perlu verifikasi pengelola

- Frontend: folder package.json = root, install npm ci, build npm run build, output dist.
- API: root, install npm ci --include=dev, migrasi npm run db:migrate, start npm run api.
- Runtime Node 22.20+/24; PostgreSQL 17; isi DATABASE_URL dari hosting, jangan pakai .env contoh.
- NODE_ENV=production, APP_ORIGIN=https://host-dashboard, PORT sesuai panel.
- API bind loopback secara default. HOST=0.0.0.0 hanya jika isolasi jaringan container
  dan reverse proxy terkonfirmasi. Publik hanya HTTPS; /api diteruskan ke API tanpa
  menghapus prefix. Route frontend lain fallback dist/index.html, bukan route API.
- SMTP_HOST/PORT/FROM, SMTP_SECURE, SMTP_USER/PASS dari operator. Staging awal dapat
  memakai Mailpit privat; mailbox tidak boleh dibuka publik karena berisi undangan.
- Pastikan reverse proxy meneruskan Origin dan Cookie, HTTPS cookie bekerja, health
  mengecek DB, sesi tetap ada setelah restart, dan A tidak dapat membaca milik B.
- Verifikasi pooling (5 koneksi/instance), disk/database, backup, uptime tanpa pengunjung,
  routing /api, dan konfigurasi trusted proxy/rate limiting bersama pengelola.
- Kredensial email, DNS, pengiriman inbox nyata, HTTPS hosting, backup dan batas hosting
  tidak terbukti hanya dengan tes lokal. Tidak ada deployment otomatis dari perubahan ini.

## 7. Batas selesai

Fondasi Sprint 1 dapat diuji lokal. Sprint 2 baru dimulai setelah keputusan edge case
alert dan worker email disepakati. Tidak menambahkan asumsi durasi kehilangan sampel,
retensi, ekspor arsip permanen, penghapusan akun, pembayaran, ataupun hak dataset tim.

## 8. Hasil verifikasi implementasi lokal

- PostgreSQL 17 sungguhan: 16 tes lulus, termasuk batas kapasitas dan balapan provisioning.
- Chrome headless: undangan SMTP ke mailbox uji privat, verifikasi email, login dua akun,
  pairing, penolakan kode lintas akun, kedua model, grafik, dan akses langsung API diuji.
- Refresh browser mempertahankan data; polling 30 detik, pause saat visibility hidden,
  refresh saat visible, dan error jaringan tanpa fallback dummy diuji.
- Screenshot desktop 1365px dan mobile 390px diperiksa; tidak ada overflow halaman.
- Proses simulator benar-benar diputus, menyimpan buffer, direstart, mengirim ulang:
  timestamp sama dan tidak menggandakan kiriman.
- Typecheck dan build lulus. Lint masih memiliki dua warning lama pada TopNavBar.jsx
  dan AddSensorModal.jsx; tidak ada warning baru dari implementasi pilot.
- Engine Docker tidak tersedia saat validasi. Tes menggunakan PostgreSQL sementara
  dan SMTP sink lokal di luar repository; Compose/Mailpit belum dijalankan di mesin ini.
- Ini tidak memverifikasi inbox email produksi, konfigurasi hosting, hardware, backup,
  atau alert Sprint 2. Ikuti checklist staging sebelum membuka pilot ke pengguna nyata.
