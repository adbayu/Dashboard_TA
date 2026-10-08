# Checklist uji bench firmware JagoFarm

Uji fisik belum dilakukan. Catat board dan modul yang benar-benar dipakai, hasil ukur, bukti, serta hasil uji saat bench. Build firmware tidak membuktikan wiring, kalibrasi, atau provisioning alat.

## Persiapan

### Alat dan bahan

- ESP32 dan modul pH, TDS, serta DS18B20 yang akan diuji.
- Multimeter untuk mengukur tegangan DC.
- Termometer acuan untuk HW-05.
- Ponsel dengan Wi-Fi untuk HW-09.
- Komputer dengan PlatformIO Core, kabel USB data untuk flash/monitor serial, dan akses ke Wi-Fi/API uji.
- Catu daya mandiri untuk HW-09 setelah kabel komputer dilepas.
- Buffer pH 7,00 dan 4,00 yang belum kedaluwarsa, air bilas, serta wadah bersih untuk HW-02.
- Larutan standar TDS untuk HW-03; nilai label/SDS dan batch/lot hanya diisi dari kemasan yang benar-benar dipakai.
- Router/access point Wi-Fi uji 2,4 GHz untuk HW-06–HW-08 dan tunnel API sementara sesuai preflight di bawah.
- Checklist ini dan media untuk mencatat hasil ukur/bukti.

Model board, GPIO, modul, formula TDS, dan rentang ukur masih asumsi sementara. Konstanta firmware ada di `include/hardware_config.h`; ID board ada di `[board_config]` pada `platformio.ini`.

### Perintah upload dan monitor serial

Flash varian yang diuji, lalu buka monitor serial dengan baud rate 115200:

| Varian | Flash firmware | Monitor serial |
| --- | --- | --- |
| `satuan_ph` | `pio run -d firmware -e satuan_ph -t upload` | `pio device monitor -d firmware -e satuan_ph -b 115200` |
| `satuan_tmp` | `pio run -d firmware -e satuan_tmp -t upload` | `pio device monitor -d firmware -e satuan_tmp -b 115200` |
| `satuan_tds` | `pio run -d firmware -e satuan_tds -t upload` | `pio device monitor -d firmware -e satuan_tds -b 115200` |
| `paket_water` | `pio run -d firmware -e paket_water -t upload` | `pio device monitor -d firmware -e paket_water -b 115200` |

> **Flash pertama saja:** `pio run -d firmware -e <environment> -t uploadfs` menimpa filesystem LittleFS, termasuk sampel di buffer. Jalankan hanya saat menginisialisasi perangkat kosong; jangan gunakan pada perangkat yang sudah dipakai atau menyimpan data yang perlu dipertahankan.

### Baris serial yang diharapkan

Baris berikut bergantung pada varian dan kondisi uji:

```text
Provisioning starts. Setup AP: JagoFarm-Setup-<last 4 MAC characters>
DS18B20 raw=<raw C, 3 decimals> C offset=<signed C, 3 decimals> C corrected=<corrected C, 3 decimals> C
Firmware IoT siap. Credential tidak dicetak ke serial.
Sampel disimpan di LittleFS.
Sampel diterima backend.
```

Baris DS18B20 hanya muncul pada varian yang mengaktifkan suhu setelah pembacaan sensor berhasil. Baris sampel memerlukan waktu valid, sedangkan penerimaan backend memerlukan koneksi Wi-Fi dan API.

### Perilaku yang diharapkan saat boot

Matriks ini mengikuti `FirmwareStatePolicy::evaluate()` dan `main.cpp`; prasyaratnya konfigurasi sudah valid dan LittleFS berhasil dimuat. “Wi-Fi tersedia” berarti `WiFi.status() == WL_CONNECTED` saat state dievaluasi, bukan sekadar access point hidup. Buffer terisi berarti setidaknya ada satu record antrean. State tidak dicetak sebagai baris serial tersendiri. Saat boot, Wi-Fi dapat tersambung secara asinkron, jadi state awal dapat `connecting` sebelum evaluasi berikutnya.

Sampel baru hanya dibuat jika jam valid dan sensor berhasil dibaca; baris simpan muncul pada jadwal sampling (setiap 30 detik). Antrean lama tetap boleh dikirim ketika Wi-Fi tersambung meskipun jam saat boot belum valid. Pengiriman sukses menghasilkan baris diterima; jika API membalas error seperti HTTP 429, baris tertunda mencatat kode dan record tetap di buffer.

| Jam (valid/tidak valid) | Wi-Fi (tersedia/tidak) | Buffer (kosong/terisi) | State hasil | Baris serial yang diharapkan |
| --- | --- | --- | --- | --- |
| Valid | Tersedia | Kosong | `running` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; setelah sampling: `Sampel disimpan di LittleFS.`; jika POST sukses: `Sampel diterima backend.` |
| Valid | Tersedia | Terisi | `running` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; record antrean yang diterima menghasilkan `Sampel diterima backend.`; sampel baru menghasilkan `Sampel disimpan di LittleFS.` |
| Valid | Tidak tersedia | Kosong | `connecting` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; setelah sampling: `Sampel disimpan di LittleFS.`; tidak ada pengiriman saat offline |
| Valid | Tidak tersedia | Terisi | `connecting` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; sampel baru menghasilkan `Sampel disimpan di LittleFS.`; antrean lama tetap ada dan tidak dikirim saat offline |
| Tidak valid | Tersedia | Kosong | `waitingForTime` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; tidak ada baris simpan sampai jam valid; tidak ada antrean untuk dikirim |
| Tidak valid | Tersedia | Terisi | `waitingForTime` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; antrean lama tetap dikirim tanpa menunggu jam; jika POST sukses: `Sampel diterima backend.` |
| Tidak valid | Tidak tersedia | Kosong | `waitingForTime` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; tidak ada sampling atau pengiriman sampai prasyaratnya pulih |
| Tidak valid | Tidak tersedia | Terisi | `waitingForTime` | `LittleFS berhasil dimuat.`; `Firmware IoT siap. Credential tidak dicetak ke serial.`; record lama tetap di buffer; tidak ada sampling atau pengiriman saat offline |

Jika pengiriman gagal, string serial yang dipakai firmware adalah `Pengiriman tertunda: HTTP %d. Record tetap di buffer.` (kode `%d` diganti status HTTP aktual); firmware melakukan retry dengan backoff. Pengiriman maksimal dua record per siklus.

### Preflight API HTTPS sebelum alat dinyalakan

Rute bench host-side memakai **localtunnel HTTPS sementara**, bukan LAN: firmware hanya menerima HTTP untuk loopback dan memerlukan HTTPS untuk host jarak jauh. Jalankan Fastify pada laptop dengan bind `127.0.0.1:3001` saja (jangan bind `0.0.0.0`), lalu jalankan `npx --yes localtunnel --port 3001 --local-host 127.0.0.1` di terminal lain. Jika layanan menyediakan subdomain stabil, tambahkan `--subdomain <nama-stabil>`. URL HTTPS `*.loca.lt` yang dicetak dapat berubah saat sesi tunnel baru; firmware menambahkan `/api/ingest` ke URL API yang dikonfigurasi.

Jalankan langkah preflight 1 sampai 3 sebelum menyentuh atau menyalakan ESP32:

1. Sambungkan laptop ke Wi-Fi uji **2,4 GHz**; pastikan API aktif di `127.0.0.1:3001`, lalu jalankan localtunnel di atas. Jangan sentuh atau nyalakan ESP32 pada langkah ini.
2. Dari HP yang tersambung ke internet, buka `<URL_HTTPS_LOCA.LT>/api/health`. Respons **HTTP 200 dengan JSON `status: ok`** hanya mengonfirmasi jangkauan host-side; itu bukan bukti rute fisik ESP32.
3. Sebelum memasukkan URL ke provisioning, verifikasi **hostname HTTPS aktual yang dicetak localtunnel** terhadap ISRG Root X1 yang tertanam di `firmware/include/root_ca.h`. Lanjutkan hanya bila `embeddedRootValidatedTunnelTls` berhasil. Pemeriksaan 8 Oktober 2026 memvalidasi DNS dan embedded-root TLS pada tiga hostname baru; API health dan ingest tidak diuji melalui tunnel pada run tersebut. Setiap hostname yang akan dipakai tetap harus menjalani langkah 1 sampai 3.
4. Setelah langkah 1 sampai 3 lulus, sambungkan ESP32 ke SSID Wi-Fi uji **2,4 GHz** dan mulai bench sesuai instruksi hardware.
5. Jangan masukkan credential ke URL, catatan, screenshot, atau laporan. Jangan menambahkan header bypass jika muncul interstitial. Gunakan tunnel hanya selama bench dan hentikan proses localtunnel/API setelah selesai.

### Kesiapan tunnel untuk HW-06 dan HW-07

- Untuk seluruh uji HW-06 selama 30 menit dan pemulihan antrean, sambungkan laptop ke daya AC dan nonaktifkan sleep; Fastify dan localtunnel harus tetap berjalan. Sebelum HW-06 maupun HW-07, pastikan proses tunnel sehat dan `GET /api/health` melalui hostname terkini mengembalikan HTTP 200 dengan JSON `status: ok`.
- Verifikasi ulang hostname tunnel terkini dengan embedded-root TLS sebelum setiap uji. Jika URL berubah, reprovision ESP32 dengan URL API HTTPS yang baru, lalu verifikasi kembali health dan koneksi perangkat sebelum melanjutkan.
- ESP32 memerlukan akses internet ke tunnel; berada di LAN yang sama saja tidak cukup. Captive portal, DNS terfilter, atau outbound HTTPS yang diblokir dapat mencegah koneksi.
- Request ESP32 dan dashboard yang melewati tunnel dapat terlihat oleh backend berasal dari satu IP tunnel. Traffic dashboard dapat membuat `POST /api/ingest` mendapat HTTP 429. Ini adalah throttling yang diharapkan, bukan alasan untuk menghapus buffer: firmware mempertahankan record dan mencoba lagi dengan backoff. Pastikan antrean akhirnya terkirim setelah traffic berkurang.

Hotspot, Wi-Fi publik, isolasi client/AP, DNS yang terfilter, atau outbound HTTPS yang diblokir dapat mencegah koneksi lokal maupun tunnel. Dengan rute tunnel, perubahan/perintah firewall **tidak berlaku dan tidak diperlukan**. Jangan ubah `APP_ORIGIN` atau memperluas host allowlist; URL API perangkat diisi terpisah saat provisioning. Tunnel membuat API sementara dapat dijangkau dari internet: gunakan hanya untuk bench, dengan credential uji, lalu hentikan segera.

### Jika preflight tunnel gagal

Jika DNS atau verifikasi TLS dengan ISRG Root X1 gagal, jangan menyentuh ESP32, jangan memasukkan URL ke provisioning, dan jangan flash firmware maupun LittleFS. Tutup sesi tunnel yang gagal, lalu coba hostname baru pada sesi terpisah, maksimal tiga hostname total atau sampai ada yang lulus DNS dan TLS. Untuk setiap percobaan catat nomor percobaan, DNS (`PASS`/`FAIL` dan kelas error), TLS embedded-root (`PASS`/`FAIL` dan kode error), serta waktu. Jangan salin URL tunnel, credential, atau data akun ke log/screenshot.

Jika tiga hostname gagal, hentikan preflight dan laporkan hasilnya. Jika DNS dan TLS lulus, pastikan Fastify yang asli dapat dijangkau lewat `GET /api/health` dengan HTTP 200 dan JSON `status: ok`; hasil host-side tidak membuktikan rute ESP32. Jangan lanjut provisioning atau flashing pada sesi pemeriksaan ini sebelum hasil dilaporkan. Jangan menambah root CA, menonaktifkan validasi sertifikat, memakai header bypass, mengubah `APP_ORIGIN`, atau memperluas allowlist untuk memaksa tunnel lulus.

**Peringatan kompatibilitas firmware:** run host-side 7 Oktober 2026 sebelumnya berhasil memvalidasi satu hostname, health JSON, dan satu ingest v2 ke PostgreSQL; hal itu tidak memverifikasi rute fisik ESP32. Run 8 Oktober 2026 memeriksa tiga hostname baru dan DNS serta TLS embedded-root lulus pada ketiganya, tetapi upstream bukan Fastify sehingga health dan ingest tidak diuji melalui tunnel. Untuk setiap hostname yang akan dipakai, DNS, TLS embedded-root, dan API health harus lulus sebelum provisioning; **berhenti sebelum provisioning atau flashing** bila salah satunya gagal atau belum dilakukan. Jangan menambahkan root CA, header bypass, atau melemahkan verifikasi TLS. Rute fisik belum diverifikasi.

## HW-01: periksa tegangan keluaran modul analog

1. **Jangan sambungkan output modul ke pin ADC ESP32 sebelum mengukurnya.** Nyalakan modul pH dan TDS secara terpisah dengan catu daya yang akan dipakai.
2. Ukur tegangan DC output analog terhadap ground masing-masing modul. Uji semua kondisi yang tersedia dan catat nilai tertinggi.
3. Hubungkan output ke ADC ESP32 hanya jika hasil ukur tidak melebihi 3,3 V. Jika lebih tinggi, jangan sambungkan; pasang antarmuka tegangan yang sesuai, lalu ukur ulang.

**Alat:** multimeter DC, modul pH/TDS, catu daya modul, ESP32 dengan pin ADC belum tersambung sampai tegangannya aman.

**Perintah flash dan monitor untuk tiap varian. Jalankan setelah tegangan aman:**

| Varian | Flash firmware | Monitor serial |
| --- | --- | --- |
| `satuan_ph` | `pio run -d firmware -e satuan_ph -t upload` | `pio device monitor -d firmware -e satuan_ph -b 115200` |
| `satuan_tmp` | `pio run -d firmware -e satuan_tmp -t upload` | `pio device monitor -d firmware -e satuan_tmp -b 115200` |
| `satuan_tds` | `pio run -d firmware -e satuan_tds -t upload` | `pio device monitor -d firmware -e satuan_tds -b 115200` |
| `paket_water` | `pio run -d firmware -e paket_water -t upload` | `pio device monitor -d firmware -e paket_water -b 115200` |

**Serial:** firmware menampilkan asumsi Q6 dan status sampling. Nilai serial bukan pengganti pengukuran multimeter untuk kriteria HW-01.

**Kriteria lulus:** tegangan maksimum output tiap modul yang akan disambungkan ke pin ADC ESP32 tidak lebih dari **3,3 V**.

| Modul | Model/marking | Catu (V) | Hasil ukur output (V) | Maksimum (V) | Lulus/Gagal | Tanggal/inisial |
| --- | --- | --- | --- | --- | --- | --- |
| pH |  |  |  |  |  |  |
| TDS |  |  |  |  |  |  |

Bukti/catatan: _______________________________________________________________

## HW-02: kalibrasi dan ukur ulang buffer pH

**Status: belum diuji (menunggu uji fisik owner).**

**Alat:** ESP32 varian `satuan_ph` atau `paket_water`, probe/modul pH, buffer pH 7,00 dan 4,00 yang belum kedaluwarsa, air bilas, wadah bersih, komputer untuk flash/monitor, dan akses dashboard/database uji.

1. Catat board, modul/probe, tanggal kedaluwarsa buffer, suhu larutan, dan kondisi wiring. Jangan mengubah konstanta sensor untuk membuat hasil tampak lulus.
2. Flash varian yang benar; ikuti instruksi probe/modul untuk mengukur buffer 7,00 dan 4,00. Bilas probe di antara larutan.
3. Catat tegangan buffer pada parameter kalibrasi yang diminta portal, simpan provisioning, lalu ukur kembali kedua buffer setelah pembacaan stabil. Catat hasil serial dan hitung selisih absolut terhadap nilai nominal.
4. **Dashboard:** buka Monitoring atau detail `/iot/<device-id>`, pilih pembacaan pH pada waktu uji, dan cocokkan nilai serta `measuredAt` dengan catatan bench.
5. **Database:** pada database bench yang sesuai, jalankan `SELECT measured_at, readings->>'ph' AS ph FROM readings WHERE device_id = :'device_id'::uuid ORDER BY measured_at DESC LIMIT 20;` melalui `psql` setelah mengisi variabel `device_id`. Cocokkan waktu dan nilai yang terkirim dengan serial serta tabel hasil; jangan menganggap angka dashboard sebagai bukti kalibrasi fisik tanpa catatan buffer.

**Kriteria lulus:** “Selisih maksimal ±0,1 pH (target usulan)”

| Buffer | Nilai nominal pH | Serial sebelum kalibrasi | Hasil ukur ulang pH | Selisih absolut pH | Lulus/Gagal | Tanggal/inisial |
| --- | --- | --- | --- | --- | --- | --- |
| 7,00 |  |  |  |  |  |  |
| 4,00 |  |  |  |  |  |  |

Probe/modul, lot/kedaluwarsa buffer, suhu, bukti/catatan: ______________________

## HW-03: ukur larutan standar TDS

**Status: belum diuji (menunggu uji fisik owner).**

**Alat:** ESP32 varian `satuan_tds` atau `paket_water`, modul/probe TDS, larutan standar yang label/SDS-nya tersedia, wadah bersih, air bilas, alat ukur suhu atau DS18B20, komputer untuk flash/monitor, dan akses dashboard/database uji.

1. Salin nilai standar persis dari label/SDS ke tabel; catat produsen, batch/lot, tanggal kedaluwarsa, dan kondisi/suhu pengukuran. **Jangan mengasumsikan atau mengarang nilai ppm.**
2. Catat board, modul, wiring dan faktor kalibrasi yang dipakai. Q6/Q7 dan konstanta TDS firmware masih asumsi provisional, bukan spesifikasi yang telah dikonfirmasi.
3. Ikuti prosedur kalibrasi modul memakai larutan yang dipilih, ukur setelah stabil, lalu ulangi pengukuran. Bilas probe sesuai instruksi modul di antara larutan.
4. **Dashboard:** buka Monitoring atau `/iot/<device-id>` dan cocokkan nilai TDS serta `measuredAt` dengan serial dan tabel hasil. Periksa bahwa nilai mentah yang dikirim memakai satuan/interpretasi yang sama dengan label/SDS.
5. **Database:** jalankan `SELECT measured_at, readings->>'tds' AS tds FROM readings WHERE device_id = :'device_id'::uuid ORDER BY measured_at DESC LIMIT 20;` via `psql` setelah mengisi `device_id`. Cocokkan record dan waktunya; catat selisih terhadap nilai standar dari kemasan.

**Kriteria lulus:** “Selisih maksimal ±10% dari nilai standar (target usulan)”

| Standar (nama produk) | Nilai label/SDS (ppm) | Batch/lot | Suhu (°C) | Hasil TDS | Selisih (%) | Lulus/Gagal | Tanggal/inisial |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |

Modul/faktor kalibrasi (asumsi Q6/Q7)/bukti/catatan: ___________________________

## HW-04: bandingkan pH saat TDS menyala dan dimatikan

**Status: belum diuji (menunggu uji fisik owner).**

**Alat:** ESP32 varian `paket_water`, probe pH dan modul TDS, larutan/buffer yang sama untuk seluruh pasangan, multimeter bila diperlukan untuk memastikan kondisi daya TDS, komputer untuk flash/monitor, serta akses dashboard/database uji.

1. Flash `paket_water`; stabilkan probe dalam larutan yang sama. Catat suhu, larutan, wiring, waktu stabilisasi, dan urutan uji.
2. Kumpulkan beberapa pembacaan pH dengan modul TDS menyala, lalu matikan hanya daya TDS dan ulangi pembacaan pH tanpa mengubah kondisi lain. Jika board tidak menyediakan sakelar daya TDS yang didukung, catat konfigurasi tersebut dan jangan mengubah wiring saat rangkaian menyala.
3. Bandingkan pembacaan pH berpasangan dan catat gangguan yang berulang. Kriteria resmi bersifat kualitatif; catat pengamatan dan diskusikan solusi isolasi dengan owner jika gangguan tetap ada.
4. **Dashboard:** buka `/iot/<device-id>` atau Monitoring dan periksa pembacaan pH pada waktu uji menyala/mati; cocokkan kelompoknya dengan log serial yang mencatat kondisi daya TDS.
5. **Database:** jalankan `SELECT measured_at, readings->>'ph' AS ph, readings->>'tds' AS tds FROM readings WHERE device_id = :'device_id'::uuid ORDER BY measured_at DESC LIMIT 50;` melalui `psql`; cocokkan `measured_at` dengan urutan uji. Nilai database membuktikan sampel terkirim, bukan kondisi daya fisik.

**Kriteria lulus:** “Selisih tidak signifikan saat TDS dimatikan ketika pH dibaca. Kalau tetap terganggu, catat dan diskusikan solusi isolasi”

**Usulan, perlu keputusan owner:** bila owner menyetujui ukuran angka, median selisih pH berpasangan `>0,1 pH` dapat ditandai sebagai indikasi signifikan untuk dibahas; `0,1 pH` hanya memakai target HW-02 sebagai referensi provisional, bukan kriteria lulus baru.

| Pasangan | pH TDS menyala | pH TDS mati | Selisih absolut | Kondisi stabil/suhu | Observasi | Lulus/Gagal |
| --- | --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |

Konfigurasi TDS/pH, bukti/catatan, keputusan owner atas usulan: ________________

## HW-05: periksa akurasi suhu DS18B20

1. Pasang DS18B20 sesuai wiring dan pull-up. Gunakan varian dengan suhu (`satuan_tmp` atau `paket_water`) dan monitor serial 115200 baud.
2. Letakkan DS18B20 dan termometer acuan berdekatan di air yang stabil. Catat suhu acuan serta nilai raw, offset, dan corrected dari serial.
3. Hitung `selisih absolut = |suhu corrected - suhu acuan|` dalam °C.

**Alat:** ESP32 varian `satuan_tmp` atau `paket_water`, wiring/pull-up DS18B20, wadah air stabil, termometer acuan, komputer, dan kabel USB untuk flash/monitor.

**Perintah flash dan monitor untuk tiap varian:**

| Varian | Flash firmware | Monitor serial |
| --- | --- | --- |
| `satuan_ph` | `pio run -d firmware -e satuan_ph -t upload` | `pio device monitor -d firmware -e satuan_ph -b 115200` |
| `satuan_tmp` | `pio run -d firmware -e satuan_tmp -t upload` | `pio device monitor -d firmware -e satuan_tmp -b 115200` |
| `satuan_tds` | `pio run -d firmware -e satuan_tds -t upload` | `pio device monitor -d firmware -e satuan_tds -b 115200` |
| `paket_water` | `pio run -d firmware -e paket_water -t upload` | `pio device monitor -d firmware -e paket_water -b 115200` |

**Serial:** pada `satuan_tmp` dan `paket_water`, catat `DS18B20 raw=... C offset=... C corrected=... C`. Varian pH dan TDS satuan tidak mengaktifkan suhu, jadi tidak menampilkan baris tersebut.

**Kriteria lulus:** selisih absolut DS18B20 terhadap termometer acuan paling besar **±0,5 °C**.

| Titik uji | Acuan (°C) | Raw DS18B20 (°C) | Offset (°C) | Corrected (°C) | Selisih absolut (°C) | Lulus/Gagal |
| --- | --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |

Varian/instrumen/tanggal/inisial: _____________________________________________

## HW-06: putuskan Wi-Fi selama 30 menit

**Status: belum diuji (menunggu uji fisik owner).**

**Alat:** ESP32 yang sudah diprovisioning, Wi-Fi/API uji melalui tunnel HTTPS, laptop dan HP pada SSID 2,4 GHz yang sama, serial monitor untuk mencatat waktu/state tanpa menyalin credential, dashboard, dan akses `psql` ke database bench.

1. Catat UTC, `device_id`, dan waktu sampel terakhir yang diterima. Pastikan ESP32 mengirim sampel tiap 30 detik dan dashboard menampilkan perangkat yang benar.
2. Putuskan akses Wi-Fi perangkat selama 30 menit penuh tanpa mematikan daya ESP32. Catat waktu mulai dan pemulihan dalam UTC; jangan hapus atau format LittleFS.
3. Pulihkan Wi-Fi, tunggu sampai antrean selesai terkirim, lalu catat waktu sampel terakhir yang diterima dan status serial.
4. **Dashboard:** periksa Monitoring/detail device untuk rentang uji dan setelah pulih; cocokkan waktu sampel tertua/terbaru, gap, serta jumlah pembacaan yang akhirnya muncul.
5. **Database:** jalankan semua SELECT dalam `firmware/bench-queries-hw06-hw07.sql` untuk `device_id`, waktu mulai UTC `from_ts`, dan waktu pulih UTC `to_ts` (rentang setengah terbuka `[from_ts,to_ts)`). Untuk pemeriksaan pascapemulihan, jalankan kembali file yang sama dengan `from_ts` awal lima menit pemeriksaan dan `to_ts` lima menit kemudian. Contoh PowerShell: `psql "$env:TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 -v schema=public -v "device_id=<UUID>" -v "from_ts=<UTC_ISO>" -v "to_ts=<UTC_ISO>" -f firmware/bench-queries-hw06-hw07.sql`. Ganti placeholder dengan nilai uji; jangan tempel URL database atau credential ke laporan.
6. Hitung sampel yang diharapkan dari durasi dan cadence firmware, tinjau output per menit, timestamp gap >90 detik (lebih dari 2 interval 30 detik yang hilang), kelompok duplikat, serta timestamp event offline/online. Catat anomali, termasuk sampel yang hilang atau hanya muncul sekali.

**Kriteria lulus:** “Semua sampel terkirim, tanpa celah, tanpa duplikat”

| Mulai putus (UTC) | Pulih (UTC) | Sampel diharapkan | Sampel database | Gap/missed interval | Duplikat | Event offline/online | Lulus/Gagal |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |

Device ID/cadence/bukti/catatan (tanpa credential): ___________________________

## HW-07: restart saat Wi-Fi tersambung

**Status: belum diuji (menunggu uji fisik owner).**

**Alat:** ESP32 yang sudah diprovisioning, Wi-Fi/API bench stabil melalui tunnel HTTPS, catu daya yang aman untuk restart, laptop/serial monitor, dashboard, dan akses `psql` ke database bench.

1. Pastikan perangkat mengirim data; catat waktu UTC, pembacaan terakhir, dan status Wi-Fi. Jangan melakukan rotasi credential atau menghapus filesystem.
2. Restart perangkat saat Wi-Fi dan API tetap tersedia. Amati bahwa alat boot kembali dan tidak meminta provisioning ulang; jangan menekan BOOT.
3. Tunggu sampai koneksi pulih dan sedikitnya lima menit sampel baru terkumpul. Catat waktu restart dan sampel pertama setelahnya.
4. **Dashboard:** periksa Monitoring/detail device, status koneksi, pembacaan terbaru, dan riwayat sekitar restart. Konfirmasi bahwa pembaruan berlanjut pada device yang sama tanpa klaim/provisioning baru.
5. **Database:** jalankan `firmware/bench-queries-hw06-hw07.sql` dengan jendela `[from_ts,to_ts)` lima menit setelah sampel pascarestart pertama. Periksa hitungan per menit, gap, duplikat, dan event offline/online. Tidak adanya event koneksi dapat dicatat bila gangguan lebih singkat daripada deteksi offline; jangan mengarang event.

**Kriteria lulus:** “Lanjut mengirim tanpa provisioning ulang”

| Waktu restart (UTC) | Provisioning diminta? | Sampel pertama pascarestart (UTC) | Sampel/menit | Gap | Duplikat | Event koneksi/catatan | Lulus/Gagal |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |

Device ID/varian/bukti/catatan (tanpa credential): ____________________________

## HW-08: rotasi credential dan reprovisioning

**Status: belum diuji (menunggu uji fisik owner).**

**Alat:** akun pengelola dashboard, device live yang sudah diprovisioning, ESP32 dan tombol BOOT, Wi-Fi/API uji melalui tunnel HTTPS, laptop/serial monitor, serta akses PostgreSQL bench. Siapkan hanya credential uji baru di tempat aman; **jangan tulis atau foto credential/kode ke checklist atau laporan**.

1. Di dashboard **Kelola IoT → Device**, pilih device yang benar dan jalankan rotasi credential. Simpan credential baru hanya untuk reprovisioning perangkat; jangan masukkan nilainya ke catatan.
2. Dengan firmware masih memakai credential lama, amati request berikutnya: backend menolak autentikasi, perangkat masuk state `Halted`, dan LED menyala terus. Catat state/LED tanpa merekam credential.
3. Tahan BOOT 5 detik untuk membuka portal; reprovisioning melalui portal dengan credential baru dan URL API HTTPS uji. Simpan konfigurasi dan tunggu perangkat tersambung.
4. Jika LittleFS berisi record yang `measuredAt`-nya mendahului `credential_since` baru, tunggu percobaan kirim: backend harus merespons HTTP 400 `VALIDATION_FAILED`. Firmware harus mencatat penolakan permanen satu kali, menghapus record itu dari antrean (bukan mengirimnya selamanya), lalu dapat mengirim record baru yang waktunya memenuhi syarat.
5. **Dashboard:** verifikasi rotasi pada device yang dipilih, waktu berlaku credential baru, status kembali aktif setelah reprovisioning, serta pembacaan baru. Jangan menyalin secret dari modal.
6. **Database:** gunakan timestamp `credential_since` yang ditampilkan/tercatat secara aman di dashboard dan query read-only berikut untuk record device: `SELECT credential_since FROM devices WHERE id = :'device_id'::uuid;` dan `SELECT measured_at, message_id FROM readings WHERE device_id = :'device_id'::uuid ORDER BY measured_at DESC LIMIT 20;`. Pastikan tidak ada record lama yang diterima dan record baru berhasil masuk; korelasikan satu respons 400 dari log lokal dengan tidak adanya retry/record lama. Jangan query atau mengekspor `credential_hash`.

**Kriteria lulus:** “Alat masuk state Halted, LED menyala terus. Record buffer lama dengan `measuredAt` sebelum `credential_since` baru ditolak 400 `VALIDATION_FAILED`; ini perilaku yang dimaksud, bukan bug”

| Rotasi dashboard (UTC) | State/LED dengan credential lama | Waktu portal/reprovision | Satu 400 VALIDATION_FAILED | Record lama dihapus/tidak diulang | Record baru diterima | Lulus/Gagal |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

Device ID/serial state/bukti/catatan aman (tanpa secret): ______________________

## HW-09: provisioning dari ponsel tanpa kabel serial

1. Flash firmware dan pastikan alat menyala. Lepas komputer dan kabel USB/serial, lalu gunakan catu mandiri selama uji provisioning. **Kabel serial tidak boleh tersambung saat uji.**
2. Pada alat yang sudah dikonfigurasi, tahan BOOT selama 5 detik saat alat berjalan untuk membuka portal. Konfigurasi kosong seharusnya membuka portal saat boot.
3. Dari ponsel, sambungkan ke access point `JagoFarm-Setup-<4 digit MAC>`. Isi Wi-Fi uji, URL API, device ID, credential, dan kalibrasi yang dibutuhkan. Jangan catat credential.
4. Kirim formulir dari ponsel, lalu amati LED/status sambungan. Catat bukti tanpa menyambungkan kembali kabel serial.

**Alat:** ponsel dengan Wi-Fi, catu mandiri ESP32, device ID/credential serta URL API uji yang sudah dibuat, Wi-Fi uji, dan komputer untuk flash awal.

**Perintah flash dan monitor untuk tiap varian:**

| Varian | Flash firmware | Monitor serial untuk diagnosis sebelum kabel dilepas |
| --- | --- | --- |
| `satuan_ph` | `pio run -d firmware -e satuan_ph -t upload` | `pio device monitor -d firmware -e satuan_ph -b 115200` |
| `satuan_tmp` | `pio run -d firmware -e satuan_tmp -t upload` | `pio device monitor -d firmware -e satuan_tmp -b 115200` |
| `satuan_tds` | `pio run -d firmware -e satuan_tds -t upload` | `pio device monitor -d firmware -e satuan_tds -b 115200` |
| `paket_water` | `pio run -d firmware -e paket_water -t upload` | `pio device monitor -d firmware -e paket_water -b 115200` |

**Serial:** bukti lulus diambil dari ponsel dan LED saat kabel terlepas. Jika serial dipakai untuk diagnosis sebelum kabel dilepas, nama AP harus cocok dengan `JagoFarm-Setup-<4 digit MAC>`. Jangan catat credential.

**Kriteria lulus:** provisioning selesai dari ponsel **tanpa kabel serial tersambung**.

| Ponsel/OS | AP setup terlihat | Portal selesai | Status alat terlihat | Lulus/Gagal | Tanggal/inisial |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

Bukti/catatan tanpa password atau credential: __________________________________

## Hasil bench

HW-01: __________  HW-02: __________  HW-03: __________  HW-04: __________
HW-05: __________  HW-06: __________  HW-07: __________  HW-08: __________  HW-09: __________

Penguji/tanggal: _____________________________________________________________
Catatan: _____________________________________________________________________
