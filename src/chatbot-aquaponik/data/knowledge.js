// ── Basis pengetahuan chatbot ─────────────────────────────────────────────────
export const KNOWLEDGE = [
  {
    tags: ['ph', 'derajat keasaman', 'asam', 'basa', 'keasaman'],
    answer: 'pH ideal air aquaponik ada di 6,5–7,5 (sayur 6,2–7,0). Di bawah 6,2 nitrifikasi bakteri melambat dan amonia menumpuk; di atas 7,8 unsur hara seperti besi dan mangan tidak bisa diserap akar. Turunkan pH dengan pH down (asam fosfat) sedikit demi sedikit, naikkan dengan kalium bikarbonat. Lakukan pagi hari, tunggu 30 menit sebelum mengukur ulang.',
  },
  {
    tags: ['amonia', 'nh3', 'nitrit', 'nitrat', 'siklus nitrogen', 'nitrifikasi'],
    answer: 'Amonia (NH3) hasil sisa pakan dan kotoran ikan sangat toksik, jadi jaga di bawah 0,25 mg/L. Bakteri Nitrosomonas mengubahnya jadi nitrit (NO2, toksik, target < 0,5 mg/L), lalu Nitrobacter mengubah nitrit jadi nitrat (NO3) yang justru nutrisi favorit sayur (target 20–80 mg/L). Siklus lengkap biasanya butuh 4–6 minggu. Aerasi kuat, jangan cuci biofilter dengan air klorin, dan tambah inokulan bakteri bila siklus crash.',
  },
  {
    tags: ['oksigen', 'do', 'aerasi', 'aerator', 'nafas'],
    answer: 'Oksigen terlarut (DO) untuk ikan nila aman di 5–8 mg/L; lele tahan sampai 4 mg/L tapi pertumbuhannya menurun. DO paling rendah menjelang subuh (04.00–06.00) karena tidak ada fotosintesis. Solusi: nyalakan aerator venturi/air stone 24 jam, tambah aliran cascade dari growbed, dan hindari overfeeding yang memicu dekomposisi. Catatan alat: sensor DO belum terpasang di farm ini, jadi pantau DO secara manual dengan test kit, atau nilai dari gejala ikan (mengapung ke permukaan pagi hari = DO rendah).',
  },
  {
    tags: ['suhu', 'temperatur', 'panas', 'dingin', 'hujan'],
    answer: 'Suhu air ideal nila 25–29 °C, lele 26–30 °C, sayur kangkung/pakcoy nyaman 20–28 °C. Suhu naik mempercepat metabolisme ikan tapi menekan DO, jadi naikkan aerasi saat siang terik. Suhu turun drastis setelah hujan bisa menekan nafsu makan; tutup kolam sebagian atau tambah kedalaman air minimal 80 cm.',
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
    answer: 'HPP (Harga Pokok Produksi) = total biaya langsung ÷ jumlah produksi. Di menu Kelola Area, masukkan setiap item (benih, pakan, listrik, tenaga kerja) dengan kuantitas dan harga satuan, lalu sistem menjumlahkannya otomatis. Contoh Kolam Nila A: benih 500 × Rp1.200 = Rp600.000, pakan 50 kg × Rp13.500 = Rp675.000, jadi HPP per ekor = total ÷ 500. Bandingkan dengan harga jual untuk melihat margin sebelum panen, bukan setelah.',
  },
  {
    tags: ['iot', 'sensor', 'perangkat', 'kalibrasi', 'alat'],
    answer: 'Farm ini punya tiga sensor kualitas air: pH probe (mengukur keasaman, ambang 6,2–7,6), probe suhu air DS18B20 (24–30 °C), dan sensor TDS/EC (400–900 ppm nutrisi). Kalibrasi pH tiap 2–4 minggu dengan buffer 4,0 dan 7,0; probe TDS dikalibrasi dengan larutan standar 707 ppm atau 1.413 ppm; probe suhu umumnya tidak perlu dikalibrasi berkala. Bersihkan ujung probe dari biofilm seminggu sekali, karena biofilm adalah penyebab drift tersembunyi. Setiap perangkat di dashboard punya halaman detail berisi fungsi, baterai, sinyal, dan tanggal kalibrasi terakhir.',
  },
  {
    tags: ['aquaponik', 'apa itu', 'definisi', 'cara kerja'],
    answer: 'Aquaponik adalah simbiosis tiga pihak: ikan menghasilkan limbah kaya amonia, bakteri nitrifikasi mengubahnya jadi nitrat, lalu tanaman sayur menyerap nitrat itu sehingga air kembali bersih untuk ikan. Karena air berputar terus, konsumsi air 90–95% lebih hemat daripada budidaya konvensional, dan Anda memanen dua produk sekaligus (ikan + sayur) dari satu sistem.',
  },
  {
    tags: ['hama', 'penyakit', 'jamur', 'daun kuning', 'kutu'],
    answer: 'Hindari pestisida kimia, sedikit saja bisa mematikan ikan. Untuk kutu daun: semprot air sabun kalium atau minyak neem di sore hari. Jamur daun muncul saat RH > 85% dan sirkulasi lemah: perbaiki ventilasi, kurangi jarak tanam, siram hanya di pangkal. Daun menguning bisa karena kekurangan nitrat (EC rendah), besi (pH > 7,5), atau akar busuk akibat aerasi kurang.',
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
