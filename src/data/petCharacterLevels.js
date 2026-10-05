const LEVEL_ART_PATTERN = /(?:^|\/)karakter-level\/([a-z0-9-]+)\/level-(\d+)(?:-(\d+))?(?:__([a-z0-9-]+))?\.png$/i;

const titleFromSlug = (slug) => slug
  ? slug.split('-').filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
  : null;

export function parseLevelArtworkPath(path, src) {
  const match = String(path).replaceAll('\\', '/').match(LEVEL_ART_PATTERN);
  if (!match) return null;

  const minLevel = Number(match[2]);
  const maxLevel = Number(match[3] || match[2]);
  if (minLevel < 1 || maxLevel < minLevel) return null;

  return {
    speciesKey: match[1].toLowerCase(),
    minLevel,
    maxLevel,
    title: titleFromSlug(match[4]),
    src,
  };
}

export function resolvePetArtwork({ speciesKey = '', level = 1, levelArt = [], speciesArt = {} } = {}) {
  const key = String(speciesKey).toLowerCase().trim();
  const value = Number(level);
  const currentLevel = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
  const specific = levelArt
    .filter((art) => art.speciesKey === key && currentLevel >= art.minLevel && currentLevel <= art.maxLevel)
    .sort((left, right) =>
      (left.maxLevel - left.minLevel) - (right.maxLevel - right.minLevel)
      || right.minLevel - left.minLevel
      || String(left.src).localeCompare(String(right.src)),
    )[0];

  if (specific) return { ...specific, isLevelSpecific: true };
  if (!speciesArt[key]) return null;
  return { speciesKey: key, title: null, src: speciesArt[key], isLevelSpecific: false };
}
