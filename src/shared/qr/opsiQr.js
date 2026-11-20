// Opsi gambar QR alat, dipakai QrCode (layar) dan AksiQr (label PNG/cetak).
//
// Warna modul sengaja TIDAK diatur: pustaka qrcode memakai hitam di atas putih,
// kontras tertinggi untuk kamera. QR tidak boleh ikut warna tema (mode gelap
// atau Lumina bisa membalik kontras dan membuatnya tak terbaca). Bingkai terang
// di layar diatur kelas `.qr-plate` di index.css; warna cetak di @media print.
export function opsiGambarQr(lebar) {
  return {
    width: lebar,
    // Zona tenang 4 modul sesuai ISO/IEC 18004, tanpa bergantung padding wadah.
    margin: 4,
    errorCorrectionLevel: 'M',
  };
}
