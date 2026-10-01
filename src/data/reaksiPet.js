// Aturan reaksi Virtual Pet terhadap pembacaan sensor IoT.
//
// Ini SATU-SATUNYA tempat yang menentukan bagaimana kondisi air memengaruhi
// perilaku pet. Halaman V-Pet, panel admin, dan (nanti) notifikasi membaca
// fungsi `reaksiPet` di sini supaya bahasa dan ambangnya tidak berbeda-beda.
//
// Ambang TIDAK ditulis di berkas ini. Ambang selalu diambil dari helper bersama
// `ambangUntuk` (area.targets -> kategori device), sama seperti Dashboard,
// List IoT, dan statistik harian. Jadi kalau pengelola mengubah ambang di
// Kelola Kategori / Kelola Area, reaksi pet otomatis ikut berubah.

// Seberapa jauh nilai menyimpang dari ambang, dalam satuan persen dari lebar
// ambang. Dipakai untuk membedakan "waspada" dan "bahaya" tanpa menulis angka
// sensor lagi di tempat lain.
export function jauhnyaDariAmbang(value, ambang) {
  if (value == null || !ambang) return null;
  const [min, max] = ambang;
  const lebar = Math.max(1e-6, max - min);
  if (value < min) return (min - value) / lebar;
  if (value > max) return (value - max) / lebar;
  return 0;
}

// Arah penyimpangan: 'bawah' | 'atas' | 'dalam' | null.
export function arahPenyimpangan(value, ambang) {
  if (value == null || !ambang) return null;
  const [min, max] = ambang;
  if (value < min) return 'bawah';
  if (value > max) return 'atas';
  return 'dalam';
}

// Pesan per parameter. Setiap entri punya bentuk berbeda untuk 'bawah' dan
// 'atas' karena reaksi fisiknya memang berlawanan (dingin vs panas).
const PESAN = {
  temp: {
    bawah: { ekspresi: 'kedinginan', latar: 'kolam-dingin', gelembung: 'bulat',
      pesan: (v, unit) => `${v} ${unit} itu dingin sekali. Air sedingin ini bikin gerakku lambat.`, aksi: 'Naikkan suhu air' },
    atas: { ekspresi: 'kepanasan', latar: 'kolam-mendidih', gelembung: 'bulat',
      pesan: (v, unit) => `${v} ${unit} terlalu hangat. Aku sulit bernapas kalau airnya sehangat ini.`, aksi: 'Turunkan suhu air' },
  },
  ph: {
    bawah: { ekspresi: 'asam', latar: 'kolam-air-hijau', gelembung: 'bulat',
      pesan: (v) => `Airnya asam (${v}). Kulit dan insangku terasa perih.`, aksi: 'Naikkan pH' },
    atas: { ekspresi: 'basa', latar: 'kolam-air-hijau', gelembung: 'bulat',
      pesan: (v) => `Airnya terlalu basa (${v}). Aku gelisah dan susah tenang.`, aksi: 'Turunkan pH' },
  },
  tds: {
    bawah: { ekspresi: 'nutrisi-rendah', latar: 'kolam-berbusa', gelembung: 'bulat',
      pesan: (v, unit) => `Nutrisi tinggal ${v} ${unit}. Aku lemas, sepertinya kurang asupan.`, aksi: 'Tambah nutrisi' },
    atas: { ekspresi: 'nutrisi-tinggi', latar: 'kolam-keruh', gelembung: 'bulat',
      pesan: (v, unit) => `Nutrisi ${v} ${unit} terlalu pekat. Airnya terasa berat.`, aksi: 'Kurangi nutrisi' },
  },
};

export const URUTAN_PARAMETER = ['temp', 'ph', 'tds'];

// Kondisi air per parameter, lalu reaksi pet yang dipilih.
//
// Keluaran:
//   parameter[]  : status tiap sensor (dipakai kartu kondisi air)
//   ekspresi     : nama berkas di src/assets/v-pet/ekspresi/
//   latar        : nama berkas di src/assets/v-pet/latar/
//   gelembung    : nama berkas di src/assets/v-pet/gelembung/
//   pesan        : kalimat reaksi yang ditampilkan di gelembung bicara
//   aksi         : saran tindakan untuk operator
//   tingkat      : 'aman' | 'waspada' | 'bahaya'
//   dessert      : kode sebab (untuk ditampilkan sebagai chip kecil)
export function reaksiPet(parameter, { lapar = 0, kotor = 0, sakit = 0 } = {}) {
  const terisi = parameter.filter((p) => p.ambang && p.value != null);
  // Ambang "jauh dari ambang" = 25% dari LEBAR ambang. Angka ini dipilih supaya
  // penyimpangan kecil tidak langsung disebut bahaya: suhu 24,6 °C pada ambang
  // 25–29 °C (lebar 4) hanya 10%, jadi masih "waspada"; sedangkan 18 °C (175%)
  // atau 34 °C (125%) memang bahaya. Menghitung dalam persen lebar ambang
  // membuat aturan ini bekerja untuk pH (lebar 1) maupun TDS (lebar 400)
  // tanpa menulis angka berbeda per sensor.
  const BATAS_BAHAYA = 0.25;
  const dinilai = terisi.map((p) => {
    const arah = arahPenyimpangan(p.value, p.ambang);
    const jauh = jauhnyaDariAmbang(p.value, p.ambang);
    const tingkat = arah === 'dalam' ? 'aman' : jauh > BATAS_BAHAYA ? 'bahaya' : 'waspada';
    return { ...p, arah, jauh, tingkat };
  });

  // Prioritas pemilihan reaksi:
  // 1. parameter paling menyimpang (paling jauh dari ambang)
  // 2. kalau air aman, kondisi pet sendiri (lapar/kotor/sakit) yang bicara
  // Dengan begitu satu reaksi selalu jelas sebabnya, bukan campuran.
  const bermasalah = [...dinilai]
    .filter((p) => p.tingkat !== 'aman')
    .sort((a, b) => (b.jauh ?? 0) - (a.jauh ?? 0));

  const dasar = {
    parameter: dinilai.map((p) => ({
      key: p.key, label: p.label, value: p.value, unit: p.unit, ambang: p.ambang,
      arah: p.arah, tingkat: p.tingkat,
    })),
  };

  if (bermasalah.length) {
    const utama = bermasalah[0];
    const aturan = PESAN[utama.key]?.[utama.arah];
    if (aturan) {
      return {
        ...dasar,
        ekspresi: aturan.ekspresi,
        latar: aturan.latar,
        gelembung: aturan.gelembung,
        pesan: aturan.pesan(utama.value, utama.unit),
        aksi: aturan.aksi,
        tingkat: bermasalah.some((p) => p.tingkat === 'bahaya') ? 'bahaya' : 'waspada',
        sebab: utama,
      };
    }
  }

  // Air aman: kondisi pet sendiri yang menentukan reaksinya.
  if (lapar >= 70) return { ...dasar, ekspresi: 'lapar', latar: 'kolam-jernih', gelembung: 'kotak',
    pesan: 'Aku lapar. Airnya bagus, tapi perutku kosong.', aksi: 'Beri pakan', tingkat: 'waspada', sebab: { key: 'hunger', label: 'Kenyang' } };
  if (kotor >= 70) return { ...dasar, ekspresi: 'kotor', latar: 'kolam-berbusa', gelembung: 'kotak',
    pesan: 'Airnya sudah bagus, tapi aku sendiri butuh dibersihkan.', aksi: 'Bersihkan kolam', tingkat: 'waspada', sebab: { key: 'hygiene', label: 'Kebersihan' } };
  if (sakit >= 70) return { ...dasar, ekspresi: 'sakit', latar: 'kolam-jernih', gelembung: 'kotak',
    pesan: 'Airnya aman, tapi aku sedang tidak enak badan.', aksi: 'Rawat pet', tingkat: 'waspada', sebab: { key: 'health', label: 'Kesehatan' } };
  if (!dinilai.length) return { ...dasar, ekspresi: 'mengantuk', latar: 'kolam-jernih', gelembung: 'pikiran',
    pesan: 'Belum ada sensor di area ini, jadi aku belum bisa bilang apa-apa tentang airnya.', aksi: 'Pasang sensor di area ini', tingkat: 'aman', sebab: null };

  const semuaAman = dinilai.every((p) => p.tingkat === 'aman');
  return { ...dasar,
    ekspresi: semuaAman ? 'senang' : 'gelisah',
    latar: 'kolam-jernih',
    gelembung: 'bulat',
    pesan: semuaAman ? 'Airnya nyaman sekali. Aku sehat dan aktif hari ini.' : 'Airnya masih aman, tapi ada yang bergerak mendekati batas. Ayo dipantau.',
    aksi: semuaAman ? 'Pertahankan kondisi' : 'Pantau lebih sering',
    tingkat: semuaAman ? 'aman' : 'waspada',
    sebab: null };
}

// Aksesori mengikuti level pet supaya ada alasan visual untuk naik level.
export function aksesoriUntukLevel(level = 1) {
  if (level >= 12) return 'mahkota';
  if (level >= 8) return 'medali';
  if (level >= 5) return 'daun';
  if (level >= 3) return 'pita';
  return 'none';
}

// Sikap (pose) dipakai untuk animasi CSS: nama ini menjadi kelas `pet-sikap-<nama>`.
export function sikapUntukEkspresi(ekspresi) {
  if (['senang'].includes(ekspresi)) return 'gembira';
  if (['kedinginan', 'sakit', 'mengantuk'].includes(ekspresi)) return 'menggigil';
  if (['kepanasan', 'gelisah'].includes(ekspresi)) return 'resah';
  if (['lapar', 'kotor'].includes(ekspresi)) return 'lemah';
  return 'tenang';
}
