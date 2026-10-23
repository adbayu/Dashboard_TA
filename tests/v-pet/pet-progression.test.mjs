import assert from 'node:assert/strict';
import test from 'node:test';
import * as petProgress from '../../src/v-pet/model/petProgress.js';

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
const applyPetCare = (target, changes) => {
  assert.equal(typeof petProgress.applyPetCare, 'function');
  return petProgress.applyPetCare(target, changes);
};
const applyPetExperience = (target, amount) => {
  assert.equal(typeof petProgress.applyPetExperience, 'function');
  return petProgress.applyPetExperience(target, amount);
};

test('care actions update condition without granting EXP directly', () => {
  const updated = applyPetCare(pet, { hunger: 70, health: 74 });
  assert.equal(updated.hunger, 70);
  assert.equal(updated.health, 74);
  assert.equal(updated.xp, pet.xp);
  assert.equal(updated.level, pet.level);
});

test('play-only happiness changes do not affect EXP', () => {
  const updated = applyPetCare(pet, { happiness: 80 });
  assert.equal(updated.happiness, 80);
  assert.equal(updated.xp, pet.xp);
  assert.equal(updated.level, pet.level);
});

test('unchanged and worsened care conditions do not affect EXP', () => {
  const unchanged = applyPetCare(pet, { hunger: 50, health: 70 });
  const worsened = applyPetCare(pet, { hunger: 65, health: 50 });
  assert.equal(unchanged.xp, pet.xp);
  assert.equal(worsened.xp, pet.xp);
});

test('a small care improvement does not grant EXP outside a quest', () => {
  const updated = applyPetCare(pet, { hygiene: 61 });
  assert.equal(updated.hygiene, 61);
  assert.equal(updated.xp, pet.xp);
});

test('quest EXP advances level and growth stage while preserving remainder', () => {
  const nearLevel = { ...pet, level: 2, stage: 'Benih', xp: 198, xpNext: 200 };
  const updated = applyPetExperience(nearLevel, 2);
  assert.equal(updated.level, 3);
  assert.equal(updated.stage, 'Nener');
  assert.equal(updated.xp, 0);
  assert.equal(updated.xpNext, 270);
});

test('one quest reward may cross more than one level threshold', () => {
  const nearLevel = { ...pet, level: 1, xp: 190, xpNext: 200 };
  const updated = applyPetExperience(nearLevel, 400);
  assert.equal(updated.level, 3);
  assert.equal(updated.stage, 'Nener');
  assert.equal(updated.xp, 120);
  assert.equal(updated.xpNext, 365);
});

test('Kangkung uses plant growth stages instead of fish stages', () => {
  assert.equal(petProgress.stageForLevel(1, 'Kangkung'), 'Tunas');
  assert.equal(petProgress.stageForLevel(2, 'Kangkung'), 'Tanaman muda');
  assert.equal(petProgress.stageForLevel(3, 'Kangkung'), 'Rimbun');
  assert.equal(petProgress.stageForLevel(4, 'Kangkung'), 'Siap panen');
  assert.equal(petProgress.applyPetExperience({ ...pet, species: 'Kangkung', level: 3, xp: 199, xpNext: 200 }, 1).stage, 'Siap panen');
});
