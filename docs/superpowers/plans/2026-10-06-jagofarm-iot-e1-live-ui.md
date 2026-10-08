# Catatan implementasi historis E1

> Arsip workflow Superpowers. Catatan ini merekam pekerjaan E1 pada 6 Oktober 2026, bukan backlog aktif atau spesifikasi produk.

## Penempatan dan sumber kebenaran

Berkas ini tetap di `docs/superpowers` karena dibuat untuk merencanakan dan melacak pekerjaan melalui workflow Superpowers. Dokumen produk di `docs/iot` tetap menjadi sumber kebenaran. Jika catatan ini berbeda, ikuti dokumen produk dan kontrak backend yang berlaku.

## Tujuan

E1 menghubungkan List IoT dan Detail perangkat ke telemetry API, histori, event, dan stream bersama. E1 juga menambahkan rotasi credential satu kali di Kelola IoT.

## Riwayat implementasi

- Adapter `iotApi` memakai request backend yang sudah ada. Data lokal tetap hanya contoh dan tidak menggantikan respons API yang gagal.
- `iotStream` memakai fetch streaming agar aplikasi bisa membaca status HTTP dan mengirim `Last-Event-ID`. Satu koneksi dibagi antar subscriber; kegagalan beralih ke polling bersama.
- Helper presentasi pembacaan dan event dipakai oleh List IoT dan Detail. Detail mengambil histori melalui API, lalu menggambar ringkasan sensor tanpa data contoh.
- Kelola IoT menampilkan hasil rotasi hanya selama dialog satu kali terbuka. Pengguna dapat menyalin credential atau mengakui bahwa credential sudah disimpan sebelum menutup dialog.
- E1 tidak mencakup Monitoring, panel Sandbox, atau klaim setelah login. Pekerjaan tersebut tercatat terpisah.

## Verifikasi yang dicatat

- Unit test frontend, lint `npx --no-install oxlint src`, dan build Vite dijalankan.
- Click-through browser mencakup alur List IoT, Detail, stream, grafik, event, rotasi credential, tema, lebar layar, dan keyboard.
- Hasil audit lanjutan disimpan di `anti-slop/audit-007-2026-10-07-followup.md`. Status terbaru harus dibaca dari catatan audit tersebut, bukan disimpulkan dari checklist historis ini.
