import { useMemo } from 'react';

// Panggung Virtual Pet 2D.
//
// Berkas gambar TIDAK di-import satu per satu: seluruh isi
// `src/assets/v-pet/<folder>/<nama>.svg` didaftarkan otomatis, sehingga menambah
// atau mengganti gambar cukup dengan menaruh berkas baru di folder yang sesuai
// TANPA menyentuh kode ini. Nama berkas = nama yang dipakai di data.
// Contoh: `src/assets/v-pet/ekspresi/lelah.svg` bisa dipakai dengan
// ekspresi="lelah".
const BERKAS = import.meta.glob('../assets/v-pet/**/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const PETA = {};
for (const [jalur, url] of Object.entries(BERKAS)) {
  const cocok = jalur.match(/v-pet\/([^/]+)\/([^/]+)\.svg$/);
  if (!cocok) continue;
  const [, folder, nama] = cocok;
  PETA[folder] = PETA[folder] || {};
  PETA[folder][nama] = url;
}

// Nilai bawaan bila nama berkas tidak ditemukan, supaya panggung tidak pernah
// tampil kosong hanya karena salah tulis nama.
const CADANGAN = {
  karakter: 'nila',
  ekspresi: 'netral',
  aksesori: 'none',
  gelembung: 'bulat',
  latar: 'kolam-jernih',
  'ikon-sensor': 'aman',
};

function urlAset(folder, nama) {
  const isi = PETA[folder] || {};
  return isi[nama] || isi[CADANGAN[folder]] || null;
}

// Nama jenis hewan di data (mis. "Ikan Nila", "Udang Galah") dipetakan ke nama
// berkas di folder `karakter/`. Tambah baris di sini kalau menambah karakter
// baru; nama berkasnya harus sama dengan nilai di sebelah kanan.
const KARAKTER = {
  'ikan nila': 'nila',
  'ikan lele': 'lele',
  'ikan gurame': 'gurame',
  'ikan mas': 'mas',
  'udang galah': 'udang',
};

export const kunciKarakter = (species = '') =>
  KARAKTER[String(species).toLowerCase().trim()] || 'nila';

// Titik tempel di badan karakter. Angka-angka ini TIDAK ditebak: semuanya
// diukur dengan mencari posisi yang membuat seluruh piksel mata+mult (ekspresi)
// jatuh di atas piksel badan, dengan prioritas posisi paling kanan (dekat
// kepala). Cara mengukur ulang ada di src/assets/v-pet/README.md.
//   mata  = titik tengah baris mata -> tempat `ekspresi/<nama>.svg` ditempel
//   kepala = titik BAWAH aksesori -> tempat `aksesori/<nama>.svg` ditempel
//            (jadi hiasan kepala terlihat menempel, bukan menggantung)
//   wajahSkala = pengali ukuran kotak wajah bila bentuk badannya tipis
const JANGKAR = {
  nila: { mata: [168 / 240, 70 / 160], kepala: [0.62, 40 / 160], wajahSkala: 1 },
  lele: { mata: [168 / 240, 77 / 160], kepala: [0.62, 52 / 160], wajahSkala: 1 },
  gurame: { mata: [161 / 240, 62 / 160], kepala: [0.62, 31 / 160], wajahSkala: 1 },
  mas: { mata: [166 / 240, 70 / 160], kepala: [0.62, 40 / 160], wajahSkala: 1 },
  udang: { mata: [150 / 240, 72 / 160], kepala: [0.62, 44 / 160], wajahSkala: 0.85 },
};

// Sebagian tinta aksesori TIDAK mencapai dasar kotaknya (pita berhenti di 72%
// tinggi kotak, medali sampai 85%). Tanpa koreksi ini hiasan kepala tampak
// melayang di atas karakter. Angka di bawah adalah hasil pengukuran piksel tiap
// berkas di `aksesori/`; ukur ulang kalau gambarnya diganti.
const AKSESORI_TINTA_BAWAH = {
  none: 1,
  pita: 0.720,
  daun: 0.773,
  medali: 0.847,
  mahkota: 0.713,
};

// Kotak ekspresi & aksesori: 60x60 pada kanvas badan 240x160.
const LEBAR_WAJAH = 60 / 240; // 25% lebar badan
const TINGGI_WAJAH = 60 / 160; // 37,5% tinggi badan
const BARIS_MATA = 26 / 60; // baris mata berada di 43,3% tinggi kotak ekspresi

export function IkonSensor({ nama = 'aman', size = 20, className = '' }) {
  const url = urlAset('ikon-sensor', nama);
  if (!url) return null;
  return (
    <span
      className={`pet-ikon ${className}`}
      style={{ backgroundImage: `url("${url}")`, width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export default function PetKarakter({
  species = 'Ikan Nila',
  ekspresi = 'netral',
  aksesori = 'none',
  gelembung = 'bulat',
  latar = 'kolam-jernih',
  sikap = 'tenang',
  pesan = '',
  tingkat = 'aman',
  level = 1,
  tinggi = 320,
  className = '',
}) {
  const kunci = kunciKarakter(species);
  const jangkar = JANGKAR[kunci] || JANGKAR.nila;

  const posisi = useMemo(() => {
    const [mx, my] = jangkar.mata;
    const skala = jangkar.wajahSkala ?? 1;
    const lebarWajah = LEBAR_WAJAH * skala;
    const tinggiWajah = TINGGI_WAJAH * skala;
    return {
      wajah: {
        left: `${(mx - lebarWajah / 2) * 100}%`,
        top: `${(my - BARIS_MATA * tinggiWajah) * 100}%`,
        width: `${lebarWajah * 100}%`,
        height: `${tinggiWajah * 100}%`,
      },
      aksesori: {
        left: `${(jangkar.kepala[0] - lebarWajah / 2) * 100}%`,
        top: `${(jangkar.kepala[1] - (AKSESORI_TINTA_BAWAH[aksesori] ?? 1) * tinggiWajah) * 100}%`,
        width: `${lebarWajah * 100}%`,
        height: `${tinggiWajah * 100}%`,
      },
    };
  }, [jangkar, aksesori]);

  const urlKarakter = urlAset('karakter', kunci);
  const urlEkspresi = urlAset('ekspresi', ekspresi);
  const urlAksesori = urlAset('aksesori', aksesori);
  const urlLatar = urlAset('latar', latar);
  const urlGelembung = urlAset('gelembung', gelembung);
  const adaAksesori = aksesori && aksesori !== 'none';

  return (
    <div
      className={`pet-panggung pet-tingkat-${tingkat} ${className}`}
      style={{ '--pet-tinggi': `${tinggi}px` }}
      role="img"
      aria-label={pesan ? `Virtual pet ${species}: ${pesan}` : `Virtual pet ${species}`}
    >
      {urlLatar && <div className="pet-latar" data-aset={`latar/${latar}`} style={{ backgroundImage: `url("${urlLatar}")` }} />}

      <div className="pet-panggung-isi">
        <div className={`pet-tubuh pet-sikap-${sikap}`}>
          {urlKarakter && (
            <div className="pet-wujud" data-aset={`karakter/${kunci}`} style={{ backgroundImage: `url("${urlKarakter}")` }} />
          )}
          {urlEkspresi && (
            <div className="pet-ekspresi" data-aset={`ekspresi/${ekspresi}`} style={{ ...posisi.wajah, backgroundImage: `url("${urlEkspresi}")` }} />
          )}
          {adaAksesori && urlAksesori && (
            <div className="pet-aksesori" data-aset={`aksesori/${aksesori}`} style={{ ...posisi.aksesori, backgroundImage: `url("${urlAksesori}")` }} />
          )}
        </div>
      </div>

      <span className="pet-lencana">Level {level}</span>

      {pesan && (
        <div className="pet-gelembung" data-aset={`gelembung/${gelembung}`} style={{ backgroundImage: `url("${urlGelembung}")` }}>
          <p>{pesan}</p>
        </div>
      )}
    </div>
  );
}
