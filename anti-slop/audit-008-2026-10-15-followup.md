# Follow-up audit antislop 008: log sensor dan ekspor Excel

Tanggal verifikasi: 17 Oktober 2026

Follow-up untuk [audit awal](audit-008-2026-10-15.md). Cakupan temuan adalah AS-008-01 dan AS-008-02, ditambah verifikasi override `uuid` yang dibatasi ke ExcelJS. Pemeriksaan test backend menggunakan database PostgreSQL 18 baru pada port 55433 dengan encoding UTF8, setelah override diterapkan.

## Cakupan dan metode

Implementasi dan regression test untuk kedua temuan diperiksa pada `src/pages/DeviceLog.jsx`, `src/components/iot/LogTable.jsx`, `src/components/iot/LogTable.test.js`, dan `src/pages/DeviceLog.test.js`. Status CLOSED hanya diberikan karena perilaku yang diminta tampak pada implementasi dan dicakup oleh test terkait.

Hasil perintah typecheck, lint, build, suite frontend dan backend, serta pengujian ekspor langsung dicatat di bawah. Pengujian browser click-through dan visual yang tercatat di audit utama tidak dijalankan ulang setelah perubahan dependency. UI tidak berubah dalam follow-up ini.

## Status temuan

| Temuan | Status | Bukti verifikasi | Resolusi |
| --- | --- | --- | --- |
| AS-008-01: tabel tetap menampilkan kolom sensor lain saat sensor paket dipilih | CLOSED | `DeviceLog.jsx` mengirim `selectedSensor` untuk device paket. `LogTable.jsx` membatasi `visibleSensors` ke kode sensor terpilih. Test `a selected package sensor hides all other sensor columns and readings` memeriksa sensor terpilih, memastikan nama dan unit sensor lain tidak muncul, serta memastikan pilihan tanpa sensor tetap menampilkan semua sensor. | Kolom dan nilai sensor lain tersembunyi saat satu sensor paket dipilih. Tidak diperlukan koreksi source tambahan. |
| AS-008-02: tautan kembali ke detail device hilang pada state loading dan error | CLOSED | `DeviceLogState` pada `DeviceLog.jsx` merender `DeviceLogBackLink` sebelum konten loading/error. Test `loading and error views keep the detail link and announce their state` memeriksa tautan, `role="status"` untuk loading, dan `role="alert"` untuk error. | Tautan detail tetap tersedia di kedua state; pesan state diumumkan tanpa metadata device rekaan. Tidak diperlukan koreksi source tambahan. |

Tidak ada source path yang diubah dalam follow-up ini.

## Verifikasi advisory dependency

Pemeriksaan `grep -RInE 'v3[[:space:]]*\([^)]*,[^)]*,[^)]*\)|v5[[:space:]]*\([^)]*,[^)]*,[^)]*\)|v6[[:space:]]*\([^)]*,[^)]*,[^)]*\)' node_modules/exceljs/lib` tidak menemukan pemanggilan UUID v3, v5, atau v6 dengan tiga argumen. `grep -RIn 'uuid' node_modules/exceljs/lib` hanya menemukan import CommonJS `const {v4: uuidv4} = require('uuid')` di `xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js`; pemanggilan `uuidv4` di sana tidak meneruskan buffer.

Override di `package.json` dibatasi pada `overrides.exceljs.uuid = ^11.1.1`. `npm ls exceljs uuid --all` menunjukkan `exceljs@4.4.0` memakai `uuid@11.1.1`. Pemeriksaan runtime CommonJS dari konteks ExcelJS memuat `uuid` versi 11.1.1, berhasil membuat UUID v4, dan berhasil menginstansiasi workbook ExcelJS.

`npm audit --omit=dev` menyatakan `exceljs` bersih dan `uuid` bersih dari GHSA-w5hq-g745-h8pq. Tiga temuan moderate yang tidak terkait tetap ada pada `fast-uri`, `fastify`, dan `ip-address`; ketiganya tidak diubah dalam cakupan ini.

## Ringkasan pengujian

Seluruh hasil berikut PASS pada verifikasi yang dicatat untuk follow-up ini:

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS, 158 modul ditransformasi |
| Suite unit Node frontend | PASS, 23 file, 141/141 test |
| `npm run test:pilot` | PASS, 16/16 test |
| `npm run test:v1` | PASS, 77/77 test |
| Test ekspor HTTP langsung: `node --env-file-if-exists=.env --import tsx --test --test-name-pattern='V1 readings export streams' server/v1.test.ts` | PASS, 11/11 test |
| `git diff --check` | PASS |

Test ekspor membuat dan mengambil workbook XLSX nyata melalui route, lalu membacanya dengan ExcelJS. Pemeriksaan mencakup sheet, data, formatting, summary, zona waktu, error, rate limiting, dan cleanup saat koneksi terputus. Browser click-through dan pemeriksaan visual tidak diulang; hasil pada audit utama tetap menjadi bukti sebelumnya, bukan hasil baru dari follow-up ini.

## Kesimpulan

AS-008-01 dan AS-008-02 telah ditutup berdasarkan implementasi dan regression test yang memverifikasi perilaku masing-masing. Tidak ada temuan AS-008 yang masih terbuka. Langkah follow-up ini hanya mengubah laporan; keseluruhan pekerjaan yang diminta juga memperbarui `package.json` dan `package-lock.json` untuk override `uuid` yang dibatasi ke ExcelJS. Tidak ada source server/frontend atau UI yang diubah selama follow-up ini.

## Tambahan 18 Oktober 2026

Dikerjakan setelah follow-up di atas, tanpa commit dan tanpa mengubah `.env`.

| Hal | Hasil |
| --- | --- |
| Nama file ADR | `0015-ekspor-log-sensor-dengan-streaming.xlsx.md` diganti menjadi `0015-ekspor-log-sensor-dengan-streaming.md`. Tautan di `docs/iot/adr/README.md` ikut diperbarui. |
| Advisory dependency produksi | `npm audit fix` tanpa `--force` menaikkan versi patch: `fastify` 5.12.3 ke 5.12.7, `fast-uri` 4.1.4 ke 4.2.2 dan 3.1.7 ke 3.1.8, `ip-address` 10.7.0 ke 10.7.4. Ikut naik di dev: `tailwindcss` 3.4.17 ke 3.4.19 dan `source-map-js` 1.2.1 ke 1.2.2. `package.json` tidak berubah. `npm audit --omit=dev`: 0 vulnerability. |
| Advisory dependency dev | Tersisa 7 (2 moderate, 5 high) di rantai `postcss-selector-parser` milik Tailwind 3. Perbaikannya menuntut Tailwind 4 (breaking), jadi tidak dikerjakan. Hanya dipakai saat build, tidak ikut ke server. |
| Gerbang otomatis setelah update | `typecheck` exit 0, `lint` 0 warning 0 error, `build` exit 0, unit frontend 141/141, `test:pilot` 16/16, `test:v1` 77/77. Backend diuji ke cluster PostgreSQL 18.6 sementara di port 55434 lewat env sesi. |
| Uji buka di Excel | Ekspor satu device paket `AQ-WATER-01` selama 24 jam (2.789 baris, ada celah 45 menit dan 10 sampel terlambat) dibuka di Microsoft Excel lewat automasi COM, mode baca saja. File terbuka tanpa error dan nama workbook tidak berubah menjadi versi "Repaired", dua sheet (`Log sensor`, `Ringkasan`), 2.789 baris data sesuai jumlah di database, waktu WIB benar, sel waktu bertipe tanggal dengan format `yyyy-mm-dd hh:mm:ss`, freeze dan autofilter aktif, nama device `=SUM(1,1) Kolam Uji` tampil sebagai teks, dan tidak ada sel berisi rumus. |
| Temuan baru | TDS tampil `600.00` dan suhu air `27.00` karena seed `sensor_types` di migration 002 tidak mengisi `decimals`, sehingga semua sensor memakai bawaan 2. Kode ekspor sudah mengikuti nilai di database. Perlu keputusan pemilik: atur `decimals` lewat tab Jenis Sensor, atau migration maju baru sesuai ADR-0008. Contoh di API Contract 6.1 memakai TDS 0 desimal. |
