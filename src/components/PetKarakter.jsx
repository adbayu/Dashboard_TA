import { parseLevelArtworkPath, resolvePetArtwork } from '../data/petCharacterLevels';

const ART_FILES = import.meta.glob('../assets/v-pet/karakter-arcade/*/body.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_ART_FILES = import.meta.glob('../assets/v-pet/karakter-level/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const SENSOR_FILES = import.meta.glob('../assets/v-pet/ikon-sensor/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const namaKeKunci = {
  'ikan nila': 'nila',
  'ikan lele': 'lele',
  'ikan gurame': 'gurame',
  'ikan mas': 'mas',
  'udang galah': 'udang',
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

export const kunciKarakter = (species = '') => {
  const normalized = String(species).toLowerCase().trim();
  return namaKeKunci[normalized]
    || normalized.replace(/^ikan\s+/, '').replace(/[^a-z0-9]+/g, '-');
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
  tinggi = 320,
  className = '',
}) {
  const key = kunciKarakter(species);
  const artwork = resolvePetArtwork({ speciesKey: key, level, levelArt: levelArtwork, speciesArt: gambarKarakter });
  const gambar = artwork?.src;
  const levelLabel = artwork?.title || `level ${Math.max(1, Math.floor(Number(level) || 1))}`;
  const label = gambar
    ? `Karakter ${species}, ${levelLabel}${pesan ? `. ${pesan}` : ''}`
    : `Karakter ${species} belum ditambahkan${pesan ? `. ${pesan}` : ''}`;

  return (
    <div className="pet-container">
      <div
        className={`pet-panggung pet-karakter-${key} ${className}`}
        style={{ '--pet-tinggi': `${tinggi}px` }}
        role="group"
        aria-label={label}
      >
        {gambar ? (
          <div className="pet-user-art-wrap">
            <img className="pet-user-art" src={gambar} alt="" draggable="false" />
          </div>
        ) : (
          <div className="pet-karakter-kosong" role="status">
            Karakter belum ditambahkan
          </div>
        )}
      </div>
    </div>
  );
}
