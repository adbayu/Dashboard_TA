# Firmware IoT JagoFarm

Proyek ini memakai satu source untuk empat varian ESP32. **Semua nilai board, pin, modul, formula, dan rentang pengukuran masih berupa asumsi** dan belum dikonfirmasi pada perangkat yang dirakit. Asumsi kode dipusatkan di `include/hardware_config.h`; ID board dikonfigurasi hanya di bagian `[board_config]` pada `platformio.ini`.

> Q6 dan Q7 masih terbuka. Model modul pH/TDS, formula, dan rentang TDS aktual menunggu konfirmasi Q6. Hosting/API dan rantai sertifikat menunggu keputusan Q7. Nilai sementara di firmware bukan konfirmasi hardware atau rentang yang didukung.

## Instalasi PlatformIO Core di Windows

Jalankan dari direktori proyek di PowerShell atau Command Prompt:

```powershell
py -m pip install --user -U platformio
pio --version
```

Pastikan perintah `pio` tersedia di `PATH`. Jika baru menambahkan PlatformIO, buka terminal baru sebelum memverifikasi.

## Build

Jalankan dari root repo:

```powershell
pio run -d firmware -e satuan_ph
pio run -d firmware -e satuan_tmp
pio run -d firmware -e satuan_tds
pio run -d firmware -e paket_water
```

## Upload dan serial monitor

Gunakan perintah environment yang sesuai dengan firmware dan board yang diuji. Serial monitor berjalan pada 115200 baud.

| Environment | Upload firmware | Serial monitor |
| --- | --- | --- |
| `satuan_ph` | `pio run -d firmware -e satuan_ph -t upload` | `pio device monitor -d firmware -e satuan_ph -b 115200` |
| `satuan_tmp` | `pio run -d firmware -e satuan_tmp -t upload` | `pio device monitor -d firmware -e satuan_tmp -b 115200` |
| `satuan_tds` | `pio run -d firmware -e satuan_tds -t upload` | `pio device monitor -d firmware -e satuan_tds -b 115200` |
| `paket_water` | `pio run -d firmware -e paket_water -t upload` | `pio device monitor -d firmware -e paket_water -b 115200` |

> **Perhatian:** `uploadfs` hanya untuk flash pertama pada perangkat kosong. `pio run -d firmware -e <environment> -t uploadfs` menimpa filesystem LittleFS, termasuk sampel yang masih berada di buffer. Jangan jalankan pada perangkat yang sudah digunakan atau berisi data yang perlu dipertahankan.

| Environment | Tipe API | Sensor aktif |
| --- | --- | --- |
| `satuan_ph` | `AQ-PH` | pH |
| `satuan_tmp` | `AQ-TMP` | suhu air |
| `satuan_tds` | `AQ-TDS` | TDS |
| `paket_water` | `AQ-WATER-01` | pH, TDS, suhu air |

## Pin asumsi

- pH: GPIO34, ADC1.
- TDS: GPIO35, ADC1.
- DS18B20: GPIO4 dengan pull-up 4,7 kΩ ke 3,3 V.
- Saklar daya TDS pada varian paket: GPIO25.
- LED status: GPIO2.
- Tombol provisioning: GPIO0, tahan 5 detik ketika alat menyala.

Jangan sambungkan keluaran sensor analog ke ESP32 sebelum tegangan maksimum diukur. GPIO ESP32 tidak boleh menerima tegangan di atas 3,3 V.

## Provisioning dan kalibrasi

Saat konfigurasi belum lengkap atau tombol BOOT ditahan 5 detik, ESP32 membuka portal WiFiManager `JagoFarm-Setup-<4 digit MAC>`. Dari HP, isi SSID/password WiFi, URL API, `deviceId`, credential, dan nilai kalibrasi yang tersedia. URL HTTP hanya diterima untuk loopback; alamat server jarak jauh wajib HTTPS.

Credential disimpan di NVS dan tidak dicetak ke serial. Firmware menerima root CA ISRG Root X1 yang diterbitkan Let's Encrypt. Kalau hosting memakai CA lain, sertifikat akar harus diganti di `include/root_ca.h` sebelum alat dipakai.

- pH belum dikirim sebelum `V7` dan `V4` valid. Isi keduanya dalam volt setelah pembacaan buffer pH 7,00 dan 4,00.
- TDS memakai faktor `k`, bawaan 1,0. Formula Gravity-style dan batas 5000 ppm hanya asumsi sementara Q6, bukan keputusan modul atau rentang aktual. Nilai awal database disimpan di migration 002; setelah Q6 diputuskan, selaraskan database dengan migration maju baru, bukan mengubah file migration yang sudah diterapkan.
- Hosting masih menunggu keputusan Q7. Root CA bawaan hanya cocok jika rantai sertifikat host berujung ke ISRG Root X1.

## Sampling, buffer, dan pengiriman

- Sampel diambil tiap 30 detik. Sensor analog dibaca 15 kali dengan jeda 20 ms, lalu memakai median.
- Suhu dibaca sebelum TDS untuk kompensasi. Di varian paket, daya modul TDS diputus saat membaca pH.
- Waktu disinkronkan lewat NTP. Firmware tidak membuat sampel tanpa waktu yang valid.
- Setiap sampel ditulis lebih dulu sebagai record 40 byte di LittleFS. Buffer menampung sampai 5.760 sampel, sekitar 230 KB data record. Record 36 byte dari firmware sebelumnya tetap terbaca dan dikirim tanpa `rssi`. Kalau penuh, sampel tertua dibuang dan kejadian dicatat ke serial.
- Payload menggunakan versi 2 dan endpoint `POST /api/ingest`. `messageId` dan `meta.rssi` dibekukan saat sampel direkam, jadi retry mengirim payload yang sama persis dan server menjawab `duplicate: true`, bukan 409. Sampel yang direkam saat Wi-Fi putus dikirim tanpa `rssi`.
- Setelah koneksi pulih, firmware mengirim maksimal 2 record antrean per siklus 30 detik. Pada 20 device, batas ini setara paling banyak 80 request per menit dari alat, di bawah batas ingest global 120 request per menit per IP. Sisa antrean diproses pada siklus berikutnya.
- Status 200 menghapus record. Status 400 atau 409 dicatat lalu record dilewati. Status 401 menghentikan pengiriman sampai provisioning ulang. Status 429, 5xx, dan timeout mempertahankan record dengan backoff 5 detik sampai 5 menit.

## LED

- Kedip cepat: portal provisioning.
- Kedip lambat: menghubungkan WiFi atau menunggu waktu NTP.
- Kilat singkat: sampel tersimpan dan terkirim.
- Dua kedip: sampel tersimpan saat offline.
- Menyala terus: credential ditolak, alat menunggu provisioning ulang.

## Pemeriksaan pada alat asli

HW-01: ukur tegangan keluaran pH dan TDS sebelum menyambungkan pin ESP32, pastikan tidak lebih dari 3,3 V.

HW-05: bandingkan DS18B20 dengan termometer acuan; target selisih maksimal ±0,5 °C.

HW-09: dari HP, tahan BOOT 5 detik saat alat menyala, sambungkan ke hotspot setup, lalu isi WiFi, URL API, ID device, credential, dan kalibrasi yang diperlukan. Pastikan LED menunjukkan status sambungan.

Pemeriksaan tersebut perlu dilakukan pada hardware asli. Build firmware saja tidak membuktikan wiring, kalibrasi, atau provisioning fisik.
