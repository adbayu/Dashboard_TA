// Pemindahan sekali nama ikon Material Symbols lama ke nama lucide untuk data
// yang tersimpan di localStorage (kategori alat dan badge gamifikasi). Font
// Material Symbols sudah dihapus, jadi nama lama tidak lagi dikenali Icon.
// Tabel ini hanya memuat nama yang pernah bisa tersimpan: isi seed, pilihan
// ikon lama di Kategori Device dan Sistem Point, serta nama umum yang mungkin
// diketik pengelola. Nama lain (atau salah ketik) tampil sebagai ikon cadangan.
const IKON_MATERIAL_KE_LUCIDE = {
  air: 'wind',
  bolt: 'zap',
  category: 'shapes',
  device_thermostat: 'thermometer',
  eco: 'leaf',
  emoji_events: 'trophy',
  favorite: 'heart',
  military_tech: 'medal',
  opacity: 'droplets',
  pets: 'paw-print',
  potted_plant: 'sprout',
  science: 'flask-conical',
  sensors: 'radio',
  settings_input_component: 'cable',
  speed: 'gauge',
  stars: 'sparkles',
  thermostat: 'thermometer-sun',
  verified: 'badge-check',
  water: 'waves',
  water_drop: 'droplet',
  water_ec: 'droplet',
};

export function namaIkonBaru(nama) {
  return typeof nama === 'string' && Object.hasOwn(IKON_MATERIAL_KE_LUCIDE, nama)
    ? IKON_MATERIAL_KE_LUCIDE[nama]
    : nama;
}

/** Salinan daftar dengan field `icon` tiap item dipindahkan; item lain tak disentuh. */
export function migrasiIkonDaftar(daftar) {
  if (!Array.isArray(daftar)) return daftar;
  return daftar.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const baru = namaIkonBaru(item.icon);
    return baru === item.icon ? item : { ...item, icon: baru };
  });
}
