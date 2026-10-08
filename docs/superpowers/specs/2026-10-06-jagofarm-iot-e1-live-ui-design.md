# Catatan desain historis E1

> Arsip workflow Superpowers. Dokumen ini merekam keputusan desain E1 pada 6 Oktober 2026, bukan spesifikasi produk aktif.

## Penempatan dan sumber kebenaran

Spesifikasi ini disimpan di `docs/superpowers` karena mendahului pekerjaan yang dilacak oleh workflow tersebut. Dokumen kanonis ada di `docs/iot`: kontrak API, UX, sistem desain, dan Test Plan. Untuk keputusan produk terkini, gunakan dokumen kanonis dan implementasi backend.

## Keputusan yang membentuk implementasi

- Adapter IoT memakai jalur request aplikasi dan meneruskan hasil backend. Sumber lokal tidak mengarang telemetry atau credential.
- Client SSE memakai fetch, bukan `EventSource`, agar dapat memeriksa status HTTP dan mengatur header replay. Subscriber berbagi satu koneksi dan satu jadwal polling.
- Halaman IoT mengonsumsi snapshot API; stream memperbarui data yang cocok. Histori dan event kosong tetap kosong, bukan diisi contoh.
- Rotasi credential menahan secret di state dialog sementara. Secret tidak disimpan atau dicatat, dan UI meminta konfirmasi penyimpanan sebelum dialog ditutup.
- Arah visual mengikuti Lumina Aqua dan token yang sudah ada. Animasi grafik dinonaktifkan; perubahan tema dan fokus modal memakai pola komponen proyek.

## Batas arsip

Rincian route, copy layar, state UI, serta kriteria penerimaan tidak disalin di sini karena sudah ada di dokumen `docs/iot` yang menjadi rujukan. Catatan ini hanya mempertahankan alasan arsitektur yang berguna untuk memahami implementasi E1.
