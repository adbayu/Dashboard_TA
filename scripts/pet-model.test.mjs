import assert from 'node:assert/strict';
import test from 'node:test';
import { createPetRecord, normalizePetCollection, patchPetCollection, selectPet } from '../src/store/petModel.js';

const seeds = [
  { id: 'pet-nila', species: 'Ikan Nila', name: 'Nila Ku', appliedToAreaId: 'AR-01', hunger: 70, log: [] },
  { id: 'pet-lele', species: 'Ikan Lele', name: 'Lele Ku', appliedToAreaId: 'AR-02', hunger: 80, log: [] },
  { id: 'pet-mas', species: 'Ikan Mas', name: 'Mas Ku', appliedToAreaId: null, hunger: 80, log: [] },
  { id: 'pet-gurame', species: 'Ikan Gurame', name: 'Gurame Ku', appliedToAreaId: null, hunger: 80, log: [] },
  { id: 'pet-udang', species: 'Udang Galah', name: 'Udang Ku', appliedToAreaId: null, hunger: 80, log: [] },
];

test('migrates the old singleton pet and keeps all seeded characters as separate records', () => {
  const result = normalizePetCollection({
    pet: { ...seeds[0], hunger: 21, appliedToAreaId: 'AR-01' },
    pets: undefined,
    selectedPetId: undefined,
  }, seeds);
  assert.equal(result.pets.length, 5);
  assert.equal(result.pets.find((pet) => pet.id === 'pet-nila').hunger, 21);
  assert.equal(result.pets.find((pet) => pet.id === 'pet-lele').hunger, 80);
  assert.equal(result.selectedPetId, 'pet-nila');
  assert.equal(result.pet.id, 'pet-nila');
});

test('selects a pet by id without merging its care state with another pet', () => {
  const state = normalizePetCollection({ pets: seeds, selectedPetId: 'pet-nila' }, seeds);
  const selected = selectPet(state, 'pet-lele');
  assert.equal(selected.selectedPetId, 'pet-lele');
  assert.equal(selected.pet.species, 'Ikan Lele');
  assert.equal(selected.pet.hunger, 80);
  assert.equal(selected.pets.find((pet) => pet.id === 'pet-nila').hunger, 70);
});

test('updates only the addressed pet and refreshes the active-pet compatibility alias', () => {
  const state = normalizePetCollection({ pets: seeds, selectedPetId: 'pet-lele' }, seeds);
  const updated = patchPetCollection(state, 'pet-nila', (pet) => ({ ...pet, hunger: 99, appliedToAreaId: 'AR-02' }));
  assert.equal(updated.pets.find((pet) => pet.id === 'pet-nila').hunger, 99);
  assert.equal(updated.pets.find((pet) => pet.id === 'pet-lele').hunger, 80);
  assert.equal(updated.pet.id, 'pet-lele');
  assert.equal(updated.pet.appliedToAreaId, 'AR-02');
});

test('preserves manager-configured character, name, and area after state migration', () => {
  const customPet = { ...seeds[0], species: 'Ikan Lele', name: 'Lele Kolam Satu', appliedToAreaId: 'AR-02' };
  const result = normalizePetCollection({ pets: [customPet], selectedPetId: 'pet-nila' }, seeds);
  const configured = result.pets.find((pet) => pet.id === 'pet-nila');
  assert.equal(configured.species, 'Ikan Lele');
  assert.equal(configured.name, 'Lele Kolam Satu');
  assert.equal(configured.appliedToAreaId, 'AR-02');
});

test('keeps user-created pets in the collection across reload normalization', () => {
  const added = {
    id: 'PET-U1-NEW-1', species: 'Ikan Mas', name: 'Mas Kolam Baru', appliedToAreaId: 'AR-05',
    ownerUserId: 'U-1', hunger: 80, happiness: 80, hygiene: 80, health: 100, log: [],
  };
  const result = normalizePetCollection({ pets: [...seeds, added], selectedPetId: added.id }, seeds);
  assert.equal(result.pets.length, 6);
  assert.equal(result.pets.find((pet) => pet.id === added.id).ownerUserId, 'U-1');
  assert.equal(result.selectedPetId, added.id);
  assert.equal(result.pet.id, added.id);
});

test('creates private user pets and shared manager pets with the same model shape', () => {
  const userPet = createPetRecord(seeds[3], {
    id: 'PET-USER-1', name: 'Gurame Pribadi', areaId: 'AR-01', ownerUserId: 'U-1',
  });
  const managerPet = createPetRecord(seeds[3], {
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
