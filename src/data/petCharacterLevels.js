const LEVEL_ART_PATTERN = /(?:^|\/)karakter-level\/([a-z0-9-]+)\/level-(\d+)(?:-(\d+))?(?:__([a-z0-9-]+))?\.(png|gif)$/i;
const EXPRESSION_ART_STATES = new Set(['senang', 'sedih', 'kepanasan', 'kedinginan']);
// The current Nila level-1 GIFs have 24 frames each, but every frame is pixel-identical.
const STATIC_GIF_ASSETS = new Set(['nila/level-1__senang.gif', 'nila/level-1__sedih.gif']);

const NILA_SPRITE_SHEET_LAYOUT = Object.freeze({
  sourceWidth: 1254,
  sourceHeight: 1254,
  frameWidth: 313.5,
  frameHeight: 205,
  frameCount: 4,
  rows: Object.freeze({ senang: 233, sedih: 492, kepanasan: 751, kedinginan: 1014 }),
});
const NILA_SPRITE_SHEET_LEVELS = Object.freeze([1, 2, 3, 4]);

const titleFromSlug = (slug) => slug
  ? slug.split('-').filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
  : null;

export function spriteSheetLayoutForArtwork(artwork) {
  const level = artwork?.minLevel;
  if (
    artwork?.speciesKey === 'nila'
    && artwork.format === 'png'
    && level === artwork.maxLevel
    && NILA_SPRITE_SHEET_LEVELS.includes(level)
    && artwork.title?.toLowerCase() === `nila level ${level}`
  ) return NILA_SPRITE_SHEET_LAYOUT;
  return null;
}

export function spriteStateForExpression(expression = 'senang') {
  const state = String(expression || '').toLowerCase();
  if (state === 'kepanasan' || state === 'kedinginan') return state;
  if (state === 'senang' || state === 'mengantuk') return 'senang';
  return 'sedih';
}

export function parseLevelArtworkPath(path, src) {
  const match = String(path).replaceAll('\\', '/').match(LEVEL_ART_PATTERN);
  if (!match) return null;

  const minLevel = Number(match[2]);
  const maxLevel = Number(match[3] || match[2]);
  if (minLevel < 1 || maxLevel < minLevel) return null;
  const format = match[5].toLowerCase();
  const slug = String(match[4] || '').toLowerCase();
  const expression = format === 'gif' && EXPRESSION_ART_STATES.has(slug) ? slug : null;
  const assetKey = `${match[1].toLowerCase()}/level-${minLevel}${match[3] ? `-${maxLevel}` : ''}${match[4] ? `__${slug}` : ''}.${format}`;
  const animated = format === 'gif' && !STATIC_GIF_ASSETS.has(assetKey);

  return {
    speciesKey: match[1].toLowerCase(),
    minLevel,
    maxLevel,
    title: expression ? null : titleFromSlug(match[4]),
    src,
    format,
    expression,
    animated,
  };
}

export function resolvePetArtwork({ speciesKey = '', level = 1, expression = null, levelArt = [], speciesArt = {} } = {}) {
  const key = String(speciesKey).toLowerCase().trim();
  const value = Number(level);
  const currentLevel = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
  const compareArtwork = (left, right) =>
      (left.maxLevel - left.minLevel) - (right.maxLevel - right.minLevel)
      || right.minLevel - left.minLevel
      || String(left.src).localeCompare(String(right.src));
  const matching = levelArt.filter((art) =>
    art.speciesKey === key && currentLevel >= art.minLevel && currentLevel <= art.maxLevel,
  );
  const expressionSpecific = expression
    ? matching.filter((art) => art.expression === expression).sort(compareArtwork)[0]
    : null;
  const generic = matching.filter((art) => !art.expression).sort(compareArtwork)[0];
  const specific = expressionSpecific || generic;

  if (specific) return { ...specific, isLevelSpecific: true };
  if (!speciesArt[key]) return null;
  return { speciesKey: key, title: null, src: speciesArt[key], format: 'png', expression: null, animated: false, isLevelSpecific: false };
}
