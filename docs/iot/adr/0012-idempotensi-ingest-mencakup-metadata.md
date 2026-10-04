# ADR-0012: Idempotensi ingest membandingkan metadata

Status: Usulan · Tanggal: 3 Oktober 2026

## Konteks

Kontrak ingest menyatakan bahwa `messageId` yang sama dengan payload berbeda mendapat 409 `CONFLICT`. Field `meta` pada ingest v2 berisi RSSI dan versi firmware; jika tidak disimpan, server tidak dapat membedakan retry identik dari payload dengan metadata yang berubah.

## Keputusan

Tabel `readings` menyimpan `ingest_version`, `ingest_type`, dan `ingest_meta`. Saat `messageId` yang sama diterima, server membandingkan versi, model/tipe, waktu ukur, readings, dan metadata. Baris pilot yang sudah ada dimigrasikan sebagai versi 1, dengan tipe dari `devices.model` dan metadata kosong.

## Konsekuensi

- Retry dengan seluruh payload yang sama menghasilkan `duplicate: true`.
- Perubahan pada `meta` dengan `messageId` yang sama menghasilkan 409 `CONFLICT`.
- Metadata per reading menambah sedikit ukuran penyimpanan, tetapi tetap tersedia untuk audit retry.
- Pengirim wajib membekukan `meta` per `messageId`. Firmware menyimpan RSSI di record buffer saat sampel diukur. Kalau RSSI dibaca ulang saat retry, kiriman yang sebenarnya sudah tersimpan akan mendapat 409, bukan `duplicate: true`.
- Batasan yang diterima: kalau firmware di-update di antara kiriman pertama dan retry, `meta.fw` berubah dan retry itu mendapat 409. Datanya tetap aman karena kiriman pertama sudah tersimpan.

## Alternatif yang ditolak

- **Mengabaikan `meta` saat membandingkan payload:** dua payload berbeda dapat dianggap duplikat.
- **Menyimpan hash payload saja:** memerlukan aturan serialisasi kanonis tambahan dan tidak menyediakan metadata ingest untuk audit.
