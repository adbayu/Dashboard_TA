import { useEffect, useState } from 'react';
import {
  parseLevelArtworkPath,
  resolvePetArtwork,
  spriteSheetLayoutForArtwork,
  spriteStateForExpression,
} from '../model/petCharacterLevels';
import {
  parsePetActionAnimationPath,
  resolvePetActionAnimation,
} from '../model/petActionAnimations.js';

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
const ACTION_GIF_FILES = import.meta.glob('../assets/aksi/*/*.gif', {
  eager: true,
  query: '?url',
  import: 'default',
});
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
const actionArtwork = Object.entries(ACTION_GIF_FILES)
  .map(([path, url]) => parsePetActionAnimationPath(path, url))
  .filter(Boolean);
const ikonSensor = Object.fromEntries(
  Object.entries(SENSOR_FILES).flatMap(([path, url]) => {
    const match = path.match(/ikon-sensor\/([^/]+)\.svg$/);
    return match ? [[match[1], url]] : [];
  }),
);

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
  tinggi = 320,
  className = '',
  action = null,
  actionId = null,
  actionLevel = null,
  actionCondition = 'normal',
  onActionAnimationLoad,
  onActionAnimationError,
}) {
  const key = kunciKarakter(species);
  const spriteState = spriteStateForExpression(ekspresi);
  const conditionArtwork = resolvePetArtwork({ speciesKey: key, level, expression: spriteState, levelArt: levelArtwork, speciesArt: gambarKarakter });
  const artwork = conditionArtwork;
  const spriteLayout = spriteSheetLayoutForArtwork(artwork);
  const useSingleStageImage = ['nila', 'gurame'].includes(key)
    && conditionArtwork?.format === 'gif'
    && conditionArtwork.minLevel === conditionArtwork.maxLevel;
  const actionTargetLevel = actionLevel ?? level;
  const actionGif = action ? resolvePetActionAnimation({
    speciesKey: key,
    level: actionTargetLevel,
    action,
    condition: actionCondition,
    animationArt: actionArtwork,
  }) : null;
  const actionImage = actionId != null && actionGif ? actionGif : null;
  const actionImageKey = actionImage ? `${actionId}:${actionImage.src}` : null;
  const [actionImageSource, setActionImageSource] = useState(null);
  const [loadedActionImageKey, setLoadedActionImageKey] = useState(null);
  const currentActionImageSource = actionImageSource?.key === actionImageKey ? actionImageSource.src : null;
  const singleStageActionSource = useSingleStageImage ? currentActionImageSource : null;
  const actionImageLoaded = Boolean(actionImageKey && loadedActionImageKey === actionImageKey);

  useEffect(() => {
    if (!actionImage || !actionGif) return undefined;
    const controller = new AbortController();
    let objectUrl = null;
    let cancelled = false;
    fetch(actionGif.src, { cache: 'force-cache', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Animation request failed: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setActionImageSource({ key: actionImageKey, src: objectUrl });
      })
      .catch((error) => {
        if (!cancelled && error?.name !== 'AbortError') onActionAnimationError?.(actionId);
      });
    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [actionGif, actionId, actionImage, actionImageKey, onActionAnimationError]);

  const hasConditionBackground = artwork?.format === 'gif'
    && artwork.minLevel === artwork.maxLevel
    && CONDITION_BACKGROUND_LEVELS[artwork.speciesKey]?.includes(artwork.minLevel);
  const spriteRow = spriteLayout?.rows[spriteState] ?? spriteLayout?.rows.senang;
  const levelLabel = artwork?.title || `level ${Math.max(1, Math.floor(Number(level) || 1))}`;
  const actionLabel = action === 'feed' ? 'diberi pakan' : 'diajak bermain';
  const label = actionImage
    ? `Karakter ${species}, level ${actionTargetLevel}, animasi saat ${actionLabel}${pesan ? `. ${pesan}` : ''}`
    : artwork?.src
    ? `Karakter ${species}, ${levelLabel}${artwork?.expression ? `, ekspresi ${artwork.expression}` : spriteLayout ? `, ekspresi ${spriteState}` : ''}${pesan ? `. ${pesan}` : ''}`
    : `Karakter ${species} belum ditambahkan${pesan ? `. ${pesan}` : ''}`;

  return (
    <div className="pet-container">
      <div
        className={`pet-panggung pet-karakter-${key}${spriteLayout ? ' pet-panggung-sprite' : ''}${hasConditionBackground ? ' pet-panggung-kondisi' : ''}${useSingleStageImage ? ' pet-panggung-full-scene' : ''} ${className}`}
        style={{ '--pet-tinggi': `${tinggi}px` }}
        role="group"
        aria-label={label}
        aria-busy={Boolean(actionImage && !currentActionImageSource)}
        data-pet-action={actionImage ? action : undefined}
      >
        {artwork?.src ? (
          spriteLayout ? (
            <div
              className="pet-sprite-viewport"
              data-sprite-state={spriteState}
              style={{ aspectRatio: `${spriteLayout.frameWidth} / ${spriteLayout.frameHeight}`, opacity: actionImageLoaded ? 0 : undefined }}
              aria-hidden={actionImageLoaded ? 'true' : undefined}
            >
              <img
                className="pet-sprite-sheet"
                src={artwork.src}
                alt=""
                draggable="false"
                style={{ '--pet-sprite-top': `${-(spriteRow / spriteLayout.frameHeight) * 100}%` }}
              />
            </div>
          ) : (
            <div className="pet-user-art-wrap">
              <img
                className="pet-user-art"
                src={singleStageActionSource || artwork.src}
                alt=""
                draggable="false"
                style={actionImageLoaded && !useSingleStageImage ? { opacity: 0 } : undefined}
                onLoad={singleStageActionSource ? () => {
                  setLoadedActionImageKey(actionImageKey);
                  onActionAnimationLoad?.(actionId, actionGif.durationMs);
                } : undefined}
                onError={singleStageActionSource ? () => onActionAnimationError?.(actionId) : undefined}
              />
            </div>
          )
        ) : !actionImage ? (
          <div className="pet-karakter-kosong" role="status">
            Karakter belum ditambahkan
          </div>
        ) : null}
        {actionImage && currentActionImageSource && !useSingleStageImage && (
          <img
            key={actionImageKey}
            className="pet-action-art"
            src={currentActionImageSource}
            alt=""
            draggable="false"
            onLoad={() => {
              setLoadedActionImageKey(actionImageKey);
              onActionAnimationLoad?.(actionId, actionGif.durationMs);
            }}
            onError={() => onActionAnimationError?.(actionId)}
          />
        )}
      </div>
    </div>
  );
}
