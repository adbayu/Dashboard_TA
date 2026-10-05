import { stageForLevel } from '../data/petProgress.js';

export function createPetRecord(template, { id, name, areaId, ownerUserId = null } = {}) {
  return {
    ...template,
    id,
    name: name?.trim() || template.name,
    appliedToAreaId: areaId || null,
    ownerUserId,
    log: [],
  };
}

function normalizePetLog(log) {
  if (!Array.isArray(log)) return [];
  return log.map((entry) => {
    if (!/^\+\d+\s*xp$/i.test(String(entry?.delta || ''))) return entry;
    const isPlay = /diajak bermain arus kolam|diajak main/i.test(String(entry.text || ''));
    return {
      ...entry,
      ...(isPlay ? { text: `${entry.text} (riwayat sebelum aturan EXP berbasis kondisi)` } : {}),
      delta: 'EXP aturan lama',
    };
  });
}

export function normalizePetCollection(state = {}, seedPets = []) {
  const stored = Array.isArray(state.pets) ? state.pets : [];
  const legacy = state.pet && typeof state.pet === 'object' ? state.pet : null;
  const seededPets = seedPets.map((seed) => {
    const saved = stored.find((pet) => pet?.id === seed.id)
      || stored.find((pet) => !pet?.id && pet?.species === seed.species)
      || (legacy?.species === seed.species ? legacy : null);
    return {
      ...seed,
      ...(saved || {}),
      id: seed.id,
      species: saved?.species || seed.species,
      stage: stageForLevel(saved?.level ?? seed.level),
      log: normalizePetLog(saved?.log ?? seed.log),
    };
  });
  const seededIds = new Set(seedPets.map((seed) => seed.id));
  const extraPets = stored
    .filter((saved) => saved?.id && !seededIds.has(saved.id))
    .map((saved) => ({ ...saved, stage: stageForLevel(saved.level), log: normalizePetLog(saved.log) }));
  const pets = [...seededPets, ...extraPets];
  const active = pets.find((pet) => pet.id === state.selectedPetId)
    || (legacy && pets.find((pet) => pet.species === legacy.species))
    || pets[0]
    || null;
  return {
    pets,
    selectedPetId: active?.id || null,
    pet: active,
  };
}

export function selectPet(state, petId) {
  const pet = state.pets?.find((item) => item.id === petId);
  return pet ? { ...state, selectedPetId: pet.id, pet } : state;
}

export function patchPetCollection(state, petId, update) {
  if (!state.pets?.some((item) => item.id === petId)) return state;
  const pets = state.pets.map((item) => item.id === petId ? update(item) : item);
  const pet = pets.find((item) => item.id === state.selectedPetId) || pets[0] || null;
  return { ...state, pets, pet };
}
