export const localDateKey = (date = new Date()) =>
  new Date(date).toLocaleDateString('en-CA');

export const localMonthKey = (date = new Date()) => localDateKey(date).slice(0, 7);

export const millisecondsUntilNextLocalMidnight = (date = new Date()) => {
  const current = new Date(date);
  if (!Number.isFinite(current.getTime())) return 0;
  const nextMidnight = new Date(current);
  nextMidnight.setHours(24, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - current.getTime());
};
