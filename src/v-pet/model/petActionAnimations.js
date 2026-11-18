export const PET_ACTION_ANIMATION_DURATION_MS = Object.freeze({ feed: 5000, play: 4000 });
const ACTION_SPECS = Object.freeze({
  feed: Object.freeze({ slug: 'beri-pakan', durationMs: PET_ACTION_ANIMATION_DURATION_MS.feed }),
  play: Object.freeze({ slug: 'main', durationMs: PET_ACTION_ANIMATION_DURATION_MS.play }),
});
const ACTION_GIF_PATTERN = /(?:^|\/)aksi\/(nila|gurame)\/\1-L(\d+)-(beri-pakan|main)(?:__(senang|sedih|kedinginan|kepanasan))?\.gif$/i;
const ACTION_SPECIES = new Set(['nila', 'gurame']);
const ACTION_CONDITIONS = new Set(['senang', 'sedih', 'kedinginan', 'kepanasan']);
const MIN_LEVEL = 1;
const MAX_LEVEL = 4;

function normalizedLevel(level) {
  const value = Number(level);
  return Number.isFinite(value) ? Math.max(MIN_LEVEL, Math.floor(value)) : MIN_LEVEL;
}

function validLevel(level) {
  return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
}

export function parsePetActionAnimationPath(path, src) {
  const match = String(path).replaceAll('\\', '/').match(ACTION_GIF_PATTERN);
  if (!match) return null;
  const speciesKey = match[1].toLowerCase();
  const level = Number(match[2]);
  if (!validLevel(level)) return null;
  const slug = match[3].toLowerCase();
  const action = slug === ACTION_SPECS.play.slug ? 'play' : 'feed';
  const condition = match[4]?.toLowerCase() || 'normal';
  return {
    speciesKey,
    level,
    action,
    condition,
    src,
    durationMs: ACTION_SPECS[action].durationMs,
    format: 'gif',
    animated: true,
  };
}

export function isPetActionAnimationSupported({ speciesKey = '', level, action } = {}) {
  return ACTION_SPECIES.has(String(speciesKey).toLowerCase().trim())
    && validLevel(normalizedLevel(level))
    && Object.hasOwn(ACTION_SPECS, action);
}

export function resolvePetActionAnimation({ speciesKey = '', level, action, condition = 'normal', animationArt = [] } = {}) {
  if (!isPetActionAnimationSupported({ speciesKey, level, action })) return null;
  const requestedSpecies = String(speciesKey).toLowerCase().trim();
  const requestedLevel = normalizedLevel(level);
  const requestedCondition = ACTION_SPECIES.has(requestedSpecies)
    && ACTION_CONDITIONS.has(String(condition).toLowerCase())
    ? String(condition).toLowerCase()
    : 'normal';
  const matchingAction = animationArt.filter((art) => art
    && art.speciesKey === requestedSpecies && art.level === requestedLevel && art.action === action);
  return matchingAction.find((art) => art.condition === requestedCondition)
    || matchingAction.find((art) => art.condition === 'normal')
    || null;
}
