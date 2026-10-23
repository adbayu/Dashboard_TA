// Resolver isi QR alat.
//
// Ada TIGA bentuk isi QR yang beredar di aplikasi ini dan semuanya harus bisa
// dibaca, karena label QR lama mungkin sudah dicetak/ditempel di alat:
//   1. URL halaman perangkat : http://…/iot/IOT-001          (dipakai halaman List IoT)
//   2. Format kode ringkas   : JAGOFARM|AQ-PH-001|IOT-001    (dipakai Kelola IoT)
//   3. Kode alat saja        : AQ-PH-001
// Kalau salah satu bentuk ditolak, pengguna lapangan akan mengira QR-nya rusak.
//
// Halaman Detail Information TIDAK mengandalkan pembukaan URL (tidak ada
// navigasi ke luar), jadi tautan berisi host apa pun tetap bisa dibaca di sini.

// Ambil kandidat kunci dari isi QR: id perangkat dan/atau kode alat.
export function bacaIsiQr(teks) {
  const mentah = (teks || '').trim();
  if (!mentah) return { id: null, kode: null, bentuk: 'kosong', mentah };

  // Bentuk 2: JAGOFARM|<kode>|<id>
  if (/^JAGOFARM\|/i.test(mentah)) {
    const bagian = mentah.split('|').map((s) => s.trim());
    return { id: bagian[2] || null, kode: bagian[1] || null, bentuk: 'kode-ringkas', mentah };
  }

  // Bentuk 1: URL apa pun yang punya segmen /iot/<sesuatu> atau ?alat=<sesuatu>
  if (/^https?:\/\//i.test(mentah)) {
    const cocokPath = mentah.match(/\/iot\/([^/?#]+)/i);
    if (cocokPath) return { id: decodeURIComponent(cocokPath[1]), kode: null, bentuk: 'url', mentah };
    const cocokQuery = mentah.match(/[?&](?:alat|device|id)=([^&#]+)/i);
    if (cocokQuery) return { id: decodeURIComponent(cocokQuery[1]), kode: null, bentuk: 'url', mentah };
    return { id: null, kode: null, bentuk: 'url-tak-dikenal', mentah };
  }

  // Bentuk 3: kode alat apa adanya (mis. AQ-PH-001)
  return { id: null, kode: mentah, bentuk: 'kode-alat', mentah };
}

// Cari perangkat dari isi QR. Pencocokan kode alat mengabaikan besar-kecil
// huruf dan spasi, karena kode sering diketik ulang secara manual.
export function cariPerangkat(daftar, teksQr) {
  const { id, kode, bentuk, mentah } = bacaIsiQr(teksQr);
  const devices = daftar || [];
  const normal = (s) => (s || '').toString().trim().toUpperCase().replace(/\s+/g, '');

  let device = null;
  let cara = null;

  if (id) {
    device = devices.find((d) => d.id.toUpperCase() === normal(id)) || null;
    if (device) cara = 'id';
  }
  if (!device && kode) {
    device = devices.find((d) => normal(d.code) === normal(kode)) || null;
    if (device) cara = 'kode';
  }
  // Toleransi terakhir: sebagian orang menempelkan nama perangkat, bukan kode.
  if (!device && bentuk === 'kode-alat' && kode) {
    device = devices.find((d) => normal(d.name) === normal(kode)) || null;
    if (device) cara = 'nama';
  }

  return { device, cara, bentuk, mentah };
}
