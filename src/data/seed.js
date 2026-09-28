// Seed data SmartDashboard AquaSmartponik — sistem aquaponik berbasis IoT

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
    deviceIds: ['IOT-001', 'IOT-002', 'IOT-003'],
    targets: { ph: [6.5, 7.5], temp: [25, 29], tds: [500, 900] },
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
    deviceIds: [],
    targets: { ph: [6.5, 8.0], temp: [26, 30], tds: [500, 900] },
    note: 'Padat tebar tinggi, belum dipasang sensor — jaga sirkulasi air dan cek pH manual.',
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
    deviceIds: [],
    targets: { ph: [6.2, 7.0], temp: [24, 30], tds: [600, 1000] },
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
    deviceIds: [],
    targets: { ph: [6.0, 7.0], temp: [24, 30], tds: [500, 900] },
    note: 'Pusat dosing nutrisi A/B dan penstabil pH.',
    hpp: [
      { id: 'H-12', name: 'Nutrisi hidroponik A/B', qty: 10, unit: 'liter', unitPrice: 38000 },
      { id: 'H-13', name: 'pH up/down', qty: 2, unit: 'liter', unitPrice: 42000 },
      { id: 'H-14', name: 'Filter pasir + cartridge', qty: 1, unit: 'set', unitPrice: 275000 },
    ],
  },
];

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

// ── Pengguna (untuk kelola user oleh admin) ────────────────────────────────────
// ── Akun demo (login) ─────────────────────────────────────────────────────────
// CATATAN PENTING: password di bawah ini HANYA untuk demo di browser.
// Belum ada backend, jadi akun & password tersimpan apa adanya di localStorage —
// jangan dipakai untuk data sungguhan sebelum server autentikasi dibuat.
export const DEMO_PASSWORD = 'jagofarm123';

// Pilihan foto profil dipakai di dua tempat: halaman Daftar (akun baru) dan
// halaman Profil. Ditaruh di seed supaya daftarnya tidak ditulis dua kali dan
// tidak bisa berbeda antar halaman.
export const AVATAR_PILIHAN = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=250',
];

// Status akun. 'menunggu' dipakai untuk pendaftar PENGELOLA: hak akses
// pengelola tidak diberikan otomatis dari formulir publik — harus disetujui
// pengelola yang sudah ada. Pendaftar pengguna langsung 'aktif' karena hanya
// mendapat akses ke area yang ditugaskan (belum ada area = belum ada data).
export const STATUS_AKUN = {
  aktif: 'Aktif',
  menunggu: 'Menunggu persetujuan',
  nonaktif: 'Nonaktif',
};

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
  { id: 'M-1', title: 'Cek pH, suhu & TDS pagi', points: 15, target: 'catat-minimal-2-parameter', done: false },
  { id: 'M-2', title: 'Lengkapi HPP satu kolam', points: 25, target: 'isi-1-item-hpp', done: false },
  { id: 'M-3', title: 'Beri pakan virtual pet', points: 10, target: 'feed-pet', done: false },
  { id: 'M-4', title: 'Baca ensiklopedia aquaponik', points: 10, target: 'buka-chatbot-1x', done: false },
];

// Catatan: TIDAK ADA const SEED_LEADERBOARD di sini. Papan peringkat diturunkan
// dari SEED_USERS (lihat derived.leaderboard di SmartStore). Daftar terpisah dulu
// membuat poin hasil aktivitas pengguna tidak muncul di papan peringkat pengelola,
// dan memuat akun hantu 'Rina Kartika' yang tidak terdaftar sebagai pengguna.

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
    answer: 'Oksigen terlarut (DO) untuk ikan nila aman di 5–8 mg/L; lele tahan sampai 4 mg/L tapi pertumbuhannya menurun. DO paling rendah menjelang subuh (04.00–06.00) karena tidak ada fotosintesis. Solusi: nyalakan aerator venturi/air stone 24 jam, tambah aliran cascade dari growbed, dan hindari overfeeding yang memicu dekomposisi. Catatan alat: sensor DO belum terpasang di farm ini — pantau DO secara manual dengan test kit, atau nilai dari gejala ikan (mengapung ke permukaan pagi hari = DO rendah).',
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
    answer: 'TDS (ppm) mengukur kepekatan padatan terlarut alias kandungan nutrisi & mineral air; EC (mS/cm) mengukurnya sebagai konduktivitas, dan TDS ≈ EC × 500–700 tergantung alat. Target aquaponik: sayur daun 700–1.100 ppm, tomat/cabai 1.000–1.500 ppm. Kepekatan terlalu tinggi membuat akar "terbakar" dan mengganggu penyerapan air; terlalu rendah membuat sayur kerdil. Encerkan dengan air bersih bila terlalu pekat, tambah nutrisi A/B bila terlalu rendah. Sensor TDS di farm ini membaca ppm langsung, jadi bandingkan dengan ambang 400–900 ppm.',
  },
  {
    tags: ['hpp', 'harga pokok', 'biaya', 'untung', 'laba', 'ekonomi'],
    answer: 'HPP (Harga Pokok Produksi) = total biaya langsung ÷ jumlah produksi. Di menu Kelola Area, masukkan setiap item (benih, pakan, listrik, tenaga kerja) dengan kuantitas dan harga satuan — sistem menjumlahkannya otomatis. Contoh Kolam Nila A: benih 500 × Rp1.200 = Rp600.000, pakan 50 kg × Rp13.500 = Rp675.000, jadi HPP per ekor = total ÷ 500. Bandingkan dengan harga jual untuk melihat margin sebelum panen, bukan setelah.',
  },
  {
    tags: ['iot', 'sensor', 'perangkat', 'kalibrasi', 'alat'],
    answer: 'Farm ini punya tiga sensor kualitas air: pH probe (mengukur keasaman, ambang 6,2–7,6), probe suhu air DS18B20 (24–30 °C), dan sensor TDS/EC (400–900 ppm nutrisi). Kalibrasi pH tiap 2–4 minggu dengan buffer 4,0 dan 7,0; probe TDS dikalibrasi dengan larutan standar 707 ppm atau 1.413 ppm; probe suhu umumnya tidak perlu dikalibrasi berkala. Bersihkan ujung probe dari biofilm seminggu sekali — biofilm adalah penyebab drift tersembunyi. Setiap perangkat di dashboard punya halaman detail berisi fungsi, baterai, sinyal, dan tanggal kalibrasi terakhir.',
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
