import { useEffect, useState } from 'react';
import {
  parseLevelArtworkPath,
  resolvePetArtwork,
  spriteSheetLayoutForArtwork,
  spriteStateForExpression,
} from '../data/petCharacterLevels';

const ART_FILES = import.meta.glob('../assets/v-pet/karakter-arcade/*/body.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_PNG_FILES = import.meta.glob('../assets/v-pet/karakter-level/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_GIF_FILES = import.meta.glob('../assets/v-pet/karakter-level/*/*.gif', {
  eager: true,
  query: '?url',
  import: 'default',
});
const LEVEL_ART_FILES = { ...LEVEL_PNG_FILES, ...LEVEL_GIF_FILES };
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

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(query);
    const update = (event) => setReduced(event.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

export default function PetKarakter({
  species = 'Ikan Nila',
  level = 1,
  pesan = '',
  ekspresi = 'senang',
  tinggi = 320,
  className = '',
}) {
  const key = kunciKarakter(species);
  const reducedMotion = usePrefersReducedMotion();
  const spriteState = spriteStateForExpression(ekspresi);
  const artwork = resolvePetArtwork({ speciesKey: key, level, expression: spriteState, levelArt: levelArtwork, speciesArt: gambarKarakter });
  const spriteLayout = spriteSheetLayoutForArtwork(artwork);
  const gifSuppressed = artwork?.animated && reducedMotion;
  const gambar = gifSuppressed ? null : artwork?.src;
  const spriteRow = spriteLayout?.rows[spriteState] ?? spriteLayout?.rows.senang;
  const levelLabel = artwork?.title || `level ${Math.max(1, Math.floor(Number(level) || 1))}`;
  const label = gambar
    ? `Karakter ${species}, ${levelLabel}${artwork?.expression ? `, ekspresi ${artwork.expression}` : spriteLayout ? `, ekspresi ${spriteState}` : ''}${pesan ? `. ${pesan}` : ''}`
    : gifSuppressed
      ? `Animasi karakter ${species} tidak ditampilkan karena preferensi pengurangan gerakan${pesan ? `. ${pesan}` : ''}`
      : `Karakter ${species} belum ditambahkan${pesan ? `. ${pesan}` : ''}`;

  return (
    <div className="pet-container">
      <div
        className={`pet-panggung pet-karakter-${key}${spriteLayout ? ' pet-panggung-sprite' : ''} ${className}`}
        style={{ '--pet-tinggi': `${tinggi}px` }}
        role="group"
        aria-label={label}
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
            {gifSuppressed ? 'Animasi GIF disembunyikan karena pengaturan pengurangan gerakan.' : 'Karakter belum ditambahkan'}
          </div>
        )}
      </div>
    </div>
  );
}
