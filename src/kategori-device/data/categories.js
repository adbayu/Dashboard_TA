// ── Kategori Device ────────────────────────────────────────────────────────────
// Hanya ada SATU jenis perangkat yang dipakai: sensor kualitas air dengan tiga
// parameter yang benar-benar diukur hardware — pH, suhu air, dan TDS.
// (Oksigen terlarut, kekeruhan, suhu udara, kelembapan, cahaya, aktuator, dan
// monitoring energi BELUM tersedia, jadi tidak didaftarkan sebagai kategori.)
export const SEED_CATEGORIES = [
  {
    id: 'CAT-AIR',
    name: 'Sensor Kualitas Air',
    icon: 'water_ec',
    color: '#0369a1',
    description: 'Perangkat pengukur parameter kimia & fisika air kolam aquaponik.',
    metrics: [
      { key: 'ph', label: 'pH Air', unit: 'pH', min: 6.2, max: 7.6 },
      { key: 'temp', label: 'Suhu Air', unit: '°C', min: 24, max: 30 },
      { key: 'tds', label: 'TDS', unit: 'ppm', min: 400, max: 900 },
    ],
  },
];
