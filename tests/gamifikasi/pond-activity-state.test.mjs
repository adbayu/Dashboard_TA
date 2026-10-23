import assert from 'node:assert/strict';
import test from 'node:test';

const transition = await import('../../src/shared/store/pondActivityState.js').catch(() => ({}));

const makeState = (overrides = {}) => {
  const pets = [
    { id: 'PET-1', species: 'Ikan Nila', appliedToAreaId: 'AR-01', ownerUserId: null, level: 1, stage: 'Benih', xp: 0, xpNext: 200, log: [] },
    { id: 'PET-2', species: 'Ikan Gurame', appliedToAreaId: 'AR-01', ownerUserId: 'U-1', level: 1, stage: 'Benih', xp: 0, xpNext: 200, log: [] },
    { id: 'PET-4', species: 'Ikan Gurame', appliedToAreaId: 'AR-01', ownerUserId: 'U-2', level: 1, stage: 'Benih', xp: 0, xpNext: 200, log: [] },
    { id: 'PET-3', species: 'Ikan Gurame', appliedToAreaId: 'AR-02', ownerUserId: null, level: 1, stage: 'Benih', xp: 0, xpNext: 200, log: [] },
  ];
  return {
    sessionUserId: 'U-1',
    users: [{ id: 'U-1', role: 'pengguna', areaIds: ['AR-01'], points: 0 }],
    areas: [
      { id: 'AR-01', type: 'kolam' },
      { id: 'AR-02', type: 'kolam' },
      { id: 'GB-01', type: 'growbed' },
    ],
    pointRules: [
      { id: 'R-2', points: 15, daily: 4, active: true },
      { id: 'R-4', points: 10, daily: 3, active: true },
      { id: 'R-6', points: 100, daily: 1, active: true },
      { id: 'R-7', points: 5, daily: 1, active: true },
    ],
    pets,
    selectedPetId: 'PET-1',
    pet: pets[0],
    pondActivityEvents: [],
    petQuestCompletions: [],
    ledger: [],
    ...overrides,
  };
};

const apply = (state, event) => {
  assert.equal(typeof transition.applyPondActivity, 'function');
  return transition.applyPondActivity(state, event);
};

test('records one care event, awards points, and completes the pond quest for all pets assigned to the pond', () => {
  const result = apply(makeState(), {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'clean', sourceId: 'ACT-1',
    date: '2026-10-13', today: '2026-10-13', at: '13 Okt 2026 10.00',
  });
  assert.equal(result.pointsAwarded, 10);
  assert.equal(result.xpAwarded, 30);
  assert.deepEqual(result.completedQuestIds, ['clean']);
  assert.equal(result.state.users[0].points, 10);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-2').xp, 10);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-4').xp, 10);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-3').xp, 0);
  assert.equal(result.state.pondActivityEvents.length, 1);
  assert.equal(result.state.petQuestCompletions.length, 1);
});

test('sensor-only Kangkung receives no EXP from fish care activity or manual quest claim', () => {
  const initial = makeState();
  const kangkung = {
    id: 'PET-KANGKUNG-AR01', species: 'Kangkung', expMode: 'iot-daily', appliedToAreaId: 'AR-01',
    level: 1, stage: 'Tunas', xp: 0, xpNext: 200, log: [],
  };
  const state = { ...initial, pets: [...initial.pets, kangkung] };
  const activity = apply(state, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'clean', sourceId: 'ACT-CLEAN',
    date: '2026-10-17', today: '2026-10-17', at: '17 Okt 2026 10.00',
  });
  assert.equal(activity.xpAwarded, 30);
  assert.equal(activity.state.pets.find((pet) => pet.id === kangkung.id).xp, 0);
  assert.deepEqual(activity.state.petQuestCompletions[0].petIds, ['PET-1', 'PET-2', 'PET-4']);

  assert.equal(typeof transition.applyPetQuestClaim, 'function');
  const claim = transition.applyPetQuestClaim(state, {
    userId: 'U-1', areaId: 'AR-01', questId: 'feed', period: 'daily',
    date: '2026-10-17', today: '2026-10-17', sourceEventId: 'MANUAL-FEED',
  });
  assert.equal(claim.xpAwarded, 30);
  assert.deepEqual(claim.completion.petIds, ['PET-1', 'PET-2', 'PET-4']);
  assert.equal(claim.completion.petIds.includes(kangkung.id), false);
});

test('same source event is idempotent for both points and EXP', () => {
  const initial = makeState();
  const event = {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'clean', sourceId: 'ACT-1',
    date: '2026-10-13', today: '2026-10-13', at: '13 Okt 2026 10.00',
  };
  const first = apply(initial, event);
  const duplicate = apply(first.state, event);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.pointsAwarded, 0);
  assert.equal(duplicate.xpAwarded, 0);
  assert.equal(duplicate.state.users[0].points, 10);
  assert.equal(duplicate.state.petQuestCompletions.length, 1);
});

test('point cap does not block a valid first quest completion', () => {
  const priorEvents = ['feed', 'clean', 'heal'].map((activityCode, index) => ({
    id: `OLD-${index}`, userId: 'U-1', areaId: `AR-0${index + 2}`, activityCode,
    sourceId: `OLD-SRC-${index}`, date: '2026-10-13', ruleId: 'R-4', pointsAwarded: 10,
  }));
  const result = apply(makeState({ pondActivityEvents: priorEvents }), {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'clean', sourceId: 'ACT-NEW',
    date: '2026-10-13', today: '2026-10-13', at: '13 Okt 2026 10.00',
  });
  assert.equal(result.pointsAwarded, 0);
  assert.equal(result.xpAwarded, 30);
  assert.equal(result.state.users[0].points, 0);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);
});

test('manual monitoring needs two readings for its quest, and telemetry cannot complete it', () => {
  const initial = makeState();
  const oneReading = apply(initial, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'monitoring', sourceId: 'MON-1',
    date: '2026-10-13', today: '2026-10-13', parameterCount: 1, measurements: { ph: 6.8 },
  });
  assert.equal(oneReading.completedQuestIds.length, 0);

  const twoReadings = apply(oneReading.state, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'monitoring', sourceId: 'MON-2',
    date: '2026-10-13', today: '2026-10-13', parameterCount: 2, measurements: { ph: 6.8, temp: 25 },
  });
  assert.deepEqual(twoReadings.completedQuestIds, ['water-check']);

  const telemetry = apply(twoReadings.state, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'telemetry', sourceId: 'IOT-1',
    date: '2026-10-13', today: '2026-10-13', parameterCount: 3,
  });
  assert.equal(telemetry.xpAwarded, 0);
  assert.deepEqual(telemetry.completedQuestIds, []);
});

test('backdated harvest remains unawarded and inaccessible/non-pond areas cannot earn rewards', () => {
  const initial = makeState();
  const oldHarvest = apply(initial, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'harvest', sourceId: 'HV-OLD',
    date: '2026-10-12', today: '2026-10-13',
  });
  assert.equal(oldHarvest.pointsAwarded, 0);
  assert.equal(oldHarvest.xpAwarded, 0);

  const inaccessible = apply(initial, {
    userId: 'U-1', areaId: 'AR-02', activityCode: 'feed', sourceId: 'ACT-OTHER',
    date: '2026-10-13', today: '2026-10-13',
  });
  assert.equal(inaccessible.pointsAwarded, 0);
  assert.equal(inaccessible.xpAwarded, 0);

  const nonPond = apply(initial, {
    userId: 'U-1', areaId: 'GB-01', activityCode: 'monitoring', sourceId: 'MON-GB',
    date: '2026-10-13', today: '2026-10-13', parameterCount: 3,
  });
  assert.equal(nonPond.xpAwarded, 0);
  assert.equal(nonPond.state.pondActivityEvents.length, 0);
});

test('keeps actor event IDs unique while quest EXP remains once per pond/date', () => {
  const state = makeState();
  state.users.push({ id: 'U-2', role: 'pengguna', areaIds: ['AR-01'], points: 0 });
  const first = apply(state, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'mortality', sourceId: 'AR-01|2026-10-13',
    id: 'MT-AR-01-2026-10-13', date: '2026-10-13', today: '2026-10-13',
  });
  const second = apply(first.state, {
    userId: 'U-2', areaId: 'AR-01', activityCode: 'mortality', sourceId: 'AR-01|2026-10-13',
    id: 'MT-AR-01-2026-10-13', date: '2026-10-13', today: '2026-10-13',
  });

  assert.notEqual(first.state.pondActivityEvents[0].id, second.state.pondActivityEvents[0].id);
  assert.equal(second.state.users.find((user) => user.id === 'U-1').points, 5);
  assert.equal(second.state.users.find((user) => user.id === 'U-2').points, 5);
  assert.equal(second.xpAwarded, 0);
  assert.deepEqual(second.alreadyCompletedQuestIds, ['mortality']);
  assert.equal(second.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);
});

test('migrates old gamification state additively and adds R-7 only once', () => {
  assert.equal(typeof transition.migrateGamificationState, 'function');
  const customRule = { id: 'R-4', activity: 'Care custom', points: 3, daily: 2, active: false };
  const oldState = {
    users: [{ id: 'U-1', points: 1240 }],
    pets: [{ id: 'P-1', xp: 320, level: 3 }],
    pointRules: [customRule],
    missions: [{ id: 'legacy', done: true, points: 50 }],
    pondActivityEvents: [{ id: 'old-event' }],
  };
  const migration = transition.migrateGamificationState(oldState, {
    pointRules: [customRule],
    missions: [{ id: 'M-1', done: false }],
    version: 1,
  });
  const merged = { ...oldState, ...migration };

  assert.equal(merged.users[0].points, 1240);
  assert.equal(merged.pets[0].xp, 320);
  assert.deepEqual(merged.pointRules[0], customRule);
  assert.equal(merged.pointRules.find((rule) => rule.id === 'R-7').points, 5);
  assert.deepEqual(merged.pondActivityEvents, [{ id: 'old-event' }]);
  assert.deepEqual(merged.petQuestCompletions, []);
  assert.deepEqual(merged.missions, [{ id: 'M-1', done: false }]);

  const deletedByAdmin = { ...merged, pointRules: [customRule] };
  const secondMigration = transition.migrateGamificationState(deletedByAdmin, {
    pointRules: [customRule],
    missions: [{ id: 'M-1', done: false }],
    version: 1,
  });
  assert.deepEqual(secondMigration.pointRules, [customRule]);
});

test('backfills today’s legacy manual monitoring into a mission event without re-awarding points', () => {
  const previousState = {
    gamificationStateVersion: 1,
    sessionUserId: 'U-1',
    users: [{ id: 'U-1', name: 'Budi Santoso', role: 'pengguna', areaIds: ['AR-01'], points: 1240 }],
    areas: [{ id: 'AR-01', type: 'kolam' }],
    monitoring: [
      { id: 'MON-OLD', areaId: 'AR-01', by: 'Budi Santoso', at: '14 Okt 2026 09.20', ph: 6.8, tds: 780 },
    ],
    pondActivityEvents: [],
  };
  const migration = transition.migrateGamificationState(previousState, {
    pointRules: [],
    missions: [{ id: 'M-WATER', activityCode: 'water-check', done: false }],
    version: 2,
    today: '2026-10-14',
  });

  assert.equal(migration.pondActivityEvents.length, 1);
  assert.deepEqual(migration.pondActivityEvents[0], {
    id: 'U-1|legacy-monitoring|MON-OLD',
    userId: 'U-1',
    areaId: 'AR-01',
    activityCode: 'monitoring',
    sourceId: 'MON-OLD',
    date: '2026-10-14',
    monthKey: '2026-10',
    at: '14 Okt 2026 09.20',
    parameterCount: 2,
    measurements: { ph: 6.8, tds: 780 },
    manual: true,
    pointsAwarded: 0,
    legacy: true,
  });
  assert.equal(previousState.users[0].points, 1240);
  const repeated = transition.migrateGamificationState({ ...previousState, ...migration }, {
    pointRules: [],
    missions: [{ id: 'M-WATER', activityCode: 'water-check', done: false }],
    version: 2,
    today: '2026-10-14',
  });
  assert.deepEqual(repeated.pondActivityEvents, migration.pondActivityEvents);
});

test('backfills only current-day records with two readings and a uniquely attributable owner', () => {
  const previousState = {
    gamificationStateVersion: 1,
    sessionUserId: 'U-1',
    users: [
      { id: 'U-1', name: 'Budi Santoso', role: 'pengguna', areaIds: ['AR-01'] },
      { id: 'U-2', name: 'Sari', role: 'pengguna', areaIds: ['AR-01'] },
    ],
    areas: [{ id: 'AR-01', type: 'kolam' }],
    monitoring: [
      { id: 'MON-ONE', areaId: 'AR-01', by: 'Budi Santoso', at: '14 Okt 2026 09.20', ph: 6.8 },
      { id: 'MON-OLD-DATE', areaId: 'AR-01', by: 'Budi Santoso', at: '13 Okt 2026 09.20', ph: 6.8, tds: 780 },
      { id: 'MON-OTHER', areaId: 'AR-01', by: 'Sari', at: '14 Okt 2026 09.20', ph: 6.8, tds: 780 },
      { id: 'MON-UNKNOWN', areaId: 'AR-01', by: 'Tidak Dikenal', at: '14 Okt 2026 09.20', ph: 6.8, tds: 780 },
    ],
    pondActivityEvents: [],
  };
  const migration = transition.migrateGamificationState(previousState, {
    pointRules: [], missions: [], version: 2, today: '2026-10-14',
  });

  assert.deepEqual(migration.pondActivityEvents.map((event) => [event.userId, event.sourceId]), [['U-2', 'MON-OTHER']]);
});

test('physical pond cleaning awards the monthly quest once without account points', () => {
  const event = {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'pond-cleaning', sourceId: 'CLEAN-1', id: 'CLEAN-1',
    date: '2026-10-13', today: '2026-10-13', monthKey: '2026-10',
    note: 'Lumut dibersihkan', at: '13 Okt 2026 10.00',
  };
  const first = apply(makeState(), event);
  assert.equal(first.pointsAwarded, 0);
  assert.equal(first.xpAwarded, 30);
  assert.deepEqual(first.completedQuestIds, []);
  assert.deepEqual(first.completedMonthlyQuestIds, ['monthly-pond-cleaning']);
  assert.equal(first.state.users[0].points, 0);
  assert.equal(first.state.pondActivityEvents[0].note, 'Lumut dibersihkan');
  assert.equal(first.state.petQuestCompletions[0].monthKey, '2026-10');
  assert.equal(first.state.petQuestCompletions[0].expPerPet, 10);

  const repeated = apply(first.state, { ...event, id: 'CLEAN-2', sourceId: 'CLEAN-2', at: '20 Okt 2026 10.00' });
  assert.equal(repeated.xpAwarded, 0);
  assert.deepEqual(repeated.alreadyCompletedMonthlyQuestIds, ['monthly-pond-cleaning']);
  assert.equal(repeated.state.petQuestCompletions.length, 1);
  assert.equal(repeated.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);

  const nextMonth = apply(repeated.state, {
    ...event,
    id: 'CLEAN-3',
    sourceId: 'CLEAN-3',
    date: '2026-11-01',
    today: '2026-11-01',
    monthKey: '2026-11',
    at: '1 Nov 2026 10.00',
  });
  assert.equal(nextMonth.xpAwarded, 30);
  assert.deepEqual(nextMonth.completedMonthlyQuestIds, ['monthly-pond-cleaning']);
  assert.equal(nextMonth.state.petQuestCompletions.length, 2);
});

test('backdated pond cleaning is history-only and grants no monthly EXP', () => {
  const result = apply(makeState(), {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'pond-cleaning', sourceId: 'CLEAN-OLD', id: 'CLEAN-OLD',
    date: '2026-10-12', today: '2026-10-13', monthKey: '2026-10',
  });
  assert.equal(result.pointsAwarded, 0);
  assert.equal(result.xpAwarded, 0);
  assert.deepEqual(result.completedMonthlyQuestIds, []);
  assert.equal(result.state.petQuestCompletions.length, 0);
});

test('daily V-Pet clean does not complete the monthly physical pond-cleaning quest', () => {
  const result = apply(makeState(), {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'clean', sourceId: 'PET-CLEAN-1',
    date: '2026-10-13', today: '2026-10-13', monthKey: '2026-10',
  });
  assert.deepEqual(result.completedQuestIds, ['clean']);
  assert.deepEqual(result.completedMonthlyQuestIds, []);
  assert.equal(result.state.petQuestCompletions.some((item) => item.period === 'monthly'), false);
});

test('manual daily checkbox claim awards EXP once to pond pets without account points or activity events', () => {
  assert.equal(typeof transition.applyPetQuestClaim, 'function');
  const input = {
    userId: 'U-1', areaId: 'AR-01', questId: 'feed', period: 'daily',
    date: '2026-10-14', today: '2026-10-14', monthKey: '2026-10',
    sourceEventId: 'U-1|manual-checkbox|feed|AR-01|2026-10-14', at: '14 Okt 2026 08.00',
  };
  const first = transition.applyPetQuestClaim(makeState(), input);
  assert.equal(first.completed, true);
  assert.equal(first.xpAwarded, 30);
  assert.equal(first.state.users[0].points, 0);
  assert.equal(first.state.pondActivityEvents.length, 0);
  assert.equal(first.state.petQuestCompletions[0].sourceType, 'manual-checkbox');
  assert.equal(first.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);
  assert.equal(first.state.pets.find((pet) => pet.id === 'PET-2').xp, 10);
  assert.equal(first.state.pets.find((pet) => pet.id === 'PET-4').xp, 10);
  assert.equal(first.state.pets.find((pet) => pet.id === 'PET-3').xp, 0);

  const repeat = transition.applyPetQuestClaim(first.state, { ...input, sourceEventId: 'U-1|repeat' });
  assert.equal(repeat.completed, false);
  assert.equal(repeat.reason, 'already-completed');
  assert.equal(repeat.xpAwarded, 0);
  assert.equal(repeat.state.petQuestCompletions.length, 1);
  assert.equal(repeat.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);
});

test('manual monthly checkbox claim is limited to one award per pond and local calendar month', () => {
  const input = {
    userId: 'U-1', areaId: 'AR-01', questId: 'monthly-pond-cleaning', period: 'monthly',
    date: '2026-10-14', today: '2026-10-14', monthKey: '2026-10',
    sourceEventId: 'U-1|manual-checkbox|monthly-pond-cleaning|AR-01|2026-10', at: '14 Okt 2026 08.00',
  };
  const first = transition.applyPetQuestClaim(makeState(), input);
  assert.equal(first.completed, true);
  assert.equal(first.xpAwarded, 30);
  assert.equal(first.state.users[0].points, 0);
  assert.equal(first.state.pondActivityEvents.length, 0);
  assert.equal(first.state.petQuestCompletions[0].period, 'monthly');
  assert.equal(first.state.petQuestCompletions[0].sourceType, 'manual-checkbox');

  const repeat = transition.applyPetQuestClaim(first.state, { ...input, sourceEventId: 'U-1|repeat-month' });
  assert.equal(repeat.completed, false);
  assert.equal(repeat.xpAwarded, 0);

  const nextMonth = transition.applyPetQuestClaim(repeat.state, {
    ...input, date: '2026-11-01', today: '2026-11-01', monthKey: '2026-11', sourceEventId: 'U-1|next-month',
  });
  assert.equal(nextMonth.completed, true);
  assert.equal(nextMonth.xpAwarded, 30);
  assert.equal(nextMonth.state.petQuestCompletions.length, 2);
  assert.equal(nextMonth.state.pets.find((pet) => pet.id === 'PET-1').xp, 20);
});

test('manual claim rejects invalid quest, unauthorized pond, non-pond, and backdated inputs', () => {
  const base = {
    userId: 'U-1', areaId: 'AR-01', questId: 'feed', period: 'daily',
    date: '2026-10-14', today: '2026-10-14', monthKey: '2026-10', sourceEventId: 'CLAIM-1',
  };
  const cases = [
    [{ ...base, questId: 'unknown' }, 'invalid'],
    [{ ...base, period: 'monthly' }, 'invalid'],
    [{ ...base, areaId: 'AR-02' }, 'inaccessible'],
    [{ ...base, areaId: 'GB-01' }, 'inaccessible'],
    [{ ...base, date: '2026-10-13', today: '2026-10-14' }, 'not-current-period'],
  ];
  for (const [input, reason] of cases) {
    const initial = makeState();
    const result = transition.applyPetQuestClaim(initial, input);
    assert.equal(result.completed, false);
    assert.equal(result.reason, reason);
    assert.equal(result.state, initial);
  }
});

test('manual monthly claim and subsequent physical cleaning cannot award duplicate EXP', () => {
  const claim = transition.applyPetQuestClaim(makeState(), {
    userId: 'U-1', areaId: 'AR-01', questId: 'monthly-pond-cleaning', period: 'monthly',
    date: '2026-10-14', today: '2026-10-14', monthKey: '2026-10', sourceEventId: 'CLAIM-1',
  });
  const cleaning = apply(claim.state, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'pond-cleaning', sourceId: 'CLEAN-1',
    date: '2026-10-14', today: '2026-10-14', monthKey: '2026-10',
  });
  assert.equal(cleaning.xpAwarded, 0);
  assert.deepEqual(cleaning.alreadyCompletedMonthlyQuestIds, ['monthly-pond-cleaning']);
  assert.equal(cleaning.state.pondActivityEvents.length, 1);
  assert.equal(cleaning.state.petQuestCompletions.length, 1);
});

test('manual daily claim and subsequent care activity cannot award duplicate EXP', () => {
  const claim = transition.applyPetQuestClaim(makeState(), {
    userId: 'U-1', areaId: 'AR-01', questId: 'feed', period: 'daily',
    date: '2026-10-14', today: '2026-10-14', monthKey: '2026-10', sourceEventId: 'CLAIM-FEED',
  });
  const feeding = apply(claim.state, {
    userId: 'U-1', areaId: 'AR-01', activityCode: 'feed', sourceId: 'FEED-1',
    date: '2026-10-14', today: '2026-10-14', at: '14 Okt 2026 08.05',
  });
  assert.equal(feeding.xpAwarded, 0);
  assert.deepEqual(feeding.alreadyCompletedQuestIds, ['feed']);
  assert.equal(feeding.state.petQuestCompletions.length, 1);
  assert.equal(feeding.state.pets.find((pet) => pet.id === 'PET-1').xp, 10);
});
