# Follow-up audit antislop 005: perbaikan IoT Minggu 1

Tanggal: 4 Oktober 2026

Semua temuan audit 005 sudah ditangani.

| ID | Aturan | Status | Perbaikan |
| --- | --- | --- | --- |
| AS-005-01 | R-36 / C-5 | Diperbaiki | Firmware mencatat waktu respons ingest 2xx dan menyalakan LED selama 120 ms saat antrean habis. Status kedip ganda tetap dipakai ketika antrean tertunda. README kini sesuai dengan perilaku yang diterapkan. |
| AS-005-02 | C-4 / resilience | Diperbaiki | Setelah Wi-Fi tersambung kembali, firmware mengubah state `connecting` ke `running` jika waktu sudah valid. Jika NTP belum valid, jalur sinkronisasi tetap memindahkan state melalui `waitingForTime`. |
| AS-005-03 | C-1 / R-31 | Diperbaiki | README menyebut konstanta TDS sementara di `hardware_config.h`, seed awal database di migration 002, serta aturan membuat migration maju setelah Q6 dijawab. Nilai TDS tidak diubah dan migration 002 tidak ditimpa. |
| AS-005-04 | C-5 / R-31 | Diperbaiki | Bagian 4.2 UI/UX diperbarui agar menyebut form kode manual yang sudah tersedia di `QrScanner.jsx` dan halaman Detail Information, bukan menyatakan perlu dibangun lagi. |
| AS-005-05 | C-2 / resilience | Diperbaiki | Ditemukan saat verifikasi ulang, bukan di audit awal. Firmware membaca `WiFi.RSSI()` saat kirim, sehingga retry setelah balasan hilang mendapat 409 dari pemeriksaan `meta` (ADR-0012) dan tercatat sebagai "ditolak permanen". RSSI kini disimpan di record buffer saat sampel diukur (record 40 byte, record lama 36 byte tetap terbaca). Tes A2 mencakup retry sampel online dan sampel offline tanpa `rssi`. Keempat env firmware ter-build, `test:v1` 17/17. |

Tidak ada temuan yang dibiarkan tanpa perbaikan. Nilai board, modul, dan batas TDS tetap asumsi sementara; Q6/Q7 belum diputuskan. Uji fisik HW-01, HW-05, dan HW-09 masih menunggu alat Haykal.