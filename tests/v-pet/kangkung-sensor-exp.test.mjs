import assert from 'node:assert/strict';
import test from 'node:test';

const sensorExp = await import('../../src/v-pet/model/kangkungSensorExp.js').catch(() => ({}));

const safeMetrics = [
  { key: 'ph', value: 6.8, threshold: [6.5, 7.5] },
  { key: 'temp', value: 27, threshold: [25, 29] },
  { key: 'tds', value: 700, threshold: [500, 900] },
];

const makeState = (overrides = {}) => {
  const pets = [
    { id: 'PET-NILA', species: 'Ikan Nila', appliedToAreaId: 'AR-01', level: 3, xp: 25, xpNext: 500, log: [] },
    { id: 'PET-KANGKUNG-AR01', species: 'Kangkung', expMode: 'iot-daily', appliedToAreaId: 'AR-01', level: 1, xp: 0, xpNext: 200, log: [] },
    { id: 'PET-KANGKUNG-OTHER', species: 'Kangkung', expMode: 'iot-daily', appliedToAreaId: 'AR-02', level: 1, xp: 0, xpNext: 200, log: [] },
  ];
  return {
    pets,
    pet: pets[0],
    selectedPetId: 'PET-NILA',
    users: [{ id: 'U-1', points: 321 }],
    pondActivityEvents: [],
    petQuestCompletions: [],
    petSensorExpCompletions: [],
    ...overrides,
  };
};

const apply = (state, input) => {
  assert.equal(typeof sensorExp.applyKangkungSensorExp, 'function');
  return sensorExp.applyKangkungSensorExp(state, input);
};

test('awards Kangkung +10 EXP once when all three current pond IoT metrics are within thresholds', () => {
  const initial = makeState();
  const result = apply(initial, { areaId: 'AR-01', date: '2026-10-17', metrics: safeMetrics, at: '17 Okt 2026 08.00' });

  assert.deepEqual(result.awardedPetIds, ['PET-KANGKUNG-AR01']);
  assert.equal(result.xpAwarded, 10);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-KANGKUNG-AR01').xp, 10);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-NILA').xp, 25);
  assert.equal(result.state.pets.find((pet) => pet.id === 'PET-KANGKUNG-OTHER').xp, 0);
  assert.equal(result.state.petSensorExpCompletions.length, 1);
  assert.equal(result.state.petSensorExpCompletions[0].date, '2026-10-17');
  assert.equal(result.state.petSensorExpCompletions[0].expAwarded, 10);
  assert.equal(result.state.users[0].points, 321);
  assert.deepEqual(result.state.pondActivityEvents, []);
  assert.deepEqual(result.state.petQuestCompletions, []);
});

test('missing, incomplete, or out-of-range IoT readings do not award Kangkung EXP', () => {
  const initial = makeState();
  const cases = [
    safeMetrics.filter((metric) => metric.key !== 'tds'),
    safeMetrics.map((metric) => metric.key === 'ph' ? { ...metric, value: 8 } : metric),
    safeMetrics.map((metric) => metric.key === 'temp' ? { ...metric, threshold: null } : metric),
  ];
  for (const metrics of cases) {
    const result = apply(initial, { areaId: 'AR-01', date: '2026-10-17', metrics });
    assert.deepEqual(result.awardedPetIds, []);
    assert.equal(result.xpAwarded, 0);
    assert.equal(result.state.pets.find((pet) => pet.id === 'PET-KANGKUNG-AR01').xp, 0);
    assert.equal(result.state.petSensorExpCompletions.length, 0);
  }
});

test('sensor condition message and animation follow current pH, temperature, and TDS readings', () => {
  assert.equal(typeof sensorExp.kangkungSensorReaction, 'function');
  const safe = sensorExp.kangkungSensorReaction(safeMetrics);
  assert.equal(safe.allSafe, true);
  assert.equal(safe.expression, 'senang');
  const cold = sensorExp.kangkungSensorReaction(safeMetrics.map((metric) => (
    metric.key === 'temp' ? { ...metric, value: 20 } : metric
  )));
  assert.equal(cold.expression, 'kedinginan');
  assert.match(cold.message, /Suhu air 20/);
  const missing = sensorExp.kangkungSensorReaction(safeMetrics.filter((metric) => metric.key !== 'tds'));
  assert.equal(missing.ready, false);
  assert.match(missing.message, /Menunggu pembacaan/);
});

test('sensor reward is idempotent per local date and becomes available next day', () => {
  const first = apply(makeState(), { areaId: 'AR-01', date: '2026-10-17', metrics: safeMetrics });
  const duplicate = apply(first.state, { areaId: 'AR-01', date: '2026-10-17', metrics: safeMetrics });
  const nextDay = apply(first.state, { areaId: 'AR-01', date: '2026-10-18', metrics: safeMetrics });

  assert.deepEqual(duplicate.awardedPetIds, []);
  assert.equal(duplicate.xpAwarded, 0);
  assert.equal(duplicate.state.pets.find((pet) => pet.id === 'PET-KANGKUNG-AR01').xp, 10);
  assert.deepEqual(nextDay.awardedPetIds, ['PET-KANGKUNG-AR01']);
  assert.equal(nextDay.state.pets.find((pet) => pet.id === 'PET-KANGKUNG-AR01').xp, 20);
  assert.equal(nextDay.state.petSensorExpCompletions.length, 2);
});
