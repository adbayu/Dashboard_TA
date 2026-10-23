// ── Device IoT ─────────────────────────────────────────────────────────────────
// Untuk saat ini hanya ADA TIGA unit sensor, semuanya terpasang di Kolam Nila A.
// Statistik harian kolam dihitung dari ketiganya, jadi area tanpa sensor tidak
// menampilkan angka apa pun (jujur, bukan angka karangan).
export const SEED_DEVICES = [
  {
    id: 'IOT-001', code: 'AQ-PH-001', name: 'Sensor pH Kolam Nila A', categoryId: 'CAT-AIR', areaId: 'AR-01',
    model: 'Atlas EZO-pH', status: 'online', battery: 94, signal: 'LoRaWAN 98%', firmware: 'v2.4.1',
    installedAt: '2026-02-12', lastCalibration: '2026-03-01',
    description: 'Elektroda pH tahan air untuk mengukur tingkat keasaman air kolam nila.',
    functions: [
      'Mengukur pH air kolam tiap 60 detik',
      'Memicu alarm bila pH < 6,2 atau > 7,6',
      'Menyuplai data pH untuk statistik harian kolam',
    ],
    metric: { key: 'ph', value: 6.8 },
  },
  {
    id: 'IOT-002', code: 'AQ-TMP-002', name: 'Sensor Suhu Air Kolam Nila A', categoryId: 'CAT-AIR', areaId: 'AR-01',
    model: 'DS18B20 Waterproof', status: 'online', battery: 99, signal: 'WiFi -58 dBm', firmware: 'v1.9.0',
    installedAt: '2026-01-15', lastCalibration: '2026-01-15',
    description: 'Probe suhu air celup untuk memantau stabilitas termal kolam.',
    functions: [
      'Mengukur suhu air 0–50 °C',
      'Deteksi lonjakan suhu mendadak',
      'Menyuplai data suhu untuk statistik harian kolam',
    ],
    metric: { key: 'temp', value: 25.8 },
  },
  {
    id: 'IOT-003', code: 'AQ-TDS-003', name: 'Sensor TDS Kolam Nila A', categoryId: 'CAT-AIR', areaId: 'AR-01',
    model: 'Gravity TDS V1.0', status: 'online', battery: 90, signal: 'LoRaWAN 92%', firmware: 'v2.2.0',
    installedAt: '2026-02-20', lastCalibration: '2026-03-01',
    description: 'Mengukur total padatan terlarut (nutrisi & mineral) di air kolam.',
    functions: [
      'Membaca TDS larutan kolam dalam ppm',
      'Peringatan bila larutan terlalu pekat atau terlalu encer',
      'Menyuplai data TDS untuk statistik harian kolam',
    ],
    metric: { key: 'tds', value: 780 },
  },
];
