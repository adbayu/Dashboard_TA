# ADR-0014: Sandbox menyediakan satu device virtual per akun

Status: Usulan · Tanggal: 5 Oktober 2026

## Konteks

Mitra perlu mencoba alur ingest dan monitoring tanpa menyentuh telemetry device live. Provisioning dapat dipicu oleh pembuatan key test maupun pembukaan panel sandbox, termasuk untuk akun yang sudah ada sebelum fitur simulator. Device virtual tidak memakai credential ESP32 dan tidak boleh menghabiskan kapasitas pilot live.

## Keputusan

Pastikan tepat satu device sandbox virtual per akun melalui pemetaan unik dan transaksi yang diserialisasi; gunakan sequence database untuk kode global `AQ-SBX-<NNN>`. Device dengan `is_sandbox=true` berada di luar batas 20 unit pilot, dan telemetry hanya dibuat oleh runner.

## Konsekuensi

- GET panel berulang dan POST key test paralel tidak membuat device ganda.
- Kode sandbox unik lintas akun, tanpa bergantung pada `MAX(code)+1`.
- Batas pilot tetap berarti 20 unit live; jumlah sandbox tidak mengurangi kuota tersebut.
- Sandbox tidak dapat diklaim, dirotasi, dilepas, diberi aktivasi, atau dibuatkan QR.

## Alternatif yang ditolak

- **Menghitung sandbox pada batas 20:** mengurangi kapasitas live untuk uji integrasi.
- **Membuat device baru setiap membuka panel:** menghasilkan duplikasi dan membingungkan ownership.
- **Kode berdasarkan hitung maksimum tanpa sequence:** rentan bentrok pada provisioning paralel.
