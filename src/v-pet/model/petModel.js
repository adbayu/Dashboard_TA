import { stageForLevel } from './petProgress.js';
import { SUPPORTED_PET_SPECIES } from '../data/seed.js';

const supportedSpecies = new Set(SUPPORTED_PET_SPECIES.map((species) => species.toLowerCase()));

export function isSupportedPetSpecies(species) {
  return supportedSpecies.has(String(species || '').trim().toLowerCase());
}

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

function normalizePetExpMode(pet, species) {
  if (String(species).trim().toLowerCase() === 'kangkung') return 'iot-daily';
  return pet?.expMode === 'iot-daily' ? undefined : pet?.expMode;
}

export function normalizePetCollection(state = {}, seedPets = []) {
  const stored = Array.isArray(state.pets) ? state.pets : [];
  const legacy = state.pet && typeof state.pet === 'object' ? state.pet : null;
  const supportedSeeds = seedPets.filter((seed) => isSupportedPetSpecies(seed?.species));
  const seededPets = supportedSeeds.map((seed) => {
    const firstOfSpecies = supportedSeeds.find((pet) => pet.species === seed.species)?.id === seed.id;
    const saved = stored.find((pet) => pet?.id === seed.id)
      || (firstOfSpecies && stored.find((pet) => !pet?.id && pet?.species === seed.species))
      || (legacy?.id === seed.id || (!legacy?.id && firstOfSpecies && legacy?.species === seed.species) ? legacy : null);
    const species = isSupportedPetSpecies(saved?.species) ? saved.species : seed.species;
    return {
      ...seed,
      ...(saved || {}),
      id: seed.id,
      species,
      expMode: normalizePetExpMode(saved || seed, species),
      stage: stageForLevel(saved?.level ?? seed.level, species),
      log: normalizePetLog(saved?.log ?? seed.log),
    };
  });
  const seededIds = new Set(supportedSeeds.map((seed) => seed.id));
  const extraPets = stored
    .filter((saved) => saved?.id && !seededIds.has(saved.id) && isSupportedPetSpecies(saved.species))
    .map((saved) => ({
      ...saved,
      expMode: normalizePetExpMode(saved, saved.species),
      stage: stageForLevel(saved.level, saved.species),
      log: normalizePetLog(saved.log),
    }));
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

export function visiblePetsForUser(pets = [], userId, areaIds = []) {
  const allowedAreaIds = new Set(areaIds);
  return pets.filter((pet) => {
    if (pet.ownerUserId && pet.ownerUserId !== userId) return false;
    if (pet.expMode === 'iot-daily' && pet.appliedToAreaId && !allowedAreaIds.has(pet.appliedToAreaId)) return false;
    return true;
  });
}

export function migratePetState(state = {}, seedPets = []) {
  const petCollection = normalizePetCollection(state, seedPets);
  const survivingPetIds = new Set(petCollection.pets.map((pet) => pet.id));
  const petQuestCompletions = Array.isArray(state.petQuestCompletions)
    ? state.petQuestCompletions.map((completion) => (
      Array.isArray(completion?.petIds)
        ? { ...completion, petIds: completion.petIds.filter((petId) => survivingPetIds.has(petId)) }
        : completion
    ))
    : [];
  const petSensorExpCompletions = Array.isArray(state.petSensorExpCompletions)
    ? state.petSensorExpCompletions.filter((completion) => !completion?.petId || survivingPetIds.has(completion.petId))
    : [];
  return { ...petCollection, petQuestCompletions, petSensorExpCompletions };
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
