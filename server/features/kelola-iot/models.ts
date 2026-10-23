export const models = {
  'water-v1': { name: 'Pemantau air', sensors: [
    { code: 'water_temperature', name: 'Suhu air', unit: '°C', min: -10, max: 100 },
    { code: 'ph', name: 'pH', unit: 'pH', min: 0, max: 14 },
    { code: 'ec', name: 'EC', unit: 'mS/cm', min: 0, max: 100 },
  ] },
  'environment-v1': { name: 'Pemantau lingkungan', sensors: [
    { code: 'air_temperature', name: 'Suhu udara', unit: '°C', min: -50, max: 80 },
    { code: 'humidity', name: 'Kelembapan', unit: '%RH', min: 0, max: 100 },
  ] },
} as const;
export type Model = keyof typeof models;
