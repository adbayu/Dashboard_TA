// Seed data SmartDashboard AquaSmartponik — sistem aquaponik berbasis IoT

// ── Kategori Device ────────────────────────────────────────────────────────────
export const SEED_CATEGORIES = [
  {
    id: 'CAT-AIR',
    name: 'Sensor Kualitas Air',
    icon: 'water_ec',
    color: '#0369a1',
    description: 'Perangkat pengukur parameter kimia & fisika air kolam aquaponik.',
    metrics: [
      { key: 'ph', label: 'pH Air', unit: 'pH', min: 6.2, max: 7.2 },
      { key: 'do', label: 'Oksigen Terlarut', unit: 'mg/L', min: 5.0, max: 9.0 },
      { key: 'temp', label: 'Suhu Air', unit: '°C', min: 24, max: 30 },
      { key: 'tds', label: 'TDS', unit: 'ppm', min: 400, max: 900 },
      { key: 'turbidity', label: 'Kekeruhan', unit: 'NTU', min: 0, max: 25 },
    ],
  },
  {
    id: 'CAT-ENV',
    name: 'Sensor Lingkungan',
    icon: 'device_thermostat',
    color: '#b45309',
    description: 'Perangkat pemantau iklim mikro di sekitar growbed dan kolam.',
    metrics: [
      { key: 'airTemp', label: 'Suhu Udara', unit: '°C', min: 24, max: 33 },
      { key: 'humidity', label: 'Kelembapan', unit: '%', min: 55, max: 85 },
      { key: 'lux', label: 'Intensitas Cahaya', unit: 'lux', min: 8000, max: 45000 },
      { key: 'uv', label: 'Indeks UV', unit: 'UV', min: 0, max: 7 },
    ],
  },
  {
    id: 'CAT-AKT',
    name: 'Aktuator / Pengendali',
    icon: 'settings_input_component',
    color: '#7c3aed',
    description: 'Perangkat yang menjalankan aksi otomatis: pompa, aerator, dosing.',
    metrics: [
      { key: 'flow', label: 'Debit Aliran', unit: 'L/min', min: 8, max: 30 },
      { key: 'runtime', label: 'Jam Operasi', unit: 'jam', min: 0, max: 24 },
      { key: 'dose', label: 'Volume Dosing', unit: 'mL', min: 0, max: 500 },
    ],
  },
  {
    id: 'CAT-ENERGI',
    name: 'Monitoring Energi',
    icon: 'bolt',
    color: '#be123c',
    description: 'Perangkat pemantau konsumsi daya instalasi aquaponik.',
    metrics: [
      { key: 'power', label: 'Daya Aktif', unit: 'W', min: 0, max: 1200 },
      { key: 'voltage', label: 'Tegangan', unit: 'V', min: 200, max: 240 },
      { key: 'kwh', label: 'Konsumsi', unit: 'kWh', min: 0, max: 300 },
    ],
  },
];

// ── Area (kolam / growbed / tandon) ────────────────────────────────────────────
export const SEED_AREAS = [
  {
    id: 'AR-01',
    name: 'Kolam Nila A',
    type: 'kolam',
    location: 'Blok Barat — Unit 1',
    volume: 12000,
    unit: 'liter',
    commodity: 'Ikan Nila',
    population: 500,
    populationUnit: 'ekor',
    status: 'aktif',
    deviceIds: ['IOT-001', 'IOT-002', 'IOT-003', 'IOT-009'],
    targets: { ph: [6.5, 7.5], temp: [25, 29], do: [5.5, 8] },
    note: 'Siklus panen 4 bulan, aerator venturi aktif 24 jam.',
    hpp: [
      { id: 'H-1', name: 'Benih nila gesit', qty: 500, unit: 'ekor', unitPrice: 1200 },
      { id: 'H-2', name: 'Pakan apung 781-2', qty: 50, unit: 'kg', unitPrice: 13500 },
      { id: 'H-3', name: 'Probiotik EM4 Perikanan', qty: 2, unit: 'liter', unitPrice: 45000 },
      { id: 'H-4', name: 'Listrik aerator + pompa', qty: 1, unit: 'bulan', unitPrice: 165000 },
    ],
  },
  {
    id: 'AR-02',
    name: 'Kolam Lele B',
    type: 'kolam',
    location: 'Blok Timur — Unit 2',
    volume: 9000,
    unit: 'liter',
    commodity: 'Ikan Lele',
    population: 800,
    populationUnit: 'ekor',
    status: 'aktif',
    deviceIds: ['IOT-005', 'IOT-010'],
    targets: { ph: [6.5, 8.0], temp: [26, 30], do: [4.0, 8] },
    note: 'Padat tebar tinggi, wajib cek oksigen pagi & sore.',
    hpp: [
      { id: 'H-5', name: 'Benih lele sangkuriang', qty: 800, unit: 'ekor', unitPrice: 450 },
      { id: 'H-6', name: 'Pakan apung 781-1', qty: 60, unit: 'kg', unitPrice: 12800 },
      { id: 'H-7', name: 'Molase + gula fermentasi', qty: 5, unit: 'kg', unitPrice: 15000 },
    ],
  },
  {
    id: 'AR-03',
    name: 'Growbed Sayur 1',
    type: 'growbed',
    location: 'Blok Selatan — Bedengan A',
    volume: 2400,
    unit: 'liter',
    commodity: 'Kangkung & Pakcoy',
    population: 640,
    populationUnit: 'lubang tanam',
    status: 'aktif',
    deviceIds: ['IOT-006', 'IOT-007'],
    targets: { ph: [6.2, 7.0], ec: [1.4, 2.2], lux: [12000, 40000] },
    note: 'Rotasi kangkung 25 hari, pakcoy 30 hari.',
    hpp: [
      { id: 'H-8', name: 'Benih kangkung sutra', qty: 2, unit: 'pack', unitPrice: 25000 },
      { id: 'H-9', name: 'Benih pakcoy', qty: 2, unit: 'pack', unitPrice: 32000 },
      { id: 'H-10', name: 'Rockwool + netpot', qty: 640, unit: 'buah', unitPrice: 650 },
      { id: 'H-11', name: 'Tenaga tanam & panen', qty: 6, unit: 'HOK', unitPrice: 60000 },
    ],
  },
  {
    id: 'AR-04',
    name: 'Tandon Nutrisi Utama',
    type: 'tandon',
    location: 'Blok Tengah — Rumah Pompa',
    volume: 4000,
    unit: 'liter',
    commodity: 'Nutrisi & Buffer',
    population: 0,
    populationUnit: 'liter',
    status: 'aktif',
    deviceIds: ['IOT-004', 'IOT-008'],
    targets: { ph: [6.0, 7.0], tds: [500, 900], flow: [10, 25] },
    note: 'Pusat dosing nutrisi A/B dan penstabil pH.',
    hpp: [
      { id: 'H-12', name: 'Nutrisi hidroponik A/B', qty: 10, unit: 'liter', unitPrice: 38000 },
      { id: 'H-13', name: 'pH up/down', qty: 2, unit: 'liter', unitPrice: 42000 },
      { id: 'H-14', name: 'Filter pasir + cartridge', qty: 1, unit: 'set', unitPrice: 275000 },
    ],
  },
];

// ── Device IoT ─────────────────────────────────────────────────────────────────
export const SEED_DEVICES = [
  {
    id: 'IOT-001', code: 'AQ-PH-001', name: 'pH Probe Kolam Nila A', categoryId: 'CAT-AIR', areaId: 'AR-01',
    model: 'Atlas EZO-pH', status: 'online', battery: 94, signal: 'LoRaWAN 98%', firmware: 'v2.4.1',
    installedAt: '2026-02-12', lastCalibration: '2026-03-01',
    description: 'Elektroda pH tahan air untuk mengukur keasaman air kolam nila.',
    functions: ['Mengukur pH air kolam tiap 60 detik', 'Memicu alarm bila pH < 6.2 atau > 7.2', 'Mencatat tren pH untuk kalibrasi terjadwal'],
    metric: { key: 'ph', value: 6.8 },
  },
  {
    id: 'IOT-002', code: 'AQ-DO-002', name: 'DO Probe Kolam Nila A', categoryId: 'CAT-AIR', areaId: 'AR-01',
    model: 'DFRobot SEN0237', status: 'online', battery: 88, signal: 'LoRaWAN 95%', firmware: 'v2.4.1',
    installedAt: '2026-02-12', lastCalibration: '2026-02-24',
    description: 'Sensor oksigen terlarut untuk memastikan ikan nila tidak kekurangan oksigen.',
    functions: ['Membaca DO dalam mg/L', 'Menyalakan aerator cadangan bila DO < 5 mg/L', 'Kirim peringatan dini ke dashboard'],
    metric: { key: 'do', value: 6.9 },
  },
  {
    id: 'IOT-003', code: 'AQ-TMP-003', name: 'Suhu Air Kolam Nila A', categoryId: 'CAT-AIR', areaId: 'AR-01',
    model: 'DS18B20 Waterproof', status: 'online', battery: 99, signal: 'WiFi -58 dBm', firmware: 'v1.9.0',
    installedAt: '2026-01-15', lastCalibration: '2026-01-15',
    description: 'Probe suhu air celup untuk memantau stabilitas termal kolam.',
    functions: ['Mengukur suhu air 0–50 °C', 'Menampilkan grafik suhu harian', 'Deteksi lonjakan suhu mendadak'],
    metric: { key: 'temp', value: 25.8 },
  },
  {
    id: 'IOT-004', code: 'AQ-TDS-004', name: 'TDS/EC Tandon Nutrisi', categoryId: 'CAT-AIR', areaId: 'AR-04',
    model: 'Gravity TDS V1.0', status: 'online', battery: 90, signal: 'LoRaWAN 92%', firmware: 'v2.2.0',
    installedAt: '2026-02-20', lastCalibration: '2026-03-01',
    description: 'Mengukur total padatan terlarut dan konduktivitas nutrisi di tandon.',
    functions: ['Baca TDS/EC larutan nutrisi', 'Basis perhitungan dosis A/B otomatis', 'Peringatan larutan terlalu pekat'],
    metric: { key: 'tds', value: 780 },
  },
  {
    id: 'IOT-005', code: 'AQ-TRB-005', name: 'Turbidity Kolam Lele B', categoryId: 'CAT-AIR', areaId: 'AR-02',
    model: 'TS-300B', status: 'online', battery: 71, signal: 'LoRaWAN 84%', firmware: 'v2.2.0',
    installedAt: '2026-02-22', lastCalibration: '2026-02-22',
    description: 'Sensor kekeruhan air untuk memantau partikel organik di kolam lele.',
    functions: ['Ukur kekeruhan NTU', 'Indikator kebutuhan siphon dasar kolam', 'Tren kualitas air mingguan'],
    metric: { key: 'turbidity', value: 18.4 },
  },
  {
    id: 'IOT-006', code: 'AQ-DHT-006', name: 'Iklim Growbed Sayur 1', categoryId: 'CAT-ENV', areaId: 'AR-03',
    model: 'DHT22 Shield', status: 'online', battery: 82, signal: 'WiFi -61 dBm', firmware: 'v1.8.3',
    installedAt: '2026-02-10', lastCalibration: '2026-02-10',
    description: 'Sensor suhu dan kelembapan udara di atas bedengan sayur.',
    functions: ['Baca suhu udara & RH', 'Deteksi risiko jamur daun', 'Kendali kipas ventilasi otomatis'],
    metric: { key: 'airTemp', value: 29.1 },
  },
  {
    id: 'IOT-007', code: 'AQ-LUX-007', name: 'Cahaya Growbed Sayur 1', categoryId: 'CAT-ENV', areaId: 'AR-03',
    model: 'BH1750', status: 'online', battery: 95, signal: 'WiFi -55 dBm', firmware: 'v1.8.3',
    installedAt: '2026-02-10', lastCalibration: '2026-02-10',
    description: 'Sensor intensitas cahaya untuk memastikan sayur mendapat radiasi cukup.',
    functions: ['Ukur lux & estimasi PAR', 'Peringatan bila kurang cahaya > 6 jam', 'Dasar jadwal lampu tanam'],
    metric: { key: 'lux', value: 28500 },
  },
  {
    id: 'IOT-008', code: 'AQ-PMP-008', name: 'Smart Pump Controller Tandon', categoryId: 'CAT-AKT', areaId: 'AR-04',
    model: 'Sonoff TH Elite', status: 'online', battery: 100, signal: 'WiFi -49 dBm', firmware: 'v3.0.2',
    installedAt: '2026-01-28', lastCalibration: '2026-01-28',
    description: 'Pengendali pompa sirkulasi utama antara tandon dan growbed.',
    functions: ['On/off pompa sesuai jadwal', 'Ukur debit L/min', 'Matikan otomatis bila tandon low'],
    metric: { key: 'flow', value: 16.4 },
  },
  {
    id: 'IOT-009', code: 'AQ-AER-009', name: 'Aerator Controller Kolam Nila A', categoryId: 'CAT-AKT', areaId: 'AR-01',
    model: 'Shelly Plus 1PM', status: 'warning', battery: 63, signal: 'WiFi -67 dBm', firmware: 'v2.9.0',
    installedAt: '2026-01-30', lastCalibration: '2026-01-30',
    description: 'Pengendali aerator venturi dengan pemantauan jam operasi.',
    functions: ['Aktifkan aerator berdasarkan DO', 'Catat jam operasi & daya', 'Alarm bila aerator mati > 5 menit'],
    metric: { key: 'runtime', value: 21.5 },
  },
  {
    id: 'IOT-010', code: 'AQ-PH-010', name: 'pH Probe Kolam Lele B', categoryId: 'CAT-AIR', areaId: 'AR-02',
    model: 'Atlas EZO-pH', status: 'maintenance', battery: 24, signal: 'LoRaWAN 42%', firmware: 'v2.1.0',
    installedAt: '2026-02-05', lastCalibration: '2026-01-18',
    description: 'Elektroda pH kolam lele — sedang menunggu kalibrasi ulang.',
    functions: ['Mengukur pH kolam lele', 'Peringatan drift elektroda', 'Riwayat kalibrasi tersimpan'],
    metric: { key: 'ph', value: 7.9 },
  },
];

// ── Pengguna (untuk kelola user oleh admin) ────────────────────────────────────
// ── Akun demo (login) ─────────────────────────────────────────────────────────
// CATATAN PENTING: password di bawah ini HANYA untuk demo di browser.
// Belum ada backend, jadi akun & password tersimpan apa adanya di localStorage —
// jangan dipakai untuk data sungguhan sebelum server autentikasi dibuat.
export const DEMO_PASSWORD = 'jagofarm123';

export const SEED_USERS = [
  {
    id: 'U-001', name: 'Budi Santoso', email: 'budi@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-01', 'AR-03'], status: 'aktif', joinedAt: '2026-01-12', points: 1240,
    phone: '0812-3456-7890', jabatan: 'Operator Kolam', bio: 'Mengurus kolam nila dan pakcoy sejak 2026.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  },
  {
    id: 'U-002', name: 'Siti Rahmawati', email: 'siti@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-02'], status: 'aktif', joinedAt: '2026-01-20', points: 980,
    phone: '0813-2233-4455', jabatan: 'Operator Growbed', bio: 'Fokus pada sayuran daun dan kualitas air.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
  },
  {
    id: 'U-003', name: 'Agus Priyanto', email: 'agus@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-03'], status: 'nonaktif', joinedAt: '2026-02-02', points: 410,
    phone: '0857-9988-7766', jabatan: 'Operator Tandon', bio: 'Menangani tandon dan pompa.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  },
  {
    id: 'U-004', name: 'Hendra Wicaksono', email: 'hendra@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengelola', areaIds: [], status: 'aktif', joinedAt: '2026-01-01', points: 0,
    phone: '0811-1122-3344', jabatan: 'Pengelola Farm', bio: 'Mengelola perangkat IoT dan data seluruh area.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  },
];

// ── Virtual Pet ────────────────────────────────────────────────────────────────
export const SEED_PET = {
  species: 'Ikan Nila',
  name: 'Nila Ku',
  stage: 'Benih', // Benih → Nener → Nila Muda → Nila Dewasa → Nila Juara
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
  log: [
    { id: 'P-1', at: '2026-03-07 08:10', text: 'Pet diberi pakan pelet — nafsu makan baik.', delta: '+8 xp' },
    { id: 'P-2', at: '2026-03-07 15:40', text: 'Air kolam Prima — kebersihan pet naik.', delta: '+5 xp' },
  ],
};

export const PET_STAGES = ['Benih', 'Nener', 'Nila Muda', 'Nila Dewasa', 'Nila Juara'];

// ── Sistem Point & Gamifikasi ─────────────────────────────────────────────────
export const SEED_POINT_RULES = [
  { id: 'R-1', activity: 'Isi data HPP area', points: 25, daily: 2, active: true },
  { id: 'R-2', activity: 'Catat pemantauan kolam', points: 15, daily: 4, active: true },
  { id: 'R-3', activity: 'Tuntaskan misi harian', points: 40, daily: 1, active: true },
  { id: 'R-4', activity: 'Pelihara virtual pet', points: 10, daily: 3, active: true },
  { id: 'R-5', activity: 'Laporkan anomali sensor', points: 30, daily: 5, active: true },
  { id: 'R-6', activity: 'Panen tercatat', points: 100, daily: 1, active: true },
];

export const SEED_BADGES = [
  { id: 'B-1', name: 'Peternak Tekun', icon: 'potted_plant', minPoints: 200, desc: 'Kumpulkan 200 point' },
  { id: 'B-2', name: 'Ahli Kualitas Air', icon: 'water_drop', minPoints: 750, desc: 'Kumpulkan 750 point' },
  { id: 'B-3', name: 'Sensor Whisperer', icon: 'sensors', minPoints: 1500, desc: 'Kumpulkan 1.500 point' },
  { id: 'B-4', name: 'Master Akuaponik', icon: 'emoji_events', minPoints: 3000, desc: 'Kumpulkan 3.000 point' },
];

export const SEED_MISSIONS = [
  { id: 'M-1', title: 'Cek pH & DO pagi', points: 15, target: 'catat-minimal-2-parameter', done: false },
  { id: 'M-2', title: 'Lengkapi HPP satu kolam', points: 25, target: 'isi-1-item-hpp', done: false },
  { id: 'M-3', title: 'Beri pakan virtual pet', points: 10, target: 'feed-pet', done: false },
  { id: 'M-4', title: 'Baca ensiklopedia aquaponik', points: 10, target: 'buka-chatbot-1x', done: false },
];

export const SEED_LEADERBOARD = [
  { id: 'U-001', name: 'Budi Santoso', points: 1240, area: 'Kolam Nila A' },
  { id: 'U-002', name: 'Siti Rahmawati', points: 980, area: 'Kolam Lele B' },
  { id: 'U-005', name: 'Rina Kartika', points: 875, area: 'Growbed Sayur 1' },
  { id: 'U-003', name: 'Agus Priyanto', points: 410, area: 'Growbed Sayur 1' },
];

// ── Basis pengetahuan chatbot ─────────────────────────────────────────────────
export const KNOWLEDGE = [
  {
    tags: ['ph', 'derajat keasaman', 'asam', 'basa', 'keasaman'],
    answer: 'pH ideal air aquaponik ada di 6,5–7,5 (sayur 6,2–7,0). Di bawah 6,2 nitrifikasi bakteri melambat dan amonia menumpuk; di atas 7,8 unsur hara seperti besi dan mangan tidak bisa diserap akar. Turunkan pH dengan pH down (asam fosfat) sedikit demi sedikit, naikkan dengan kalium bikarbonat. Lakukan pagi hari, tunggu 30 menit sebelum mengukur ulang.',
  },
  {
    tags: ['amonia', 'nh3', 'nitrit', 'nitrat', 'siklus nitrogen', 'nitrifikasi'],
    answer: 'Amonia (NH3) hasil sisa pakan dan kotoran ikan sangat toksik — jaga di bawah 0,25 mg/L. Bakteri Nitrosomonas mengubahnya jadi nitrit (NO2, toksik, target < 0,5 mg/L), lalu Nitrobacter mengubah nitrit jadi nitrat (NO3) yang justru nutrisi favorit sayur (target 20–80 mg/L). Siklus lengkap biasanya butuh 4–6 minggu. Aerasi kuat, jangan cuci biofilter dengan air klorin, dan tambah inokulan bakteri bila siklus crash.',
  },
  {
    tags: ['oksigen', 'do', 'aerasi', 'aerator', 'nafas'],
    answer: 'Oksigen terlarut (DO) untuk ikan nila aman di 5–8 mg/L; lele tahan sampai 4 mg/L tapi pertumbuhannya menurun. DO paling rendah menjelang subuh (04.00–06.00) karena tidak ada fotosintesis. Solusi: nyalakan aerator venturi/air stone 24 jam, tambah aliran cascade dari growbed, dan hindari overfeeding yang memicu dekomposisi.',
  },
  {
    tags: ['suhu', 'temperatur', 'panas', 'dingin', 'hujan'],
    answer: 'Suhu air ideal nila 25–29 °C, lele 26–30 °C, sayur kangkung/pakcoy nyaman 20–28 °C. Suhu naik mempercepat metabolisme ikan tapi menekan DO — naikkan aerasi saat siang terik. Suhu turun drastis setelah hujan bisa menekan nafsu makan; tutup kolam sebagian atau tambah kedalaman air minimal 80 cm.',
  },
  {
    tags: ['pakan', 'feed', 'overfeeding', 'pelet', 'kuantitas pakan'],
    answer: 'Beri pakan 3–5% dari biomassa per hari, dibagi 2–3 kali (pagi & sore). Overfeeding adalah penyebab utama amonia naik dan air keruh. Contoh: 500 ekor nila dengan bobot rata-rata 50 g = 25 kg biomassa, diberi 750 g–1.250 g pelet per hari. Kurangi 30% saat hujan atau suhu turun. Selalu buang pakan yang tidak habis dalam 10 menit.',
  },
  {
    tags: ['kangkung', 'pakcoy', 'sawi', 'selada', 'sayur', 'tanaman'],
    answer: 'Kangkung adalah sayur aquaponik paling toleran (panen 21–30 hari setelah semai, bisa dipotong ulang 2–3 kali). Pakcoy dan selada butuh EC 1,4–2,2 mS/cm dan cahaya 12.000–40.000 lux. Untuk rasio kolam:growbed pemula, 1 m² growbed dapat menyerap limbah dari 25–40 ekor ikan nila ukuran 50–100 g. Cek kekurangan nutrisi dari warna daun: kuning tua di bawah = kurang cahaya, kuning antar tulang daun = kurang magnesium/besi.',
  },
  {
    tags: ['ec', 'tds', 'nutrisi', 'ppm', 'konduktivitas'],
    answer: 'EC (mS/cm) mengukur kepekatan larutan nutrisi; TDS (ppm) = EC × 500–700 tergantung konversi alat. Target aquaponik: sayur daun 1,4–2,2 mS/cm (700–1.100 ppm), tomat/cabai 2,0–3,0. EC terlalu tinggi membuat akar "terbakar" dan mengganggu penyerapan air; terlalu rendah membuat sayur kerdil. Encerkan dengan air bersih bila terlalu pekat, tambah nutrisi A/B bila terlalu rendah.',
  },
  {
    tags: ['hpp', 'harga pokok', 'biaya', 'untung', 'laba', 'ekonomi'],
    answer: 'HPP (Harga Pokok Produksi) = total biaya langsung ÷ jumlah produksi. Di menu Kelola Area, masukkan setiap item (benih, pakan, listrik, tenaga kerja) dengan kuantitas dan harga satuan — sistem menjumlahkannya otomatis. Contoh Kolam Nila A: benih 500 × Rp1.200 = Rp600.000, pakan 50 kg × Rp13.500 = Rp675.000, jadi HPP per ekor = total ÷ 500. Bandingkan dengan harga jual untuk melihat margin sebelum panen, bukan setelah.',
  },
  {
    tags: ['iot', 'sensor', 'perangkat', 'kalibrasi', 'alat'],
    answer: 'Sensor air utama: pH probe, DO probe, suhu DS18B20, TDS/EC, dan turbidity. Kalibrasi pH tiap 2–4 minggu dengan buffer 4,0 dan 7,0; probe DO dikalibrasi di air jenuh oksigen. Bersihkan ujung probe dari biofilm seminggu sekali — biofilm adalah penyebab drift tersembunyi. Setiap perangkat di dashboard punya halaman detail berisi fungsi, baterai, sinyal, dan tanggal kalibrasi terakhir.',
  },
  {
    tags: ['aquaponik', 'apa itu', 'definisi', 'cara kerja'],
    answer: 'Aquaponik adalah simbiosis tiga pihak: ikan menghasilkan limbah kaya amonia, bakteri nitrifikasi mengubahnya jadi nitrat, lalu tanaman sayur menyerap nitrat itu sehingga air kembali bersih untuk ikan. Karena air berputar terus, konsumsi air 90–95% lebih hemat daripada budidaya konvensional, dan Anda memanen dua produk sekaligus (ikan + sayur) dari satu sistem.',
  },
  {
    tags: ['hama', 'penyakit', 'jamur', 'daun kuning', 'kutu'],
    answer: 'Hindari pestisida kimia — sedikit saja bisa mematikan ikan. Untuk kutu daun: semprot air sabun kalium atau minyak neem di sore hari. Jamur daun muncul saat RH > 85% dan sirkulasi lemah: perbaiki ventilasi, kurangi jarak tanam, siram hanya di pangkal. Daun menguning bisa karena kekurangan nitrat (EC rendah), besi (pH > 7,5), atau akar busuk akibat aerasi kurang.',
  },
  {
    tags: ['v-pet', 'virtual pet', 'gamifikasi', 'point', 'level'],
    answer: 'Virtual Pet adalah hewan peliharaan digital di dashboard: setiap kali Anda mencatat pemantauan, mengisi HPP, atau menjaga kualitas air, kondisi pet (kenyang, kebahagiaan, kebersihan) naik dan Anda menerima point. Point menaikkan level pet dari Benih sampai Nila Juara dan membuka badge seperti "Ahli Kualitas Air". Semakin rajin pet dipelihara, semakin tinggi posisi Anda di papan peringkat.',
  },
];

export const CHAT_SUGGESTIONS = [
  'Berapa pH ideal air aquaponik?',
  'Bagaimana cara menurunkan amonia?',
  'Berapa takaran pakan ikan nila?',
  'Sayur apa yang cocok untuk pemula?',
  'Bagaimana cara hitung HPP kolam?',
];
