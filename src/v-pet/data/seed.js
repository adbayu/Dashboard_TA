// ── Virtual Pet ────────────────────────────────────────────────────────────────
export const SUPPORTED_PET_SPECIES = Object.freeze(['Ikan Nila', 'Ikan Gurame', 'Kangkung']);

export const KANGKUNG_STAGES = ['Tunas', 'Tanaman muda', 'Rimbun', 'Siap panen'];

export const SEED_PET = {
  species: 'Ikan Nila',
  name: 'Nila Ku',
  stage: 'Nener', // Level 3 berada pada tahap Nener
  level: 3,
  xp: 320,
  xpNext: 500,
  hunger: 72,
  happiness: 84,
  hygiene: 61,
  health: 90,
  lastFed: null,
  lastPlayed: null,
  appliedToAreaId: 'AR-01',
  log: [],
};

export const SEED_PETS = [
  { ...SEED_PET, id: 'PET-NILA', species: 'Ikan Nila', name: 'Nila Ku', appliedToAreaId: 'AR-01' },
  { ...SEED_PET, id: 'PET-NILA-LEVEL-1', species: 'Ikan Nila', name: 'Nila Level 1', stage: 'Benih', level: 1, xp: 0, xpNext: 200, appliedToAreaId: 'AR-01', ownerUserId: null, log: [] },
  { ...SEED_PET, id: 'PET-NILA-LEVEL-2', species: 'Ikan Nila', name: 'Nila Level 2', stage: 'Benih', level: 2, xp: 0, xpNext: 270, appliedToAreaId: 'AR-01', ownerUserId: null, log: [] },
  { ...SEED_PET, id: 'PET-NILA-LEVEL-3', species: 'Ikan Nila', name: 'Nila Level 3', stage: 'Nener', level: 3, xp: 0, xpNext: 365, appliedToAreaId: 'AR-01', ownerUserId: null, log: [] },
  { ...SEED_PET, id: 'PET-GURAME', species: 'Ikan Gurame', name: 'Gurame Ku', stage: 'Benih', level: 1, xp: 0, xpNext: 200, hunger: 75, happiness: 80, hygiene: 84, health: 91, appliedToAreaId: null, log: [] },
  {
    id: 'PET-KANGKUNG-AR01',
    species: 'Kangkung',
    name: 'Kangkung Kolam Nila A',
    stage: 'Tunas',
    level: 1,
    xp: 0,
    xpNext: 200,
    hunger: 100,
    happiness: 100,
    hygiene: 100,
    health: 100,
    expMode: 'iot-daily',
    appliedToAreaId: 'AR-01',
    ownerUserId: null,
    log: [],
  },
];

export const PET_STAGES = ['Benih', 'Nener', 'Ikan Muda', 'Ikan Dewasa', 'Ikan Juara'];
