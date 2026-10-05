import { PET_STAGES } from './seed.js';

const CARE_KEYS = ['hunger', 'hygiene', 'health'];
const CARE_POINTS_PER_EXP = 2;

const nilaiKondisi = (pet) => CARE_KEYS.reduce((total, key) => {
  const value = Number(pet?.[key]);
  return total + (Number.isFinite(value) ? value : 0);
}, 0);

export function experienceForConditionImprovement(before, after) {
  const gain = nilaiKondisi(after) - nilaiKondisi(before);
  return gain > 0 ? Math.ceil(gain / CARE_POINTS_PER_EXP) : 0;
}

export function stageForLevel(level = 1) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const index = Math.min(PET_STAGES.length - 1, Math.max(0, Math.floor((normalizedLevel - 1) / 2)));
  return PET_STAGES[index];
}

export function progressPetFromCare(pet, careUpdates = {}) {
  const after = { ...pet, ...careUpdates };
  const xpGain = experienceForConditionImprovement(pet, after);
  const startingLevel = Number.isInteger(pet.level) ? pet.level : 1;
  let level = startingLevel;
  let xp = (Number(pet.xp) || 0) + xpGain;
  let xpNext = Math.max(1, Number(pet.xpNext) || 200);

  while (xp >= xpNext) {
    xp -= xpNext;
    level += 1;
    xpNext = Math.round(xpNext * 1.35);
  }

  return {
    xpGain,
    updates: {
      ...careUpdates,
      level,
      stage: stageForLevel(level),
      xp,
      xpNext,
    },
  };
}
