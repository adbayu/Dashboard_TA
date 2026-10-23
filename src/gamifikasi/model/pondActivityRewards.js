export const POINT_ACTIVITY_RULES = Object.freeze({
  monitoring: 'R-2',
  feed: 'R-4',
  clean: 'R-4',
  heal: 'R-4',
  harvest: 'R-6',
  mortality: 'R-7',
});

export const MORTALITY_POINT_RULE = Object.freeze({
  id: 'R-7',
  activity: 'Catat kematian ikan',
  points: 5,
  daily: 1,
  active: true,
});

export function pointRuleIdForActivity(activityCode) {
  return POINT_ACTIVITY_RULES[activityCode] || null;
}

export function ensureMortalityPointRule(pointRules = []) {
  const rules = Array.isArray(pointRules) ? pointRules : [];
  return rules.some((rule) => rule.id === MORTALITY_POINT_RULE.id)
    ? rules
    : [...rules, { ...MORTALITY_POINT_RULE }];
}

export function evaluateActivityReward({ pointRules = [], events = [], userId, activityCode, date, sourceId } = {}) {
  const ruleId = pointRuleIdForActivity(activityCode);
  const priorEvents = Array.isArray(events) ? events : [];
  const duplicate = Boolean(userId && sourceId && priorEvents.some(
    (event) => event.userId === userId && event.activityCode === activityCode && event.sourceId === sourceId,
  ));
  if (duplicate) return { points: 0, ruleId, duplicate: true, capped: false, inactive: false };
  if (!ruleId || !userId || !date) return { points: 0, ruleId, duplicate: false, capped: false, inactive: false };

  const rule = (Array.isArray(pointRules) ? pointRules : []).find((item) => item.id === ruleId);
  if (!rule || !rule.active) return { points: 0, ruleId, duplicate: false, capped: false, inactive: true };

  const dailyCap = Math.max(0, Math.floor(Number(rule.daily) || 0));
  const usedToday = priorEvents.filter((event) =>
    event.userId === userId
    && event.date === date
    && event.ruleId === ruleId
    && Number(event.pointsAwarded) > 0,
  ).length;
  if (usedToday >= dailyCap) return { points: 0, ruleId, duplicate: false, capped: true, inactive: false };

  const points = Math.max(0, Number(rule.points) || 0);
  return { points, ruleId, duplicate: false, capped: false, inactive: false };
}

export function recordActivityEvent(events = [], event) {
  const existing = Array.isArray(events) ? events : [];
  const duplicate = Boolean(event?.userId && event?.activityCode && event?.sourceId && existing.some(
    (row) => row.userId === event.userId
      && row.activityCode === event.activityCode
      && row.sourceId === event.sourceId,
  ));
  if (duplicate) return { events: existing, duplicate: true };
  return { events: [{ ...event }, ...existing], duplicate: false };
}

function missionMatchesEvent(mission, event) {
  if (mission.activityCode === 'water-check') {
    return event.activityCode === 'monitoring' && Number(event.parameterCount) >= 2;
  }
  if (mission.activityCode === 'feed') return event.activityCode === 'feed';
  if (mission.activityCode === 'care') return event.activityCode === 'clean' || event.activityCode === 'heal';
  if (mission.activityCode === 'mortality') return event.activityCode === 'mortality';
  if (mission.activityCode === 'harvest') return event.activityCode === 'harvest';
  return false;
}

export function deriveDailyMissions(missions = [], events = [], userId, date) {
  return (Array.isArray(missions) ? missions : []).map((mission) => ({
    ...mission,
    done: Boolean(userId && date && (Array.isArray(events) ? events : []).some((event) =>
      event.userId === userId && event.date === date && missionMatchesEvent(mission, event),
    )),
  }));
}
