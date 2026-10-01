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

// Titik tempel di badan karakter, dinyatakan sebagai pecahan dari kotak badan
// (0..1). Angka ini HARUS cocok dengan badan SVG di `karakter/*.svg`; setiap
// badan menuliskan jangkarnya di komentar paling atas berkasnya.
//   mata  = titik tengah baris mata, tempat `ekspresi/<nama>.svg` ditempel
//   kepala = bagian atas kepala, tempat `aksesori/<nama>.svg` ditempel
// `kepala` = titik di mana bagian BAWAH aksesori diletakkan (bukan titik tengah),
// supaya hiasan kepala terlihat menempel di atas kepala, bukan menggantung.
const JANGKAR = {
  nila: { mata: [133 / 240, 41 / 160], kepala: [0.47, 40 / 160] },
  lele: { mata: [136 / 240, 44 / 160], kepala: [0.47, 54 / 160] },
  gurame: { mata: [130 / 240, 46 / 160], kepala: [0.48, 32 / 160] },
  mas: { mata: [136 / 240, 44 / 160], kepala: [0.49, 44 / 160] },
  udang: { mata: [140 / 240, 40 / 160], kepala: [0.52, 28 / 160] },
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
    return {
      wajah: {
        left: `${(mx - LEBAR_WAJAH / 2) * 100}%`,
        top: `${(my - BARIS_MATA * TINGGI_WAJAH) * 100}%`,
        width: `${LEBAR_WAJAH * 100}%`,
        height: `${TINGGI_WAJAH * 100}%`,
      },
      aksesori: {
        left: `${(jangkar.kepala[0] - LEBAR_WAJAH / 2) * 100}%`,
        top: `${(jangkar.kepala[1] - TINGGI_WAJAH + 0.10) * 100}%`,
        width: `${LEBAR_WAJAH * 100}%`,
        height: `${TINGGI_WAJAH * 100}%`,
      },
    };
  }, [jangkar]);

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
