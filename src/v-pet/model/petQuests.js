export const PET_DAILY_QUESTS = Object.freeze([
  { id: 'feed', title: 'Beri pakan', activityCode: 'feed', exp: 10, kind: 'daily' },
  { id: 'clean', title: 'Bersihkan', activityCode: 'clean', exp: 10, kind: 'daily' },
  { id: 'heal', title: 'Rawat', activityCode: 'heal', exp: 10, kind: 'daily' },
  { id: 'water-check', title: 'Cek kualitas air', activityCode: 'monitoring', exp: 10, kind: 'daily' },
]);

const EVENT_QUESTS = Object.freeze([
  { id: 'mortality', title: 'Catat kematian ikan', activityCode: 'mortality', exp: 10, kind: 'event' },
  { id: 'harvest', title: 'Catat panen', activityCode: 'harvest', exp: 10, kind: 'event' },
]);

const DAILY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateKey = (value) => DAILY_DATE_RE.test(String(value || ''));

export function questIdsForActivity(activity = {}) {
  const { activityCode } = activity;
  if (activityCode === 'feed' || activityCode === 'clean' || activityCode === 'heal') return [activityCode];

  if (activityCode === 'monitoring') {
    const measurements = activity.measurements && typeof activity.measurements === 'object'
      ? Object.values(activity.measurements).filter((value) => value != null && Number.isFinite(Number(value))).length
      : 0;
    const parameterCount = Number.isFinite(Number(activity.parameterCount))
      ? Number(activity.parameterCount)
      : measurements;
    return activity.manual !== false && parameterCount >= 2 ? ['water-check'] : [];
  }

  if (activityCode === 'mortality') return activity.sourceId ? ['mortality'] : [];
  if (activityCode === 'harvest') {
    if (activity.today && activity.date !== activity.today) return [];
    return activity.sourceId ? ['harvest'] : [];
  }

  // Telemetry and any unrecognized event are never quest triggers.
  return [];
}

export function dailyQuestChecklist(completions = [], areaId, date, activityEvents = []) {
  if (!areaId || !isDateKey(date)) return [];
  const doneById = new Map(
    (Array.isArray(completions) ? completions : [])
      .filter((item) => item?.areaId === areaId && item?.date === date)
      .map((item) => [item.questId, item]),
  );
  const eventQuestIds = new Set();
  for (const event of Array.isArray(activityEvents) ? activityEvents : []) {
    if (event?.areaId !== areaId || event?.date !== date) continue;
    for (const id of questIdsForActivity(event)) eventQuestIds.add(id);
  }

  return [
    ...PET_DAILY_QUESTS,
    ...EVENT_QUESTS.filter((quest) => eventQuestIds.has(quest.id)),
  ].map((quest) => ({
    ...quest,
    done: doneById.has(quest.id),
    completion: doneById.get(quest.id) || null,
  }));
}

export function completeDailyQuest(completions = [], { questId, areaId, date, sourceEventId, petIds = [], sourceType = 'activity' } = {}) {
  const existing = (Array.isArray(completions) ? completions : []).find(
    (item) => item.questId === questId && item.areaId === areaId && item.date === date,
  );
  if (existing) return { completions, completed: false, completion: existing };

  const definition = [...PET_DAILY_QUESTS, ...EVENT_QUESTS].find((quest) => quest.id === questId);
  const recipients = [...new Set((Array.isArray(petIds) ? petIds : []).filter(Boolean))];
  if (!definition || !areaId || !isDateKey(date) || !sourceEventId || recipients.length === 0) {
    return { completions, completed: false, completion: null };
  }

  const completion = {
    id: `${questId}|${areaId}|${date}`,
    questId,
    areaId,
    date,
    sourceEventId,
    sourceType,
    petIds: recipients,
    expPerPet: definition.exp,
  };
  return { completions: [completion, ...completions], completed: true, completion };
}

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;
const isMonthKey = (value) => MONTH_KEY_RE.test(String(value || ''));

export const MONTHLY_POND_QUEST = Object.freeze({
  id: 'monthly-pond-cleaning',
  title: 'Pembersihan area kolam ikan',
  activityCode: 'pond-cleaning',
  exp: 10,
  period: 'monthly',
});

export function monthlyQuestChecklist(completions = [], areaId, monthKey) {
  if (!areaId || !isMonthKey(monthKey)) return [];
  const completion = (Array.isArray(completions) ? completions : []).find(
    (item) => item.questId === MONTHLY_POND_QUEST.id
      && item.areaId === areaId
      && item.monthKey === monthKey
      && item.period === 'monthly',
  ) || null;
  return [{
    ...MONTHLY_POND_QUEST,
    monthKey,
    done: Boolean(completion),
    completion,
  }];
}

export function completeMonthlyQuest(completions = [], { areaId, monthKey, date, sourceEventId, petIds = [], sourceType = 'activity' } = {}) {
  const records = Array.isArray(completions) ? completions : [];
  const existing = records.find((item) =>
    item.questId === MONTHLY_POND_QUEST.id
      && item.areaId === areaId
      && item.monthKey === monthKey
      && item.period === 'monthly',
  );
  if (existing) return { completions: records, completed: false, completion: existing };

  const recipients = [...new Set((Array.isArray(petIds) ? petIds : []).filter(Boolean))];
  if (!areaId || !isMonthKey(monthKey) || !isDateKey(date) || date.slice(0, 7) !== monthKey || !sourceEventId || recipients.length === 0) {
    return { completions: records, completed: false, completion: null };
  }

  const completion = {
    id: `${MONTHLY_POND_QUEST.id}|${areaId}|${monthKey}`,
    questId: MONTHLY_POND_QUEST.id,
    areaId,
    date,
    monthKey,
    period: 'monthly',
    sourceEventId,
    sourceType,
    petIds: recipients,
    expPerPet: MONTHLY_POND_QUEST.exp,
  };
  return { completions: [completion, ...records], completed: true, completion };
}
