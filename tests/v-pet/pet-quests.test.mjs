import assert from 'node:assert/strict';
import test from 'node:test';

const questModel = await import('../../src/v-pet/model/petQuests.js').catch(() => ({}));
const petProgress = await import('../../src/v-pet/model/petProgress.js');
const dateModel = await import('../../src/shared/model/localDate.js').catch(() => ({}));

test('provides daily routine checklist rows unchecked for an assigned pond', () => {
  assert.equal(typeof questModel.dailyQuestChecklist, 'function');
  const rows = questModel.dailyQuestChecklist([], 'AR-01', '2026-10-13', []);
  assert.deepEqual(rows.map((row) => row.id), ['feed', 'clean', 'heal', 'water-check']);
  assert.ok(rows.every((row) => row.done === false));
});

test('completes each quest once per pond and local date and records every pet recipient', () => {
  assert.equal(typeof questModel.completeDailyQuest, 'function');
  const input = {
    questId: 'clean',
    areaId: 'AR-01',
    date: '2026-10-13',
    sourceEventId: 'ACT-1',
    petIds: ['PET-1', 'PET-2'],
  };
  const first = questModel.completeDailyQuest([], input);
  assert.equal(first.completed, true);
  assert.equal(first.completion.expPerPet, 10);
  assert.equal(first.completion.sourceType, 'activity');
  assert.deepEqual(first.completion.petIds, ['PET-1', 'PET-2']);

  const manual = questModel.completeDailyQuest([], { ...input, sourceType: 'manual-checkbox' });
  assert.equal(manual.completion.sourceType, 'manual-checkbox');

  const duplicate = questModel.completeDailyQuest(first.completions, { ...input, sourceEventId: 'ACT-2' });
  assert.equal(duplicate.completed, false);
  assert.equal(duplicate.completions.length, 1);
});

test('allows the same quest in another pond and on a later local date', () => {
  assert.equal(typeof questModel.completeDailyQuest, 'function');
  const first = questModel.completeDailyQuest([], {
    questId: 'feed', areaId: 'AR-01', date: '2026-10-13', sourceEventId: 'ACT-1', petIds: ['PET-1'],
  });
  const otherPond = questModel.completeDailyQuest(first.completions, {
    questId: 'feed', areaId: 'AR-02', date: '2026-10-13', sourceEventId: 'ACT-2', petIds: ['PET-2'],
  });
  const nextDay = questModel.completeDailyQuest(otherPond.completions, {
    questId: 'feed', areaId: 'AR-01', date: '2026-10-14', sourceEventId: 'ACT-3', petIds: ['PET-1'],
  });
  assert.equal(otherPond.completed, true);
  assert.equal(nextDay.completed, true);
  assert.equal(nextDay.completions.length, 3);
});

test('requires two manual parameters for water check and ignores telemetry', () => {
  assert.equal(typeof questModel.questIdsForActivity, 'function');
  assert.deepEqual(questModel.questIdsForActivity({ activityCode: 'monitoring', parameterCount: 2 }), ['water-check']);
  assert.deepEqual(questModel.questIdsForActivity({ activityCode: 'monitoring', parameterCount: 1 }), []);
  assert.deepEqual(questModel.questIdsForActivity({ activityCode: 'telemetry', parameterCount: 3 }), []);
});

test('only exposes optional mortality and harvest quests when real events exist today', () => {
  assert.equal(typeof questModel.dailyQuestChecklist, 'function');
  const rows = questModel.dailyQuestChecklist([], 'AR-01', '2026-10-13', [
    { areaId: 'AR-01', date: '2026-10-13', activityCode: 'mortality', sourceId: 'MT-1' },
    { areaId: 'AR-01', date: '2026-10-12', activityCode: 'harvest', sourceId: 'HV-old' },
  ]);
  assert.ok(rows.some((row) => row.id === 'mortality'));
  assert.ok(!rows.some((row) => row.id === 'harvest'));
});

test('care updates do not add EXP directly', () => {
  assert.equal(typeof petProgress.applyPetCare, 'function');
  const pet = { hunger: 50, hygiene: 60, health: 70, level: 2, stage: 'Benih', xp: 198, xpNext: 200 };
  const updated = petProgress.applyPetCare(pet, { hygiene: 80, health: 76 });
  assert.equal(updated.hygiene, 80);
  assert.equal(updated.health, 76);
  assert.equal(updated.xp, 198);
  assert.equal(updated.level, 2);
});

test('uses local calendar months for monthly quest reset', () => {
  assert.equal(typeof dateModel.localMonthKey, 'function');
  assert.equal(dateModel.localMonthKey(new Date(2026, 9, 31, 23, 59)), '2026-10');
  assert.equal(dateModel.localMonthKey(new Date(2026, 10, 1, 0, 0)), '2026-11');
});

test('monthly pond cleaning completes once per pond/month without changing daily status', () => {
  assert.equal(typeof questModel.monthlyQuestChecklist, 'function');
  assert.equal(typeof questModel.completeMonthlyQuest, 'function');
  const initialRows = questModel.monthlyQuestChecklist([], 'AR-01', '2026-10');
  assert.equal(initialRows.length, 1);
  assert.equal(initialRows[0].id, 'monthly-pond-cleaning');
  assert.equal(initialRows[0].done, false);
  assert.equal(initialRows[0].exp, 10);

  const first = questModel.completeMonthlyQuest([], {
    areaId: 'AR-01', monthKey: '2026-10', date: '2026-10-13',
    sourceEventId: 'CLEAN-1', petIds: ['PET-1', 'PET-2'],
  });
  assert.equal(first.completed, true);
  assert.equal(first.completion.expPerPet, 10);
  assert.equal(first.completion.period, 'monthly');
  assert.equal(first.completion.sourceType, 'activity');
  assert.deepEqual(first.completion.petIds, ['PET-1', 'PET-2']);

  const repeated = questModel.completeMonthlyQuest(first.completions, {
    areaId: 'AR-01', monthKey: '2026-10', date: '2026-10-30',
    sourceEventId: 'CLEAN-2', petIds: ['PET-1', 'PET-2'],
  });
  const otherPond = questModel.completeMonthlyQuest(repeated.completions, {
    areaId: 'AR-02', monthKey: '2026-10', date: '2026-10-20',
    sourceEventId: 'CLEAN-3', petIds: ['PET-3'],
  });
  const nextMonth = questModel.completeMonthlyQuest(otherPond.completions, {
    areaId: 'AR-01', monthKey: '2026-11', date: '2026-11-01',
    sourceEventId: 'CLEAN-4', petIds: ['PET-1', 'PET-2'],
  });

  assert.equal(repeated.completed, false);
  assert.equal(otherPond.completed, true);
  assert.equal(nextMonth.completed, true);
  assert.equal(questModel.monthlyQuestChecklist(first.completions, 'AR-01', '2026-10')[0].done, true);
  assert.equal(questModel.monthlyQuestChecklist(first.completions, 'AR-01', '2026-11')[0].done, false);
  assert.ok(questModel.dailyQuestChecklist(first.completions, 'AR-01', '2026-10-13', [])
    .every((quest) => quest.done === false));
});

test('calculates time until the next local midnight', () => {
  assert.equal(typeof dateModel.millisecondsUntilNextLocalMidnight, 'function');
  const beforeMidnight = new Date(2026, 9, 14, 23, 59, 59, 500);
  const midday = new Date(2026, 9, 14, 12, 0, 0, 0);
  const tomorrowMidnight = new Date(2026, 9, 15, 0, 0, 0, 0);
  assert.equal(dateModel.millisecondsUntilNextLocalMidnight(beforeMidnight), 500);
  assert.equal(
    dateModel.millisecondsUntilNextLocalMidnight(midday),
    tomorrowMidnight.getTime() - midday.getTime(),
  );
});

test('daily checklist resets by local date without deleting the previous completion', () => {
  const yesterday = questModel.completeDailyQuest([], {
    questId: 'feed', areaId: 'AR-01', date: '2026-10-14', sourceEventId: 'FEED-14', petIds: ['PET-1'],
  });
  const yesterdayRows = questModel.dailyQuestChecklist(yesterday.completions, 'AR-01', '2026-10-14', []);
  const todayRows = questModel.dailyQuestChecklist(yesterday.completions, 'AR-01', '2026-10-15', []);
  assert.equal(yesterdayRows.find((quest) => quest.id === 'feed').done, true);
  assert.equal(todayRows.find((quest) => quest.id === 'feed').done, false);
  assert.equal(yesterday.completions.length, 1);
});
