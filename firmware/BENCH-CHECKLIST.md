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

HW-01: __________  HW-05: __________  HW-09: __________

Penguji/tanggal: _____________________________________________________________
Catatan: _____________________________________________________________________
