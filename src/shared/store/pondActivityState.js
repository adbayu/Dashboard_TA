import { applyPetExperience } from '../../v-pet/model/petProgress.js';
import { completeDailyQuest, completeMonthlyQuest, MONTHLY_POND_QUEST, questIdsForActivity } from '../../v-pet/model/petQuests.js';
import { ensureMortalityPointRule, evaluateActivityReward, recordActivityEvent } from '../../gamifikasi/model/pondActivityRewards.js';
import { localDateKey, localMonthKey } from '../model/localDate.js';

const LABELS = {
  monitoring: 'Catat pemantauan kolam',
  feed: 'Beri pakan virtual pet',
  clean: 'Bersihkan virtual pet',
  heal: 'Rawat virtual pet',
  mortality: 'Catat kematian ikan',
  harvest: 'Panen tercatat',
  'pond-cleaning': 'Pembersihan area kolam ikan',
};

const QUEST_LABELS = {
  feed: 'Beri pakan',
  clean: 'Bersihkan',
  heal: 'Rawat',
  'water-check': 'Cek kualitas air',
  mortality: 'Catat kematian ikan',
  harvest: 'Catat panen',
  'monthly-pond-cleaning': 'Pembersihan area kolam ikan',
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isDateKey = (value) => DATE_KEY.test(String(value || ''));
const LEGACY_MONTHS = new Map([
  ['jan', 0], ['januari', 0], ['feb', 1], ['februari', 1], ['mar', 2], ['maret', 2],
  ['apr', 3], ['april', 3], ['mei', 4], ['jun', 5], ['juni', 5], ['jul', 6], ['juli', 6],
  ['agu', 7], ['agt', 7], ['agustus', 7], ['sep', 8], ['september', 8], ['okt', 9],
  ['oktober', 9], ['nov', 10], ['november', 10], ['des', 11], ['desember', 11],
]);

function legacyLocalDateKey(value) {
  const source = String(value || '').trim();
  if (isDateKey(source)) return source;
  const isoDate = source.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const localized = source.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})(?:\s+(\d{1,2})[.:](\d{2}))?$/);
  if (localized) {
    const [, dayText, monthText, yearText, hourText = '0', minuteText = '0'] = localized;
    const month = LEGACY_MONTHS.get(monthText.toLocaleLowerCase('id-ID'));
    if (month == null) return null;
    const day = Number(dayText);
    const year = Number(yearText);
    const date = new Date(year, month, day, Number(hourText), Number(minuteText));
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return localDateKey(date);
  }

  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

function backfillLegacyMonitoringEvents(parsed, today, events) {
  const users = Array.isArray(parsed.users) ? parsed.users : [];
  const areas = Array.isArray(parsed.areas) ? parsed.areas : [];
  const records = Array.isArray(parsed.monitoring) ? parsed.monitoring : [];
  return records.flatMap((record) => {
    if (!record?.id || !record.areaId || legacyLocalDateKey(record.date || record.tanggal || record.at) !== today) return [];
    const measurements = Object.fromEntries(
      ['ph', 'temp', 'tds']
        .filter((key) => record[key] != null && record[key] !== '' && Number.isFinite(Number(record[key])))
        .map((key) => [key, Number(record[key])]),
    );
    const parameterCount = Object.keys(measurements).length;
    if (parameterCount < 2) return [];

    let user = null;
    if (record.userId) {
      user = users.find((item) => item.id === record.userId) || null;
    } else if (record.by) {
      const normalizedName = String(record.by).trim().toLocaleLowerCase('id-ID');
      const matches = users.filter((item) => String(item.name || '').trim().toLocaleLowerCase('id-ID') === normalizedName);
      if (matches.length === 1) [user] = matches;
    }
    const area = areas.find((item) => item.id === record.areaId);
    if (!user || !area || area.type !== 'kolam' || !bolehAkses(user, area.id)) return [];
    if (events.some((event) => event?.userId === user.id && event.activityCode === 'monitoring' && event.sourceId === record.id)) return [];

    return [{
      id: `${user.id}|legacy-monitoring|${record.id}`,
      userId: user.id,
      areaId: area.id,
      activityCode: 'monitoring',
      sourceId: record.id,
      date: today,
      monthKey: today.slice(0, 7),
      at: record.at || '',
      parameterCount,
      measurements,
      manual: true,
      pointsAwarded: 0,
      legacy: true,
    }];
  });
}

export function migrateGamificationState(parsed = {}, { pointRules: seedPointRules = [], missions: seedMissions = [], version = 1, today = localDateKey() } = {}) {
  const migrationVersion = Math.max(1, Math.floor(Number(version) || 1));
  const storedPointRules = Array.isArray(parsed.pointRules) ? parsed.pointRules : seedPointRules;
  const currentVersion = Number(parsed.gamificationStateVersion) || 0;
  const activityEvents = Array.isArray(parsed.pondActivityEvents) ? parsed.pondActivityEvents : [];
  const legacyEvents = currentVersion < migrationVersion
    ? backfillLegacyMonitoringEvents(parsed, today, activityEvents)
    : [];
  return {
    pointRules: currentVersion < migrationVersion ? ensureMortalityPointRule(storedPointRules) : storedPointRules,
    gamificationStateVersion: migrationVersion,
    pondActivityEvents: [...legacyEvents, ...activityEvents],
    petQuestCompletions: Array.isArray(parsed.petQuestCompletions) ? parsed.petQuestCompletions : [],
    missions: seedMissions,
  };
}

function bolehAkses(user, areaId) {
  return user?.role === 'pengelola' || Boolean(user?.areaIds?.includes(areaId));
}

function noChange(state, reason = 'invalid') {
  return {
    state,
    pointsAwarded: 0,
    xpAwarded: 0,
    completedQuestIds: [],
    alreadyCompletedQuestIds: [],
    duplicate: false,
    capped: false,
    reason,
  };
}

export function applyPetQuestClaim(state, input = {}) {
  const userId = input.userId || state?.sessionUserId;
  const user = state?.users?.find((item) => item.id === userId);
  const area = state?.areas?.find((item) => item.id === input.areaId);
  const date = input.date;
  const today = input.today || date;
  if (!user || !area || area.type !== 'kolam' || !bolehAkses(user, area.id)) {
    return { ...noChange(state, 'inaccessible'), completed: false, completion: null };
  }
  if (!isDateKey(date) || !input.sourceEventId) {
    return { ...noChange(state, 'invalid'), completed: false, completion: null };
  }
  if (date !== today) {
    return { ...noChange(state, 'not-current-period'), completed: false, completion: null };
  }

  const period = input.period;
  const questId = input.questId;
  if ((period !== 'daily' && period !== 'monthly')
    || (period === 'monthly' && questId !== MONTHLY_POND_QUEST.id)
    || (period === 'daily' && questId === MONTHLY_POND_QUEST.id)) {
    return { ...noChange(state, 'invalid'), completed: false, completion: null };
  }

  const pets = Array.isArray(state.pets) ? state.pets : [];
  const petIds = pets.filter((pet) => pet.appliedToAreaId === area.id && pet.expMode !== 'iot-daily').map((pet) => pet.id);
  if (petIds.length === 0) return { ...noChange(state, 'no-pets'), completed: false, completion: null };

  const completions = Array.isArray(state.petQuestCompletions) ? state.petQuestCompletions : [];
  const claim = period === 'monthly'
    ? completeMonthlyQuest(completions, {
      areaId: area.id,
      monthKey: input.monthKey || localMonthKey(date),
      date,
      sourceEventId: input.sourceEventId,
      petIds,
      sourceType: 'manual-checkbox',
    })
    : completeDailyQuest(completions, {
      questId,
      areaId: area.id,
      date,
      sourceEventId: input.sourceEventId,
      petIds,
      sourceType: 'manual-checkbox',
    });
  if (!claim.completed) {
    return {
      ...noChange(state, claim.completion ? 'already-completed' : 'invalid'),
      completed: false,
      completion: claim.completion,
    };
  }

  const awardedPetIds = new Set(claim.completion.petIds);
  const petsWithExp = pets.map((pet) => {
    if (!awardedPetIds.has(pet.id)) return pet;
    return {
      ...applyPetExperience(pet, claim.completion.expPerPet),
      log: [{
        id: `Q-${claim.completion.id}-${pet.id}`,
        at: input.at || '',
        text: `Quest ${QUEST_LABELS[questId] || questId} diklaim dari checklist di ${area.name}.`,
        delta: `+${claim.completion.expPerPet} EXP (klaim quest)`,
      }, ...(Array.isArray(pet.log) ? pet.log : [])].slice(0, 20),
    };
  });
  const selectedPet = petsWithExp.find((pet) => pet.id === state.selectedPetId) || petsWithExp[0] || null;
  const nextState = {
    ...state,
    petQuestCompletions: claim.completions,
    pets: petsWithExp,
    pet: selectedPet,
  };

  return {
    state: nextState,
    completed: true,
    reason: null,
    completion: claim.completion,
    period,
    questId,
    xpAwarded: claim.completion.expPerPet * claim.completion.petIds.length,
    pointsAwarded: 0,
  };
}

export function applyPondActivity(state, input = {}) {
  const userId = input.userId || state?.sessionUserId;
  const user = state?.users?.find((item) => item.id === userId);
  const area = state?.areas?.find((item) => item.id === input.areaId);
  const date = input.date;
  const today = input.today || date;
  const sourceId = input.sourceId;

  if (!user || !area || area.type !== 'kolam' || !bolehAkses(user, area.id)) return noChange(state, 'inaccessible');
  if (!isDateKey(date) || !sourceId || !input.activityCode) return noChange(state, 'invalid');

  const monthKey = input.monthKey || localMonthKey(date);
  const pointRules = Array.isArray(state.pointRules) ? state.pointRules : [];
  const events = Array.isArray(state.pondActivityEvents) ? state.pondActivityEvents : [];
  const baseEvent = {
    id: [userId, input.id || `${input.activityCode}|${sourceId}`].join('|'),
    userId,
    areaId: area.id,
    activityCode: input.activityCode,
    sourceId,
    date,
    monthKey,
    note: input.note || '',
    at: input.at || '',
    parameterCount: input.parameterCount,
    measurements: input.measurements,
    manual: input.manual,
  };
  const existing = events.some((event) =>
    event.userId === userId
      && event.activityCode === input.activityCode
      && event.sourceId === sourceId,
  );
  if (existing) return { ...noChange(state, 'duplicate'), duplicate: true };

  const todayEvent = date === today;
  const reward = todayEvent
    ? evaluateActivityReward({
      pointRules,
      events,
      userId,
      activityCode: input.activityCode,
      date,
      sourceId,
    })
    : { points: 0, ruleId: null, duplicate: false, capped: false, inactive: false };
  const event = {
    ...baseEvent,
    ruleId: reward.ruleId,
    pointsAwarded: reward.points,
  };
  const recorded = recordActivityEvent(events, event);
  if (recorded.duplicate) return { ...noChange(state, 'duplicate'), duplicate: true };

  let pets = Array.isArray(state.pets) ? state.pets : [];
  let completions = Array.isArray(state.petQuestCompletions) ? state.petQuestCompletions : [];
  const petRecipients = pets
    .filter((pet) => pet.appliedToAreaId === area.id && pet.expMode !== 'iot-daily')
    .map((pet) => pet.id);
  const completedQuestIds = [];
  const alreadyCompletedQuestIds = [];
  const completedMonthlyQuestIds = [];
  const alreadyCompletedMonthlyQuestIds = [];
  let xpAwarded = 0;

  const questIds = todayEvent ? questIdsForActivity({ ...event, today }) : [];
  for (const questId of questIds) {
    const quest = completeDailyQuest(completions, {
      questId,
      areaId: area.id,
      date,
      sourceEventId: event.id,
      petIds: petRecipients,
    });
    if (!quest.completed) {
      if (quest.completion) alreadyCompletedQuestIds.push(questId);
      continue;
    }

    completions = quest.completions;
    completedQuestIds.push(questId);
    const awardedPetIds = new Set(quest.completion.petIds);
    pets = pets.map((pet) => {
      if (!awardedPetIds.has(pet.id)) return pet;
      xpAwarded += quest.completion.expPerPet;
      return {
        ...applyPetExperience(pet, quest.completion.expPerPet),
        log: [{
          id: `Q-${quest.completion.id}-${pet.id}`,
          at: event.at,
          text: `Quest ${QUEST_LABELS[questId] || questId} selesai di ${area.name}.`,
          delta: `+${quest.completion.expPerPet} EXP (quest)`,
        }, ...(pet.log || [])].slice(0, 20),
      };
    });
  }

  if (input.activityCode === MONTHLY_POND_QUEST.activityCode && todayEvent) {
    const monthlyQuest = completeMonthlyQuest(completions, {
      areaId: area.id,
      monthKey,
      date,
      sourceEventId: event.id,
      petIds: petRecipients,
    });
    if (monthlyQuest.completed) {
      completions = monthlyQuest.completions;
      completedMonthlyQuestIds.push(MONTHLY_POND_QUEST.id);
      const awardedPetIds = new Set(monthlyQuest.completion.petIds);
      pets = pets.map((pet) => {
        if (!awardedPetIds.has(pet.id)) return pet;
        xpAwarded += monthlyQuest.completion.expPerPet;
        return {
          ...applyPetExperience(pet, monthlyQuest.completion.expPerPet),
          log: [{
            id: `Q-${monthlyQuest.completion.id}-${pet.id}`,
            at: event.at,
            text: `Quest ${MONTHLY_POND_QUEST.title} selesai di ${area.name}.`,
            delta: `+${monthlyQuest.completion.expPerPet} EXP (quest bulanan)`,
          }, ...(pet.log || [])].slice(0, 20),
        };
      });
    } else if (monthlyQuest.completion) {
      alreadyCompletedMonthlyQuestIds.push(MONTHLY_POND_QUEST.id);
    }
  }

  const outcomeEvent = {
    ...event,
    completedQuestIds,
    alreadyCompletedQuestIds,
    completedMonthlyQuestIds,
    alreadyCompletedMonthlyQuestIds,
    xpAwarded,
  };
  const activityEvents = recorded.events.map((item) => item.id === event.id ? outcomeEvent : item);
  const users = reward.points > 0
    ? state.users.map((item) => item.id === userId ? { ...item, points: (Number(item.points) || 0) + reward.points } : item)
    : state.users;
  const ledger = reward.points > 0
    ? [{ id: `L-${event.id}`, at: event.at, activity: LABELS[input.activityCode] || input.activityCode, points: reward.points }, ...(state.ledger || [])].slice(0, 60)
    : (state.ledger || []);
  const pet = pets.find((item) => item.id === state.selectedPetId) || pets[0] || null;

  return {
    state: {
      ...state,
      pointRules,
      pondActivityEvents: activityEvents,
      petQuestCompletions: completions,
      pets,
      pet,
      users,
      ledger,
    },
    pointsAwarded: reward.points,
    xpAwarded,
    completedQuestIds,
    alreadyCompletedQuestIds,
    completedMonthlyQuestIds,
    alreadyCompletedMonthlyQuestIds,
    duplicate: false,
    capped: reward.capped,
    reason: null,
  };
}
