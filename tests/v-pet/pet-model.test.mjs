import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_PETS, SUPPORTED_PET_SPECIES } from '../../src/v-pet/data/seed.js';
import { createPetRecord, isSupportedPetSpecies, migratePetState, normalizePetCollection, patchPetCollection, selectPet, visiblePetsForUser } from '../../src/v-pet/model/petModel.js';

const seeds = [
  { id: 'pet-nila', species: 'Ikan Nila', name: 'Nila Ku', appliedToAreaId: 'AR-01', hunger: 70, log: [] },
  { id: 'pet-gurame', species: 'Ikan Gurame', name: 'Gurame Ku', appliedToAreaId: null, hunger: 80, log: [] },
];

test('V-Pet catalog and species guard expose Nila, Gurame, and Kangkung', () => {
  assert.deepEqual(SUPPORTED_PET_SPECIES, ['Ikan Nila', 'Ikan Gurame', 'Kangkung']);
  assert.deepEqual([...new Set(SEED_PETS.map((pet) => pet.species))], ['Ikan Nila', 'Ikan Gurame', 'Kangkung']);
  assert.equal(isSupportedPetSpecies('Ikan Nila'), true);
  assert.equal(isSupportedPetSpecies('Ikan Gurame'), true);
  assert.equal(isSupportedPetSpecies('Kangkung'), true);
  assert.equal(isSupportedPetSpecies('Ikan Lele'), false);
  assert.equal(isSupportedPetSpecies('Ikan Mas'), false);
});

test('seeds one sensor-driven Kangkung in Kolam Nila A and preserves its progression', () => {
  const seed = SEED_PETS.find((pet) => pet.id === 'PET-KANGKUNG-AR01');
  assert.ok(seed);
  assert.equal(seed.species, 'Kangkung');
  assert.equal(seed.appliedToAreaId, 'AR-01');
  assert.equal(seed.expMode, 'iot-daily');

  const saved = { ...seed, name: 'Kangkung Saya', level: 3, xp: 120, xpNext: 365 };
  const result = normalizePetCollection({ pets: [saved], selectedPetId: saved.id }, SEED_PETS);
  const kangkung = result.pets.find((pet) => pet.id === saved.id);
  assert.equal(kangkung.name, 'Kangkung Saya');
  assert.equal(kangkung.level, 3);
  assert.equal(kangkung.xp, 120);
  assert.equal(kangkung.appliedToAreaId, 'AR-01');
  assert.equal(result.pets.filter((pet) => pet.id === seed.id).length, 1);
});

test('clears Kangkung-only sensor mode when its shared slot is reconfigured as a fish', () => {
  const seed = SEED_PETS.find((pet) => pet.id === 'PET-KANGKUNG-AR01');
  const result = normalizePetCollection({
    pets: [{ ...seed, species: 'Ikan Nila', expMode: 'iot-daily' }],
    selectedPetId: seed.id,
  }, SEED_PETS);
  const converted = result.pets.find((pet) => pet.id === seed.id);
  assert.equal(converted.species, 'Ikan Nila');
  assert.equal(converted.expMode, undefined);
  assert.equal(converted.stage, 'Benih');
});

test('hides the shared sensor-driven Kangkung from users without access to its pond', () => {
  const kangkung = SEED_PETS.find((pet) => pet.id === 'PET-KANGKUNG-AR01');
  assert.deepEqual(visiblePetsForUser([kangkung], 'U001', ['AR-01']), [kangkung]);
  assert.deepEqual(visiblePetsForUser([kangkung], 'U002', ['AR-02']), []);
});

test('keeps valid Kangkung sensor EXP history and drops removed pet references', () => {
  const seed = SEED_PETS.find((pet) => pet.id === 'PET-KANGKUNG-AR01');
  const result = migratePetState({
    pets: [{ ...seed, level: 2, xp: 85 }],
    selectedPetId: seed.id,
    petSensorExpCompletions: [
      { petId: seed.id, areaId: 'AR-01', date: '2026-10-17', expAwarded: 10 },
      { petId: 'PET-REMOVED', areaId: 'AR-01', date: '2026-10-17', expAwarded: 10 },
    ],
  }, SEED_PETS);

  assert.equal(result.pets.find((pet) => pet.id === seed.id).level, 2);
  assert.equal(result.pets.find((pet) => pet.id === seed.id).xp, 85);
  assert.deepEqual(result.petSensorExpCompletions.map((entry) => entry.petId), [seed.id]);
});

test('adds the level-1 Nila to existing collections without copying the active level-3 Nila', () => {
  const oldNila = { ...SEED_PETS.find((pet) => pet.id === 'PET-NILA'), name: 'Nila Lama', xp: 350 };
  const state = { pets: [oldNila], pet: oldNila, selectedPetId: oldNila.id };
  const result = normalizePetCollection(state, SEED_PETS);
  const added = result.pets.find((pet) => pet.id === 'PET-NILA-LEVEL-1');
  assert.equal(added.name, 'Nila Level 1');
  assert.equal(added.level, 1);
  assert.equal(added.stage, 'Benih');
  assert.equal(added.xp, 0);
  assert.equal(added.xpNext, 200);
  assert.equal(added.ownerUserId, null);
  assert.equal(result.pet.name, 'Nila Lama');
  assert.equal(result.pet.xp, 350);
  assert.equal(result.pet.level, 3);
  const nila2 = result.pets.find((pet) => pet.id === 'PET-NILA-LEVEL-2');
  assert.equal(nila2.name, 'Nila Level 2');
  assert.equal(nila2.level, 2);
  assert.equal(nila2.xp, 0);
  assert.equal(nila2.xpNext, 270);
  assert.equal(nila2.ownerUserId, null);
  const reloaded = normalizePetCollection(result, SEED_PETS);
  assert.equal(reloaded.pets.filter((pet) => pet.id === added.id).length, 1);
  assert.equal(reloaded.pets.filter((pet) => pet.id === nila2.id).length, 1);
  const selected = selectPet(reloaded, added.id);
  assert.equal(selected.pet.level, 1);
});

test('applies an id-less legacy Nila only to the original seeded Nila', () => {
  const result = normalizePetCollection({ pet: { species: 'Ikan Nila', level: 4, xp: 50 } }, SEED_PETS);
  assert.equal(result.pets.find((pet) => pet.id === 'PET-NILA').level, 4);
  assert.equal(result.pets.find((pet) => pet.id === 'PET-NILA-LEVEL-1').level, 1);
});

test('keeps Nila levels and Gurame separate while preserving their saved progress', () => {
  const oldNila = { ...SEED_PETS.find((pet) => pet.id === 'PET-NILA'), level: 5, xp: 450 };
  const oldGurame = { ...SEED_PETS.find((pet) => pet.id === 'PET-GURAME'), level: 2, xp: 230 };
  const state = { pets: [oldNila, oldGurame], pet: oldGurame, selectedPetId: oldGurame.id };
  const result = normalizePetCollection(state, SEED_PETS);
  for (const [id, species, level] of [
    ['PET-NILA-LEVEL-3', 'Ikan Nila', 3],
  ]) {
    const added = result.pets.find((pet) => pet.id === id);
    assert.equal(added.species, species);
    assert.equal(added.level, level);
    assert.equal(added.xp, 0);
    assert.equal(added.ownerUserId, null);
    assert.equal(selectPet(result, id).pet.id, id);
    assert.equal(normalizePetCollection(result, SEED_PETS).pets.filter((pet) => pet.id === id).length, 1);
  }
  assert.equal(result.pet.id, oldGurame.id);
  assert.equal(result.pet.level, 2);
  assert.equal(result.pet.xp, 230);
  assert.equal(result.pets.find((pet) => pet.id === oldNila.id).level, 5);
});

test('migrates the old singleton pet and keeps the Nila and Gurame seed records', () => {
  const result = normalizePetCollection({
    pet: { ...seeds[0], hunger: 21, appliedToAreaId: 'AR-01' },
    pets: undefined,
    selectedPetId: undefined,
  }, seeds);
  assert.equal(result.pets.length, 2);
  assert.equal(result.pets.find((pet) => pet.id === 'pet-nila').hunger, 21);
  assert.equal(result.pets.find((pet) => pet.id === 'pet-gurame').hunger, 80);
  assert.equal(result.selectedPetId, 'pet-nila');
  assert.equal(result.pet.id, 'pet-nila');
});

test('selects a pet by id without merging its care state with another pet', () => {
  const state = normalizePetCollection({ pets: seeds, selectedPetId: 'pet-nila' }, seeds);
  const selected = selectPet(state, 'pet-gurame');
  assert.equal(selected.selectedPetId, 'pet-gurame');
  assert.equal(selected.pet.species, 'Ikan Gurame');
  assert.equal(selected.pet.hunger, 80);
  assert.equal(selected.pets.find((pet) => pet.id === 'pet-nila').hunger, 70);
});

test('updates only the addressed pet and refreshes the active-pet compatibility alias', () => {
  const state = normalizePetCollection({ pets: seeds, selectedPetId: 'pet-gurame' }, seeds);
  const updated = patchPetCollection(state, 'pet-nila', (pet) => ({ ...pet, hunger: 99, appliedToAreaId: 'AR-02' }));
  assert.equal(updated.pets.find((pet) => pet.id === 'pet-nila').hunger, 99);
  assert.equal(updated.pets.find((pet) => pet.id === 'pet-gurame').hunger, 80);
  assert.equal(updated.pet.id, 'pet-gurame');
  assert.equal(updated.pet.appliedToAreaId, null);
});

test('preserves manager-configured character, name, and area after state migration', () => {
  const customPet = { ...seeds[0], species: 'Ikan Gurame', name: 'Gurame Kolam Satu', appliedToAreaId: 'AR-02' };
  const result = normalizePetCollection({ pets: [customPet], selectedPetId: 'pet-nila' }, seeds);
  const configured = result.pets.find((pet) => pet.id === 'pet-nila');
  assert.equal(configured.species, 'Ikan Gurame');
  assert.equal(configured.name, 'Gurame Kolam Satu');
  assert.equal(configured.appliedToAreaId, 'AR-02');
});

test('keeps user-created pets in the collection across reload normalization', () => {
  const added = {
    id: 'PET-U1-NEW-1', species: 'Ikan Gurame', name: 'Gurame Kolam Baru', appliedToAreaId: 'AR-05',
    ownerUserId: 'U-1', hunger: 80, happiness: 80, hygiene: 80, health: 100, log: [],
  };
  const result = normalizePetCollection({ pets: [...seeds, added], selectedPetId: added.id }, seeds);
  assert.equal(result.pets.length, 3);
  assert.equal(result.pets.find((pet) => pet.id === added.id).ownerUserId, 'U-1');
  assert.equal(result.selectedPetId, added.id);
  assert.equal(result.pet.id, added.id);
});

test('creates private user pets and shared manager pets with the same model shape', () => {
  const userPet = createPetRecord(seeds[1], {
    id: 'PET-USER-1', name: 'Gurame Pribadi', areaId: 'AR-01', ownerUserId: 'U-1',
  });
  const managerPet = createPetRecord(seeds[1], {
    id: 'PET-FARM-1', name: 'Gurame Farm', areaId: 'AR-02', ownerUserId: null,
  });
  assert.equal(userPet.ownerUserId, 'U-1');
  assert.equal(managerPet.ownerUserId, null);
  assert.equal(userPet.species, managerPet.species);
  assert.equal(userPet.log.length, 0);
  assert.equal(managerPet.appliedToAreaId, 'AR-02');
});

test('labels old fixed-EXP history as legacy without changing the saved EXP balance', () => {
  const playedPet = {
    ...seeds[0],
    xp: 320,
    log: [
      { id: 'old-play', text: 'Nila Ku diajak bermain arus kolam.', delta: '+12 xp' },
      { id: 'old-feed', text: 'Nila Ku diberi pakan pelet.', delta: '+15 xp' },
    ],
  };
  const result = normalizePetCollection({ pets: [playedPet], selectedPetId: playedPet.id }, seeds);
  const migrated = result.pets.find((pet) => pet.id === playedPet.id);
  assert.equal(migrated.xp, 320);
  assert.equal(migrated.log[0].delta, 'EXP aturan lama');
  assert.match(migrated.log[0].text, /riwayat sebelum aturan EXP berbasis kondisi/);
  assert.equal(migrated.log[1].delta, 'EXP aturan lama');
});

test('preserves saved EXP and aligns growth stage with the current level', () => {
  const advancedPet = { ...seeds[0], level: 3, stage: 'Benih', xp: 320, xpNext: 500, log: [] };
  const result = normalizePetCollection({ pets: [advancedPet], selectedPetId: advancedPet.id }, seeds);
  const normalized = result.pets.find((pet) => pet.id === advancedPet.id);
  assert.equal(normalized.level, 3);
  assert.equal(normalized.stage, 'Nener');
  assert.equal(normalized.xp, 320);
});

test('removes unsupported saved species while preserving Nila, Gurame, and Kangkung progress', () => {
  const nila = { ...SEED_PETS.find((pet) => pet.id === 'PET-NILA'), level: 5, xp: 420, hunger: 45 };
  const gurame = { ...SEED_PETS.find((pet) => pet.id === 'PET-GURAME'), level: 2, xp: 80, hygiene: 55 };
  const kangkung = { ...SEED_PETS.find((pet) => pet.id === 'PET-KANGKUNG-AR01'), level: 2, xp: 88 };
  const lele = { id: 'PET-OLD-LELE', species: 'Ikan Lele', name: 'Lele Lama', level: 4, xp: 230 };
  const mas = { id: 'PET-OLD-MAS', species: 'Ikan Mas', name: 'Mas Lama', level: 2, xp: 75 };

  const result = normalizePetCollection({
    pets: [nila, gurame, kangkung, lele, mas],
    pet: lele,
    selectedPetId: lele.id,
  }, SEED_PETS);

  assert.deepEqual([...new Set(result.pets.map((pet) => pet.species))].sort(), ['Ikan Gurame', 'Ikan Nila', 'Kangkung']);
  assert.equal(result.pets.find((pet) => pet.id === 'PET-NILA').level, 5);
  assert.equal(result.pets.find((pet) => pet.id === 'PET-NILA').xp, 420);
  assert.equal(result.pets.find((pet) => pet.id === 'PET-GURAME').level, 2);
  assert.equal(result.pets.find((pet) => pet.id === 'PET-GURAME').xp, 80);
  assert.equal(result.pets.find((pet) => pet.id === kangkung.id).level, 2);
  assert.equal(result.pets.find((pet) => pet.id === kangkung.id).xp, 88);
  assert.equal(result.selectedPetId, 'PET-NILA');
  assert.equal(result.pet.id, 'PET-NILA');
});

test('filters removed pet IDs from quest recipients but retains completion identity', async () => {
  const { migratePetState } = await import('../../src/v-pet/model/petModel.js');
  assert.equal(typeof migratePetState, 'function');

  const nila = { ...SEED_PETS.find((pet) => pet.id === 'PET-NILA'), xp: 120 };
  const gurame = { ...SEED_PETS.find((pet) => pet.id === 'PET-GURAME'), xp: 40 };
  const oldLele = { id: 'PET-OLD-LELE', species: 'Ikan Lele', name: 'Lele Lama', xp: 30 };
  const migrated = migratePetState({
    pets: [nila, gurame, oldLele],
    selectedPetId: oldLele.id,
    pet: oldLele,
    petQuestCompletions: [{ id: 'completion-1', areaId: 'AR-01', questId: 'feed', petIds: [nila.id, gurame.id, oldLele.id] }],
  }, SEED_PETS);

  assert.deepEqual(migrated.petQuestCompletions, [{
    id: 'completion-1', areaId: 'AR-01', questId: 'feed', petIds: [nila.id, gurame.id],
  }]);
  assert.equal(migrated.selectedPetId, 'PET-NILA');
  assert.equal(migrated.pets.find((pet) => pet.id === 'PET-NILA').xp, 120);
  assert.equal(migrated.pets.find((pet) => pet.id === 'PET-GURAME').xp, 40);
});
