# Follow-up audit antislop 006: UI IoT Minggu 2

Tanggal: 4 Oktober 2026

Follow-up untuk audit awal [`audit-006-2026-10-04.md`](audit-006-2026-10-04.md). Temuan AS-006-01 dan AS-006-02 telah diperbaiki. Baris “Langkah berikutnya” pada audit awal diperbarui untuk mencatat instruksi owner dan menunjuk ke follow-up ini; laporan audit awal beserta tabel temuannya tetap dipertahankan dan isi audit awal tidak diubah dalam cleanup ini.

## Perbaikan

### AS-006-01: konfirmasi penerbitan kode aktivasi

- Aksi **Buat label QR** membuka konfirmasi sebelum meminta kode aktivasi baru. Dialog menyebutkan bahwa kode lama langsung tidak berlaku dan kode baru berlaku selama 24 jam.
- **Batal** maupun penutupan dialog hanya menutup konfirmasi: tidak ada request atau penerbitan kode baru dan hash kode tersimpan tidak berubah.
- Jika dikonfirmasi, kode baru diterbitkan untuk perangkat yang dipilih, lalu alur modal kode aktivasi/label yang sudah ada dibuka.
- Aksi **Buat ulang kode aktivasi** tetap langsung menerbitkan ulang kode. Secret tetap berada di state UI dan kode untuk gambar QR dikirim melalui body POST.

### AS-006-02: referensi API

- Halaman Developer memiliki tautan nyata **Referensi API** yang membuka `/docs/openapi.json` di tab baru.
- Proxy dev Vite meneruskan `/docs` ke backend di `http://127.0.0.1:3001`.
- UX, technical design, dan changelog menyatakan tautan membuka OpenAPI JSON. UI Scalar tetap dijadwalkan untuk Minggu 4; tidak ada UI Scalar atau fitur tambahan Minggu 4 pada perubahan ini.

## Bukti verifikasi

| Perintah | Hasil tercatat |
| --- | --- |
| `npm run typecheck` | Berhasil, tanpa error TypeScript. |
| `npm run lint` | Berhasil, tanpa warning/error. |
| `npm run build` | Berhasil; Vite melaporkan `✓ built in 1.69s`. |
| `npm run test:pilot` | 16/16 lulus, 0 gagal. |
| `npm run test:v1` | 35/35 lulus saat implementasi. Setelah perbaikan lanjutan (uji `scopes: []` dan batas gagal autentikasi API key): 37/37 lulus, 0 gagal. |
| `node --test src/frontendReview.test.js src/services/*.test.js src/utils/*.test.js` | 22/22 lulus, 0 gagal. Node mencetak `ExperimentalWarning` bahwa `localStorage` tidak tersedia tanpa `--localstorage-file`; seluruh tes tetap lulus. |
| `git diff --check` | Saat verifikasi implementasi: exit 0, tanpa output. |

Tes frontend mencakup batal tanpa request, konfirmasi yang menerbitkan kode untuk perangkat yang dipilih, serta markup tautan tab baru dan konfigurasi proxy `/docs`.

Browser E2E menggunakan schema PostgreSQL sungguhan dan mencatat `pageErrors: 0`. Cakupan meliputi state QR/klaim; List IoT offline tanpa data contoh; fallback input manual; salin dan cabut key dengan respons 401; fokus modal; referensi OpenAPI; overflow pada lebar 360 px dan 390 px; serta cetak dan unduh SVG. Skenario QR/klaim mencakup perangkat milik sendiri, perangkat milik akun lain, kode tidak dikenal, kedaluwarsa, belum login, dan backend tidak tersedia.

Playwright E2E UI-01 **PASS**: skrip `ui01-login.mjs` di scratch membuat schema PostgreSQL sementara dari `TEST_DATABASE_URL`, membuat akun uji admin/user dengan password acak yang hanya disimpan di memori, lalu mengisi form login asli. Kedua role berhasil login; menu Developer/Kelola IoT sesuai peran, nama profil lama tetap tampil, dan logout mengembalikan form login. `pageErrors: 0`. Empat respons HTTP 401 saat sesi belum terautentikasi memang diharapkan dan bukan error JavaScript. Password tidak ditulis, dicetak, atau dilaporkan.

Rasio kontras yang tercatat pada audit awal: putih pada `#0f5238` 9.19:1; `#191c1d` pada `#f8fafb` 16.37:1; `#e9eeea` pada `#171c19` 14.70:1; `#95d4b3` pada `#131715` 10.63:1; `#78350f` pada `#fef3c7` 8.15:1; dan `#991b1b` pada `#fef2f2` 7.60:1.

## Belum diuji dan status gate

- **UI-03/04:** pemindaian QR memakai HP fisik belum diuji. Alur URL dan klaim di browser telah lulus, tetapi tidak menggantikan uji scan fisik.
- Playwright E2E UI-01 form login admin/user **PASS**. UI-02/05/06/08/09 juga **PASS**; hanya pemindaian fisik UI-03/04 yang masih pending. Karena itu gate Minggu 2 belum lulus penuh. Status keseluruhan **FAIL/belum lulus gate penuh**, bukan PASS.

## Batas perubahan

Kriteria gate pada bagian 7 Test Plan tidak diubah. Follow-up lama telah digabungkan ke dokumen ini dan dihapus sebagai duplikat; audit awal tidak diubah. Perbaikan lanjutan setelah follow-up ini memperbarui API Contract bagian 5 (batas gagal autentikasi API key) dan 6.8 (minimal satu scope), changelog, serta status Minggu 2 di Test Plan bagian 7.
