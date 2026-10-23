import { KANGKUNG_STAGES, PET_STAGES } from '../data/seed.js';

export function stagesForSpecies(species = '') {
  return String(species).trim().toLowerCase() === 'kangkung' ? KANGKUNG_STAGES : PET_STAGES;
}

export function stageForLevel(level = 1, species = 'Ikan Nila') {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  if (String(species).trim().toLowerCase() === 'kangkung') {
    return KANGKUNG_STAGES[Math.min(KANGKUNG_STAGES.length - 1, normalizedLevel - 1)];
  }
  const index = Math.min(PET_STAGES.length - 1, Math.max(0, Math.floor((normalizedLevel - 1) / 2)));
  return PET_STAGES[index];
}

export function applyPetCare(pet, careUpdates = {}) {
  const level = Number.isInteger(pet?.level) ? pet.level : 1;
  return {
    ...pet,
    ...careUpdates,
    level,
    stage: stageForLevel(level, pet?.species),
    xp: Number(pet?.xp) || 0,
    xpNext: Math.max(1, Number(pet?.xpNext) || 200),
  };
}

export function applyPetExperience(pet, amount = 10) {
  const gain = Number.isFinite(Number(amount)) ? Math.max(0, Math.floor(Number(amount))) : 0;
  let level = Number.isInteger(pet?.level) ? pet.level : 1;
  let xp = (Number(pet?.xp) || 0) + gain;
  let xpNext = Math.max(1, Number(pet?.xpNext) || 200);

  while (xp >= xpNext) {
    xp -= xpNext;
    level += 1;
    xpNext = Math.round(xpNext * 1.35);
  }

  return {
    ...pet,
    level,
    stage: stageForLevel(level, pet?.species),
    xp,
    xpNext,
  };
}
