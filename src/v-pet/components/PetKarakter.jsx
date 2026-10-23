import {
  parseLevelArtworkPath,
  resolvePetArtwork,
  spriteSheetLayoutForArtwork,
  spriteStateForExpression,
} from '../model/petCharacterLevels';

const ART_FILES = import.meta.glob('../assets/karakter-arcade/*/body.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_PNG_FILES = import.meta.glob('../assets/karakter-level/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_GIF_FILES = import.meta.glob('../assets/karakter-level/*/*.gif', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_ART_FILES = { ...LEVEL_PNG_FILES, ...LEVEL_GIF_FILES };
const CONDITION_BACKGROUND_LEVELS = { nila: [1, 2, 3, 4], gurame: [1, 2, 3, 4], kangkung: [1, 2, 3, 4] };
const SENSOR_FILES = import.meta.glob('../assets/ikon-sensor/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const namaKeKunci = {
  'ikan nila': 'nila',
  'ikan gurame': 'gurame',
  kangkung: 'kangkung',
};

const gambarKarakter = Object.fromEntries(
  Object.entries(ART_FILES).flatMap(([path, url]) => {
    const match = path.match(/karakter-arcade\/([^/]+)\/body\.png$/);
    return match ? [[match[1], url]] : [];
  }),
);

const levelArtwork = Object.entries(LEVEL_ART_FILES)
  .map(([path, url]) => parseLevelArtworkPath(path, url))
  .filter(Boolean);

const ikonSensor = Object.fromEntries(
  Object.entries(SENSOR_FILES).flatMap(([path, url]) => {
    const match = path.match(/ikon-sensor\/([^/]+)\.svg$/);
    return match ? [[match[1], url]] : [];
  }),
);

// Reaksi sensor IoT (diwarisi dari `src/data/reaksiPet.js` versi HEAD).
// Pet ikan memakai peta ini di VPet.jsx; komponen ini hanya menyiapkan kelas
// `pet-tingkat-<nama>` agar warna panggung mengikuti status air, dan atribut
// `data-ekspresi` agar kondisi (asam/basa, kedinginan, kotor, lapar, dsb)
// bisa dibaca CSS maupun pengujian.
export const ekspresiSensorAir = Object.freeze({
  asam: 'asam',
  basa: 'basa',
  kedinginan: 'kedinginan',
  kepanasan: 'kepanasan',
  'nutrisi-rendah': 'membutuhkan nutrisi',
  'nutrisi-tinggi': 'kelebihan nutrisi',
  gelisah: 'perlu diawasi',
  senang: 'nyaman',
  sedih: 'tidak nyaman',
  lapar: 'lapar',
  kotor: 'kolam kotor',
  sakit: 'tidak enak badan',
  mengantuk: 'menunggu sensor',
});

export function kelasTingkatSensor(tingkat = 'aman') {
  const valid = new Set(['aman', 'waspada', 'bahaya']);
  return `pet-tingkat-${valid.has(tingkat) ? tingkat : 'aman'}`;
}

export const kunciKarakter = (species = '') => {
  const normalized = String(species).toLowerCase().trim();
  return namaKeKunci[normalized] || 'unknown';
};

export function IkonSensor({ nama = 'aman', size = 20, className = '' }) {
  const url = ikonSensor[nama] || ikonSensor.aman;
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
  level = 1,
  pesan = '',
  ekspresi = 'senang',
  tingkat = 'aman',
  tinggi = 320,
  className = '',
}) {
  const key = kunciKarakter(species);
  const spriteState = spriteStateForExpression(ekspresi);
  const artwork = resolvePetArtwork({ speciesKey: key, level, expression: spriteState, levelArt: levelArtwork, speciesArt: gambarKarakter });
  const spriteLayout = spriteSheetLayoutForArtwork(artwork);
  const hasConditionBackground = artwork?.format === 'gif'
    && artwork.minLevel === artwork.maxLevel
    && CONDITION_BACKGROUND_LEVELS[artwork.speciesKey]?.includes(artwork.minLevel);
  const gambar = artwork?.src;
  const spriteRow = spriteLayout?.rows[spriteState] ?? spriteLayout?.rows.senang;
  const levelLabel = artwork?.title || `level ${Math.max(1, Math.floor(Number(level) || 1))}`;
  const label = gambar
    ? `Karakter ${species}, ${levelLabel}${artwork?.expression ? `, ekspresi ${artwork.expression}` : spriteLayout ? `, ekspresi ${spriteState}` : ''}${pesan ? `. ${pesan}` : ''}`
    : `Karakter ${species} belum ditambahkan${pesan ? `. ${pesan}` : ''}`;

  return (
    <div className="pet-container">
      <div
        className={`pet-panggung pet-karakter-${key}${spriteLayout ? ' pet-panggung-sprite' : ''}${hasConditionBackground ? ' pet-panggung-kondisi' : ''} ${kelasTingkatSensor(tingkat)} ${className}`}
        style={{ '--pet-tinggi': `${tinggi}px` }}
        role="group"
        aria-label={label}
        data-ekspresi={ekspresi}
      >
        {gambar ? (
          spriteLayout ? (
            <div
              className="pet-sprite-viewport"
              data-sprite-state={spriteState}
              style={{ aspectRatio: `${spriteLayout.frameWidth} / ${spriteLayout.frameHeight}` }}
            >
              <img
                className="pet-sprite-sheet"
                src={gambar}
                alt=""
                draggable="false"
                style={{ '--pet-sprite-top': `${-(spriteRow / spriteLayout.frameHeight) * 100}%` }}
              />
            </div>
          ) : (
            <div className="pet-user-art-wrap">
              <img className="pet-user-art" src={gambar} alt="" draggable="false" />
            </div>
          )
        ) : (
          <div className="pet-karakter-kosong" role="status">
            Karakter belum ditambahkan
          </div>
        )}
      </div>
    </div>
  );
}
