import assert from 'node:assert/strict';
import test from 'node:test';
import { progressPetFromCare } from '../src/data/petProgress.js';

const pet = {
  level: 1,
  stage: 'Benih',
  xp: 100,
  xpNext: 200,
  hunger: 50,
  happiness: 60,
  hygiene: 60,
  health: 70,
};

test('awards EXP in proportion to net care-condition improvement', () => {
  const result = progressPetFromCare(pet, { hunger: 70, health: 74 });
  assert.equal(result.xpGain, 12);
  assert.equal(result.updates.xp, 112);
  assert.equal(result.updates.level, 1);
});

test('does not award EXP for play-only happiness changes', () => {
  const result = progressPetFromCare(pet, { happiness: 80 });
  assert.equal(result.xpGain, 0);
  assert.equal(result.updates.xp, pet.xp);
  assert.equal(result.updates.level, pet.level);
});

test('does not award EXP when the net care condition does not improve', () => {
  const unchanged = progressPetFromCare(pet, { hunger: 50, health: 70 });
  const worsened = progressPetFromCare(pet, { hunger: 65, health: 50 });
  assert.equal(unchanged.xpGain, 0);
  assert.equal(worsened.xpGain, 0);
});

test('a small real improvement earns at least one EXP', () => {
  const result = progressPetFromCare(pet, { hygiene: 61 });
  assert.equal(result.xpGain, 1);
});

test('levels and growth stage advance only when care-earned EXP reaches the threshold', () => {
  const nearLevel = { ...pet, level: 2, stage: 'Benih', xp: 198, xpNext: 200 };
  const result = progressPetFromCare(nearLevel, { hygiene: 64 });
  assert.equal(result.xpGain, 2);
  assert.equal(result.updates.level, 3);
  assert.equal(result.updates.stage, 'Nener');
  assert.equal(result.updates.xp, 0);
  assert.equal(result.updates.xpNext, 270);
});
