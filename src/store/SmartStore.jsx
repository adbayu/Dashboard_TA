import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AVATAR_PILIHAN,
  AVATAR_LAMA,
  DEMO_PASSWORD,
  SEED_AREAS,
  SEED_BADGES,
  SEED_CATEGORIES,
  SEED_DEVICES,
  SEED_MISSIONS,
  SEED_POINT_RULES,
  SEED_PETS,
  SEED_USERS,
  STATUS_AKUN,
} from '../data/seed';
import { progressPetFromCare } from '../data/petProgress';
import { normalizeFishCount, recordDailyMortality, setFishPopulation } from '../data/fishPopulation';
import { createPetRecord, normalizePetCollection, patchPetCollection, selectPet } from './petModel';

const KEY = 'aquasmart_smart_v1';
const SmartCtx = createContext(null);

export const useSmart = () => {
  const ctx = useContext(SmartCtx);
  if (!ctx) throw new Error('useSmart harus dipakai di dalam <SmartProvider>');
  return ctx;
};

// Pembeda nilai sensor: tiap device punya rentang wajar sendiri.
// Diekspor karena formulir pengelola memakainya sebagai nilai usulan ambang,
// supaya angka di UI tidak lagi ditulis ulang di banyak tempat.
export const METRIC_RANGE = {
  ph: [6.2, 7.6, 2],
  temp: [23.5, 30.5, 1],
  tds: [520, 980, 0],
};

// Tiga parameter yang benar-benar diukur sensor (pH, suhu air, TDS).
// Dipakai untuk kartu telemetri, statistik harian, dan form pemantauan manual.
export const METRIC_META = {
  ph: { label: 'pH Air', unit: 'pH', icon: 'science', precision: 2 },
  temp: { label: 'Suhu Air', unit: '°C', icon: 'device_thermostat', precision: 1 },
  tds: { label: 'TDS Nutrisi', unit: 'ppm', icon: 'water_ec', precision: 0 },
};
export const METRIC_KEYS = ['ph', 'temp', 'tds'];

// Satu-satunya sumber ambang ideal di seluruh aplikasi.
// Urutan prioritas: ambang khusus area (area.targets) → ambang kategori device
// yang diatur pengelola → tidak ada ambang. Sebelumnya Dashboard punya daftar
// AMBANG_TELEMETRI sendiri, List IoT memakai metrik kategori, dan statistik
// harian memakai area.targets — sehingga satu pembacaan yang sama bisa berlabel
// "Ideal" di satu halaman dan "Keluar ambang" di halaman lain.
export function ambangUntuk(area, kategori, key) {
  const khusus = area?.targets?.[key];
  if (Array.isArray(khusus) && khusus.length === 2) return khusus;
  const dariKategori = kategori?.metrics?.find((m) => m.key === key);
  if (dariKategori) return [Number(dariKategori.min), Number(dariKategori.max)];
  return null;
}

// Penilaian satu nilai terhadap ambang. Dipakai kartu telemetri, List IoT, dan
// ringkasan statistik supaya bahasanya seragam.
export function nilaiTerhadapAmbang(value, ambang) {
  if (value == null || !ambang) return null;
  const [min, max] = ambang;
  if (value < min) return 'bawah';
  if (value > max) return 'atas';
  return 'dalam';
}

// Isi QR alat. SATU tempat saja supaya halaman Kelola IoT dan List IoT tidak
// mencetak format berbeda untuk alat yang sama. Bentuk "JAGOFARM|<kode>|<id>"
// dikenali pemindai di halaman Detail Information (dan URL /iot/:id tetap bisa
// dibaca, jadi label lama yang sudah ditempel tidak perlu dicetak ulang).
export const ambilKodeAlat = (device) =>
  device ? `JAGOFARM|${device.code}|${device.id}` : '';

const hariKey = (date = new Date()) =>
  new Date(date).toLocaleDateString('en-CA'); // YYYY-MM-DD waktu lokal

// Label tanggal Indonesia: "Sen, 27 Sep 2026". Dipakai histori harian supaya
// tanggal, bulan, dan tahunnya terbaca jelas — bukan "2026-09-27".
export const labelTanggal = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()];
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
  return `${hari}, ${d.getDate()} ${bulan} ${d.getFullYear()}`;
};

// Daftar tanggal mundur dari hari ini: [hari ini, kemarin, ...] sepanjang n hari.
export function tanggalMundur(n = 7, dari = hariKey()) {
  const dasar = new Date(`${dari}T00:00:00`);
  const keluar = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(dasar);
    d.setDate(dasar.getDate() - i);
    keluar.push(hariKey(d));
  }
  return keluar;
}

// Statistik harian kolam: min / rata-rata / maks per parameter untuk satu hari,
// dihitung dari riwayat pembacaan sensor. Mengembalikan null bila belum ada
// pembacaan sama sekali, supaya UI bisa jujur menampilkan "belum ada data"
// alih-alih angka nol yang menyesatkan.
export function statistikHarian(riwayat, areaId, tanggal = hariKey()) {
  const baris = (riwayat || []).filter((r) => r.areaId === areaId && (r.tanggal || hariKey(r.at)) === tanggal);
  // Pembacaan TERAKHIR = jam paling besar, bukan elemen terakhir array. Riwayat
  // harian dibuat mundur dari jam sekarang, jadi elemen terakhir justru yang
  // paling AWAL (00:00-an) dan label "terakhir" akan menyesatkan bila dipakai.
  const jamTerakhir = baris.reduce((maks, r) => (r.jam && r.jam > (maks || '') ? r.jam : maks), null);
  const hasil = { tanggal, jumlah: baris.length, jam: jamTerakhir };
  for (const key of METRIC_KEYS) {
    const nilai = baris
      .map((r) => Number(r.readings?.[key]))
      .filter((v) => Number.isFinite(v));
    hasil[key] = nilai.length
      ? {
          min: Math.min(...nilai),
          max: Math.max(...nilai),
          avg: nilai.reduce((a, b) => a + b, 0) / nilai.length,
          n: nilai.length,
        }
      : null;
  }
  return hasil;
}

// Riwayat pembacaan sensor untuk SATU hari berjalan, dibuat sekali saat app
// dimuat: satu titik tiap 30 menit sejak 00:00 sampai jam sekarang. Polanya
// mengikuti perilaku kolam yang wajar supaya statistik harian punya arti:
// - pH naik siang hari (fotosintesis menyerap CO2), terendah menjelang subuh
// - suhu air terendah ~05:00 dan tertinggi ~15:00
// - TDS relatif stabil, sedikit turun setelah pemberian pakan
// Hanya area yang BENAR-BENAR punya sensor yang dapat riwayat; area tanpa
// sensor dibiarkan kosong agar dashboard jujur menampilkan "belum ada data".
const DUA_PI = Math.PI * 2;
const bulat = (v, digit) => Number(v.toFixed(digit));
// clamp HARUS berada di atas DEFAULT_STATE: riwayat harian dibuat saat modul
// diinisialisasi, jadi `const` yang dideklarasikan di bawah akan kena TDZ
// ("Cannot access before initialization") dan seluruh app gagal render.
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Angka 0..1 yang STABIL untuk sebuah teks. Dipakai sebagai benih selisih
// harian: hari yang berbeda menghasilkan angka berbeda, tetapi nilainya tidak
// berubah saat halaman dimuat ulang (bukan Math.random, yang akan membuat
// histori berubah-ubah tiap refresh).
const benihAngka = (teks) => {
  let h = 2166136261;
  for (let i = 0; i < teks.length; i++) h = ((h ^ teks.charCodeAt(i)) * 16777619) >>> 0;
  return (h % 1000) / 1000;
};

// Jumlah hari yang disiapkan untuk histori harian (hari ini + 13 hari ke belakang).
// Dipakai saat membangun riwayat awal & saat melengkapi localStorage lama.
const HARI_HISTORI = 14;

// Riwayat pembacaan sensor untuk SATU tanggal, titik tiap 30 menit.
// - Hari ini  : hanya sampai jam sekarang.
// - Hari lewat : penuh 00:00 sampai 23:30 (48 titik).
// Polanya mengikuti perilaku kolam yang wajar: pH naik siang hari (fotosintesis
// menyerap CO2) dan terendah menjelang subuh, suhu air terendah ~05:00 dan
// tertinggi ~15:00, TDS stabil dengan sedikit penurunan setelah pemberian pakan.
// Selisih antar hari dibangkitkan dari benih tanggal supaya tiap hari punya
// karakter sendiri namun tetap konsisten.
function buatRiwayatTanggal(devices, tanggal = hariKey()) {
  const dasarPerArea = new Map();
  for (const device of devices || []) {
    if (!device.areaId || !device.metric || !METRIC_KEYS.includes(device.metric.key)) continue;
    if (!dasarPerArea.has(device.areaId)) dasarPerArea.set(device.areaId, {});
    dasarPerArea.get(device.areaId)[device.metric.key] = Number(device.metric.value);
  }

  const hariIni = tanggal === hariKey();
  const sekarang = new Date();
  const menitAkhir = hariIni ? sekarang.getHours() * 60 + sekarang.getMinutes() : 23 * 60 + 30;
  const baris = [];

  for (const [areaId, dasar] of dasarPerArea) {
    // -1..+1, stabil per (tanggal, area): beberapa hari lebih hangat/lebih pekat.
    const selisihHari = (benihAngka(`${tanggal}|${areaId}`) - 0.5) * 2;

    // Titik terakhir tepat di waktu sekarang (atau 23:30), lalu mundur per 30 menit.
    for (let menit = menitAkhir; menit >= 0; menit -= 30) {
      const jam = menit / 60;
      const busur = (jam - 9) / 24;
      const readings = {};
      if (dasar.ph != null) {
        readings.ph = bulat(clamp(dasar.ph + 0.3 * Math.sin(busur * DUA_PI) + 0.25 * selisihHari, 6.1, 7.8), 2);
      }
      if (dasar.temp != null) {
        readings.temp = bulat(clamp(dasar.temp + 2.2 * Math.sin(busur * DUA_PI) + 0.9 * selisihHari, 23, 31), 1);
      }
      if (dasar.tds != null) {
        // Sedikit naik pagi (sisa pakan terlarut), turun sore setelah siphon.
        const geser = 18 * Math.sin(busur * DUA_PI) - (jam > 16 ? 12 : 0) + 40 * selisihHari;
        readings.tds = Math.round(clamp(dasar.tds + geser, 480, 1000));
      }
      const hh = String(Math.floor(menit / 60)).padStart(2, '0');
      const mm = String(menit % 60).padStart(2, '0');
      baris.push({
        id: `RD-${areaId}-${tanggal}-${hh}${mm}`,
        areaId,
        tanggal,
        jam: `${hh}:${mm}`,
        at: `${tanggal}T${hh}:${mm}`,
        readings,
      });
    }
  }
  return baris;
}

const buatRiwayatHariIni = (devices) => buatRiwayatTanggal(devices, hariKey());

const DEFAULT_STATE = {
  theme: 'light',
  categories: SEED_CATEGORIES,
  areas: SEED_AREAS,
  devices: SEED_DEVICES,
  // Riwayat pembacaan sensor: dasar statistik harian kolam SEKALIGUS tabel
  // histori. Disiapkan untuk HARI_HISTORI hari (hari ini + hari-hari sebelumnya)
  // supaya dashboard bisa menampilkan tanggal/bulan/tahun ke belakang.
  readings: tanggalMundur(HARI_HISTORI)
    .slice()
    .reverse()
    .flatMap((tanggal) => buatRiwayatTanggal(SEED_DEVICES, tanggal)),
  // Pencatatan ikan mati harian — diisi MANUAL dari menu Kelola Area.
  kematian: [],
  users: SEED_USERS,
  pets: SEED_PETS,
  selectedPetId: SEED_PETS[0].id,
  pet: SEED_PETS[0],
  pointRules: SEED_POINT_RULES,
  badges: SEED_BADGES,
  missions: SEED_MISSIONS,
  // `leaderboard` SENGAJA tidak disimpan lagi: dulu daftarnya terpisah dari
  // `users` sehingga poin hasil aktivitas tidak pernah muncul di papan
  // peringkat pengelola, dan ada akun hantu (U-005) yang tidak terdaftar.
  // Sekarang diturunkan dari `users` (lihat derived.leaderboard).
  ledger: [
    { id: 'L-1', at: '07 Mar 2026 08:10', activity: 'Pelihara virtual pet', points: 10 },
    { id: 'L-2', at: '06 Mar 2026 17:25', activity: 'Isi data HPP area', points: 25 },
    { id: 'L-3', at: '06 Mar 2026 09:02', activity: 'Catat pemantauan kolam', points: 15 },
  ],
  monitoring: [
    { id: 'MON-1', areaId: 'AR-01', at: '2026-03-07 07:30', by: 'Budi Santoso', ph: 6.8, temp: 25.8, tds: 780, note: 'Nafsu makan ikan normal, air jernih.' },
    { id: 'MON-2', areaId: 'AR-03', at: '2026-03-06 16:10', by: 'Budi Santoso', ph: 6.5, tds: 690, note: 'Daun pakcoy mulai lebat, cek hama sisi timur.' },
  ],
  harvests: [
    { id: 'HV-1', areaId: 'AR-01', at: '2026-03-05', qty: 42, unit: 'kg', revenue: 1470000, note: 'Panen parsial nila ukuran 250 g.' },
  ],
  chat: [],
  // Sesi login: null = belum masuk (belum ada yang login di browser ini)
  sessionUserId: null,
};

// Penanda kondisi dunia nyata, bukan status "sedang memuat". Aplikasi ini
// menyimpan seluruh datanya di localStorage, jadi tidak ada permintaan jaringan
// yang bisa berjalan lama; yang bisa terjadi adalah: belum ada data sama sekali,
// atau data tersimpan rusak/tidak bisa dibaca (R-27).
export const KONDISI = { siap: 'siap', kosong: 'kosong', rusak: 'rusak' };

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...migrateState(parsed), kondisi: KONDISI.siap };
  } catch {
    // Data tersimpan tidak bisa dibaca (JSON rusak atau disunting manual).
    // Jangan diam-diam memakai seed lalu berpura-pura semua normal: beri tahu
    // pengguna bahwa data lama tidak terbaca dan apa langkah berikutnya.
    return { ...DEFAULT_STATE, kondisi: KONDISI.rusak };
  }
}

// Perbaikan data lama di localStorage.
// State lama (sebelum fitur login) menyimpan daftar users TANPA field `password`,
// karena dulu seed-nya memang tidak punya password. Kalau dibiarkan, akun demo
// selalu gagal dengan pesan "Password salah." walau tombol demo sudah mengisi benar.
// Jadi: lengkapi field yang hilang dari SEED_USERS (cocokkan id atau email),
// tapi jangan menimpa password yang sudah diganti sendiri oleh pengguna.
function migrateState(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const users = Array.isArray(parsed.users) && parsed.users.length ? parsed.users : SEED_USERS;
  // Field baru (riwayat sensor & catatan ikan mati) belum ada di localStorage
  // versi lama. Kekosongan itu membuat statistik harian gagal jalan, jadi
  // dilengkapi di sini — bukan dengan menghapus data yang sudah dimiliki user.
  const devices = Array.isArray(parsed.devices) ? parsed.devices : SEED_DEVICES;
  // Riwayat disimpan per hari. Riwayat hari-hari sebelumnya dipakai oleh tabel
  // histori, jadi yang hilang dibangkitkan sekali di sini lalu ikut tersimpan —
  // bukan hanya hari ini. Hari yang SUDAH punya data tidak disentuh, dan hari
  // ini selalu dibangun ulang supaya titik terakhirnya tepat di jam sekarang.
  const riwayatLama = Array.isArray(parsed.readings) ? parsed.readings : [];
  const tanggalAda = new Set(riwayatLama.map((r) => r && r.tanggal).filter(Boolean));
  const tambahanRiwayat = [];
  for (const tanggal of tanggalMundur(HARI_HISTORI)) {
    if (tanggal === hariKey()) continue; // ditangani di bawah
    if (tanggalAda.has(tanggal)) continue; // data milik user, jangan ditimpa
    tambahanRiwayat.push(...buatRiwayatTanggal(devices, tanggal));
  }
  const readings = [
    ...riwayatLama.filter((r) => r && r.tanggal !== hariKey()),
    ...buatRiwayatHariIni(devices),
    ...tambahanRiwayat,
  ];
  return {
    ...parsed,
    ...normalizePetCollection(parsed, SEED_PETS),
    readings,
    kematian: Array.isArray(parsed.kematian) ? parsed.kematian : [],
    users: users.map((u) => {
      const seed = SEED_USERS.find(
        (s) =>
          s.id === u.id ||
          (s.email || '').toLowerCase() === (u.email || '').toLowerCase(),
      );
      if (!seed) {
        // Akun buatan pengelola yang tersimpan tanpa password (versi lama) tidak
        // akan pernah bisa masuk. Untuk aplikasi demo, samakan ke DEMO_PASSWORD.
        return u && !u.password ? { ...u, password: DEMO_PASSWORD } : u;
      }
      const gabung = { ...seed, ...u };
      if (!gabung.password) gabung.password = seed.password; // data lama tanpa password
      // Avatar lama memakai foto orang dari Unsplash (isi seed versi sebelumnya).
      // Untuk aplikasi demo, identitas akun sekarang divalidasi (inisial + warna),
      // jadi nilai lama dikenali lewat daftar AVATAR_LAMA lalu diisi ulang dari
      // seed. Avatar pilihan pengguna yang divalidasi TIDAK disentuh.
      if (AVATAR_LAMA.includes(gabung.avatar)) gabung.avatar = seed.avatar;
      return gabung;
    }),
  };
}

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const now = () =>
  new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
  ' ' +
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });


export function SmartProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Role datang dari akun yang login:
  // - pengguna → halaman akar, pengelola → /admin (dijaga di Shell).
  // - bila belum login, ikut URL supaya alamat /admin tetap punya konteks.
  const { pathname } = useLocation();

  // Persist seluruh state ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* kuota penuh — abaikan */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Simulasi telemetri: geser nilai sensor tiap 5 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev.devices.some((d) => d.status === 'online')) return prev;
        const devices = prev.devices.map((device) => {
          if (device.status !== 'online' || !device.metric) return device;
          const [min, max, precision] = METRIC_RANGE[device.metric.key] || [0, 100, 1];
          const step = (max - min) * 0.02;
          const delta = (Math.random() * 2 - 1) * step;
          const value = Number(clamp(device.metric.value + delta, min, max).toFixed(precision));
          return { ...device, metric: { ...device.metric, value } };
        });
        return { ...prev, devices };
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ── helper penulisan ────────────────────────────────────────────────────────
  const patch = useCallback((updater) => setState((prev) => ({ ...prev, ...updater(prev) })), []);

  // Poin mengikuti akun yang sedang login supaya saldo tiap akun berbeda.
  // `state.points` (angka global lama) TIDAK ikut diperbarui: dulu ada dua
  // sumber poin yang bisa berbeda, dan pengelola melihat angka yang salah.
  // Papan peringkat sekarang diturunkan dari `users`, jadi cukup satu sumber.
  const logPoints = (prev, activity, points) => ({
    ledger: [{ id: uid('L'), at: now(), activity, points }, ...prev.ledger].slice(0, 60),
    users: prev.users.map((u) => (u.id === prev.sessionUserId ? { ...u, points: (u.points || 0) + points } : u)),
  });

  const award = useCallback(
    (activity, points, silent) => {
      patch((prev) => {
        if (!silent) notify(`+${points} point: ${activity}`);
        return logPoints(prev, activity, points);
      });
    },
    [notify, patch],
  );

  const updatePet = useCallback((prev, petId, updater) => {
    const targetId = petId || prev.selectedPetId;
    if (!prev.pets?.some((item) => item.id === targetId)) return {};
    return patchPetCollection(prev, targetId, updater);
  }, []);

  const actions = useMemo(
    () => ({
      toggleTheme: () => setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' })),
      notify,

      // ── Login / logout ──────────────────────────────────────────────────────
      // Verifikasi sederhana di sisi browser. Belum ada backend, jadi ini BUKAN
      // pengamanan sungguhan — cukup untuk alur demo.
      login: async (email, password) => {
        const bersih = (email || '').trim().toLowerCase();
        const kandidat = state.users.filter((u) => (u.email || '').toLowerCase() === bersih);
        if (!kandidat.length) return { ok: false, pesan: 'Email tidak terdaftar.' };
        // Bisa ada lebih dari satu baris dengan email sama (mis. pengelola menambah
        // akun dengan email yang sudah ada). Pilih baris yang password-nya cocok,
        // supaya akun ganda tidak membuat login benar ikut ditolak.
        const akun = kandidat.find((u) => u.password === password) || kandidat[0];
        // Akun demo: DEMO_PASSWORD selalu berlaku. Password akun demo bisa saja
        // pernah diganti pemiliknya (lewat Profil atau Kelola Pengguna); kalau itu
        // terjadi, isian otomatis dari tombol demo tidak lagi cocok dan login gagal
        // dengan "Password salah." padahal kolom sudah benar. Karena akun ini memang
        // akun demo, passwordnya diselaraskan ulang ke DEMO_PASSWORD saat itu juga.
        const akunDemo = SEED_USERS.some(
          (s) => s.id === akun.id || (s.email || '').toLowerCase() === bersih,
        );
        if (akun.password !== password && !(akunDemo && password === DEMO_PASSWORD)) {
          return {
            ok: false,
            pesan: akunDemo
              ? 'Password salah. Klik kartu akun demo di bawah untuk mengisi ulang password demo.'
              : 'Password salah.',
          };
        }
        if (akun.status === 'nonaktif') return { ok: false, pesan: 'Akun ini dinonaktifkan pengelola.' };
        if (akun.status === 'menunggu') {
          return {
            ok: false,
            pesan: 'Akun pengelola ini masih menunggu persetujuan pengelola yang sudah ada. Coba masuk sebagai pengguna, atau hubungi pengelola farm.',
          };
        }
        setState((prev) => ({
          ...prev,
          sessionUserId: akun.id,
          users: prev.users.map((u) =>
            u.id === akun.id && u.password !== password ? { ...u, password } : u,
          ),
        }));
        return { ok: true, akun };
      },
      logout: () => {
        setState((prev) => ({ ...prev, sessionUserId: null }));
        return { ok: true };
      },
      // ── Pendaftaran akun sendiri (halaman /daftar) ──────────────────────────
      // Role TIDAK dipercaya dari formulir begitu saja:
      // - 'pengguna' → langsung aktif. Aksesnya toh terbatas pada area yang
      //   ditugaskan pengelola, jadi belum ada data yang bisa dibuka.
      // - 'pengelola' → status 'menunggu'. Hak pengelola itu akses penuh ke
      //   seluruh farm, jadi tidak boleh didapat dari formulir publik — harus
      //   disetujui dulu lewat Kelola User.
      // Email dijaga unik (tidak peduli besar-kecil huruf) supaya tidak ada dua
      // akun dengan email sama yang membuat login memilih akun yang salah.
      register: (data) => {
        const nama = (data.name || '').trim();
        const email = (data.email || '').trim().toLowerCase();
        const password = data.password || '';
        const peranDiminta = data.role === 'pengelola' ? 'pengelola' : 'pengguna';

        if (!nama || !email || !password) return { ok: false, pesan: 'Nama, email, dan password wajib diisi.' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, pesan: 'Format email tidak valid.' };
        if (password.length < 6) return { ok: false, pesan: 'Password minimal 6 karakter.' };
        if (state.users.some((u) => (u.email || '').toLowerCase() === email)) {
          return { ok: false, pesan: 'Email ini sudah terdaftar. Coba masuk atau pakai email lain.' };
        }

        const status = peranDiminta === 'pengelola' ? 'menunggu' : 'aktif';
        const akun = {
          id: uid('U'),
          name: nama,
          email,
          password,
          role: peranDiminta,
          status,
          areaIds: [],
          points: 0,
          joinedAt: new Date().toLocaleDateString('en-CA'),
          phone: (data.phone || '').trim(),
          jabatan: (data.jabatan || '').trim(),
          bio: '',
          // avatar = objek {id, warna, warnaTeks}; lihat komponen <Avatar> di ui.jsx.
          avatar: data.avatar || AVATAR_PILIHAN[0],
        };
        // Akun baru DAN sesinya diset sekaligus. Kalau halaman pendaftaran
        // memanggil login() terpisah setelah register(), login itu membaca
        // state LAMA yang belum memuat akun baru → "Email tidak terdaftar."
        // walau akunnya sudah tercatat. Satu setState menghilangkan celah itu.
        setState((prev) => ({
          ...prev,
          users: [...prev.users, akun],
          sessionUserId: status === 'aktif' ? akun.id : prev.sessionUserId,
        }));
        if (status === 'aktif') notify(`Selamat datang, ${akun.name}! Akun Anda aktif.`);
        return { ok: true, akun, menungguPersetujuan: status === 'menunggu' };
      },
      // Pengelola menyetujui pendaftar pengelola. Dipisah dari saveUser supaya
      // niatnya jelas di kode dan di riwayat.
      setUserStatus: (userId, status) => {
        patch((prev) => ({
          users: prev.users.map((u) => (u.id === userId ? { ...u, status } : u)),
        }));
        notify(`Status akun diubah ke "${STATUS_AKUN[status] || status}".`);
      },
      // Pulihkan password akun demo ke nilai seed.
      // Dipakai tombol "akun demo" di halaman masuk: kalau pemilik akun pernah
      // mengganti password-nya (lewat Profil atau Kelola Pengguna), password akun
      // itu tidak lagi sama dengan DEMO_PASSWORD sehingga login demo gagal dengan
      // "Password salah." walaupun kolom sudah terisi otomatis. Mengklik tombol
      // demo = niat mencoba akun demo, jadi password dikembalikan ke seed dulu.
      resetDemoPassword: (email) => {
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            (u.email || '').toLowerCase() === (email || '').toLowerCase()
              ? { ...u, password: DEMO_PASSWORD }
              : u,
          ),
        }));
        return { ok: true, password: DEMO_PASSWORD };
      },
      // Perubahan profil oleh pemilik akun sendiri
      updateProfile: (perubahan) => {
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === prev.sessionUserId ? { ...u, ...perubahan } : u)),
        }));
        notify('Profil berhasil diperbarui.');
      },
      changePassword: (lama, baru) => {
        const akun = state.users.find((u) => u.id === state.sessionUserId);
        if (!akun) return { ok: false, pesan: 'Sesi tidak ditemukan.' };
        if (akun.password !== lama) return { ok: false, pesan: 'Password lama tidak cocok.' };
        if (!baru || baru.length < 6) return { ok: false, pesan: 'Password baru minimal 6 karakter.' };
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === prev.sessionUserId ? { ...u, password: baru } : u)),
        }));
        notify('Password berhasil diganti.');
        return { ok: true };
      },

      // ── Device ───────────────────────────────────────────────────────────────
      saveDevice: (device) =>
        patch((prev) => ({
          devices: device.id && prev.devices.some((d) => d.id === device.id)
            ? prev.devices.map((d) => (d.id === device.id ? { ...d, ...device } : d))
            : [...prev.devices, { ...device, id: device.id || uid('IOT'), metric: device.metric || { key: 'ph', value: 7 } }],
        })),
      removeDevice: (id) => patch((prev) => ({ devices: prev.devices.filter((d) => d.id !== id) })),
      calibrateDevice: (id) => {
        patch((prev) => ({
          devices: prev.devices.map((d) =>
            d.id === id ? { ...d, status: 'online', lastCalibration: new Date().toISOString().slice(0, 10) } : d,
          ),
        }));
        notify(`Kalibrasi ${id} selesai, status kembali online.`);
      },
      setDeviceStatus: (id, status) => {
        patch((prev) => ({ devices: prev.devices.map((d) => (d.id === id ? { ...d, status } : d)) }));
        notify(`${id} diubah ke status "${status}".`);
      },
      assignDeviceArea: (id, areaId) => {
        patch((prev) => ({
          devices: prev.devices.map((d) => (d.id === id ? { ...d, areaId } : d)),
        }));
        notify('Penempatan device diperbarui.');
      },

      // ── Kategori ─────────────────────────────────────────────────────────────
      saveCategory: (category) =>
        patch((prev) => ({
          categories: category.id && prev.categories.some((c) => c.id === category.id)
            ? prev.categories.map((c) => (c.id === category.id ? { ...c, ...category } : c))
            : [...prev.categories, { ...category, id: uid('CAT') }],
        })),
      removeCategory: (id) => {
        patch((prev) => ({
          categories: prev.categories.filter((c) => c.id !== id),
          devices: prev.devices.filter((d) => d.categoryId !== id),
        }));
        notify('Kategori beserta device di dalamnya dihapus.', 'warn');
      },

      // ── Area ────────────────────────────────────────────────────────────────
      saveArea: (area) =>
        patch((prev) => ({
          areas: area.id && prev.areas.some((a) => a.id === area.id)
            ? prev.areas.map((a) => (a.id === area.id ? { ...a, ...area } : a))
            : [...prev.areas, { ...area, id: area.id || uid('AR'), hpp: area.hpp || [], deviceIds: area.deviceIds || [] }],
        })),
      setAreaPopulation: (areaId, value) => {
        const manager = state.users.find((user) => user.id === state.sessionUserId);
        const area = state.areas.find((item) => item.id === areaId);
        if (manager?.role !== 'pengelola' || area?.type !== 'kolam') {
          notify('Hanya pengelola yang dapat mengatur populasi kolam.', 'warn');
          return;
        }
        const population = normalizeFishCount(value);
        patch((prev) => {
          const currentUser = prev.users.find((user) => user.id === prev.sessionUserId);
          const result = setFishPopulation(prev.areas, areaId, population);
          if (currentUser?.role !== 'pengelola' || !result.changed) return {};
          return { areas: result.areas };
        });
        notify(`Populasi ${area.name} diperbarui menjadi ${population} ${area.populationUnit || 'ekor'}.`);
      },
      removeArea: (id) => {
        patch((prev) => ({
          areas: prev.areas.filter((a) => a.id !== id),
          devices: prev.devices.map((d) => (d.areaId === id ? { ...d, areaId: null } : d)),
        }));
        notify('Area dihapus; device terkait menjadi belum ditempatkan.', 'warn');
      },
      saveHpp: (areaId, item) =>
        patch((prev) => ({
          areas: prev.areas.map((area) => {
            if (area.id !== areaId) return area;
            const hpp = item.id
              ? area.hpp.map((h) => (h.id === item.id ? { ...h, ...item } : h))
              : [...area.hpp, { ...item, id: uid('H') }];
            return { ...area, hpp };
          }),
        })),
      removeHpp: (areaId, itemId) =>
        patch((prev) => ({
          areas: prev.areas.map((area) => (area.id === areaId ? { ...area, hpp: area.hpp.filter((h) => h.id !== itemId) } : area)),
        })),

      // ── Pemantauan & panen ──────────────────────────────────────────────────
      addMonitoring: (entry) => {
        patch((prev) => ({ monitoring: [{ ...entry, id: uid('MON'), at: now() }, ...prev.monitoring].slice(0, 80) }));
        award('Catat pemantauan kolam', 15, true);
        notify('Catatan pemantauan tersimpan (+15 point).');
      },
      removeMonitoring: (id) => patch((prev) => ({ monitoring: prev.monitoring.filter((m) => m.id !== id) })),

      // ── Ikan mati (dicatat manual tiap hari) ────────────────────────────────
      // Nilai ini diisi manusia, BUKAN dari sensor. Satu area satu catatan per
      // tanggal: mencatat ulang di hari yang sama memperbarui angkanya, bukan
      // menumpuk baris ganda — supaya total harian tidak terhitung dua kali.
      // Mengurangi populasi area adalah efek nyata dari kematian, jadi populasi
      // ikut disesuaikan (tidak pernah negatif).
      catatKematian: (areaId, jumlah, catatan) => {
        const user = state.users.find((item) => item.id === state.sessionUserId);
        const area = state.areas.find((item) => item.id === areaId);
        const punyaAkses = user?.role === 'pengelola' || user?.areaIds?.includes(areaId);
        if (!area || area.type !== 'kolam' || !punyaAkses) {
          notify('Tidak dapat mencatat kematian untuk kolam ini.', 'warn');
          return;
        }

        const tanggal = hariKey();
        const input = { areaId, count: jumlah, catatan, tanggal, id: uid('MT'), at: now() };
        const result = recordDailyMortality(state.areas, state.kematian || [], input);
        if (!result.changed) {
          notify('Tidak dapat mencatat kematian untuk kolam ini.', 'warn');
          return;
        }

        patch((prev) => {
          const currentUser = prev.users.find((item) => item.id === prev.sessionUserId);
          const currentArea = prev.areas.find((item) => item.id === areaId);
          const currentAccess = currentUser?.role === 'pengelola' || currentUser?.areaIds?.includes(areaId);
          if (!currentArea || currentArea.type !== 'kolam' || !currentAccess) return {};
          const updated = recordDailyMortality(prev.areas, prev.kematian || [], input);
          return updated.changed ? { kematian: updated.deaths, areas: updated.areas } : {};
        });

        const angka = normalizeFishCount(jumlah);
        notify(
          result.delta === 0
            ? `Catatan kematian hari ini tidak berubah (${angka} ekor).`
            : `Kematian hari ini dicatat ${angka} ekor (${result.delta > 0 ? '+' : ''}${result.delta} terhadap catatan sebelumnya).`,
          angka > 0 ? 'warn' : 'ok',
        );
      },
      removeKematian: (id) => {
        let kembali = 0;
        let areaId = null;
        patch((prev) => {
          const target = prev.kematian.find((k) => k.id === id);
          if (!target) return {};
          kembali = Number(target.jumlah) || 0;
          areaId = target.areaId;
          return {
            kematian: prev.kematian.filter((k) => k.id !== id),
            areas: prev.areas.map((a) =>
              a.id === target.areaId ? { ...a, population: Number(a.population || 0) + kembali } : a,
            ),
          };
        });
        if (areaId) notify(`Catatan kematian dihapus. Populasi dikembalikan ${kembali} ekor.`);
      },
      addHarvest: (entry) => {
        patch((prev) => ({ harvests: [{ ...entry, id: uid('HV') }, ...prev.harvests] }));
        award('Panen tercatat', 100, true);
        notify('Hasil panen dicatat (+100 point).');
      },

      // ── Pengguna ────────────────────────────────────────────────────────────
      // Akun baru dari halaman Kelola Pengguna tidak punya kolom password di
      // formulirnya. Tanpa default ini, akun yang dibuat pengelola tersimpan tanpa
      // password dan pemiliknya tidak akan pernah bisa masuk ("Password salah.").
      // Jadi akun baru memakai DEMO_PASSWORD, sedangkan akun yang diubah
      // mempertahankan password lamanya (jangan ditimpa dengan undefined).
      saveUser: (user) =>
        patch((prev) => {
          const adaSebelumnya = user.id && prev.users.some((u) => u.id === user.id);
          if (!adaSebelumnya) {
            return {
              ...prev,
              users: [
                ...prev.users,
                {
                  ...user,
                  id: user.id || uid('U'),
                  password: user.password || DEMO_PASSWORD,
                  points: user.points || 0,
                  areaIds: user.areaIds || [],
                },
              ],
            };
          }
          return {
            ...prev,
            users: prev.users.map((u) => {
              if (u.id !== user.id) return u;
              const gabung = { ...u, ...user };
              if (!gabung.password) gabung.password = u.password || DEMO_PASSWORD;
              return gabung;
            }),
          };
        }),
      removeUser: (id) => patch((prev) => ({ users: prev.users.filter((u) => u.id !== id) })),

      // ── Virtual Pet ─────────────────────────────────────────────────────────
      addPet: (settings) => {
        const currentUser = state.users.find((user) => user.id === state.sessionUserId);
        const area = state.areas.find((item) => item.id === settings?.appliedToAreaId);
        const template = SEED_PETS.find((item) => item.species === settings?.species);
        const name = settings?.name?.trim();
        const manager = currentUser?.role === 'pengelola';
        const operator = currentUser?.role === 'pengguna';
        const areaAllowed = area?.type === 'kolam' && (manager || (operator && currentUser.areaIds?.includes(area.id)));
        if ((!manager && !operator) || !template || !name || !areaAllowed) {
          notify('Pilih nama, karakter, dan kolam yang dapat Anda kelola.', 'warn');
          return null;
        }
        const newPet = createPetRecord(template, {
          id: uid('PET'),
          name,
          areaId: area.id,
          ownerUserId: manager ? null : currentUser.id,
        });
        patch((prev) => ({
          pets: [...prev.pets, newPet],
          selectedPetId: newPet.id,
          pet: newPet,
        }));
        notify(manager ? `${name} ditambahkan ke koleksi pet farm.` : `${name} ditambahkan ke V-Pet Anda.`);
        return newPet.id;
      },
      selectPet: (petId) => patch((prev) => selectPet(prev, petId)),
      configurePet: (petId, settings) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          if (!prev.pets.some((item) => item.id === targetId)) return {};
          return updatePet(prev, targetId, (item) => ({
            ...item,
            name: settings.name?.trim() || item.name,
            species: settings.species || item.species,
            appliedToAreaId: settings.appliedToAreaId || null,
          }));
        });
        notify('Pengaturan karakter disinkronkan ke V-Pet pengguna.');
      },
      renamePet: (name, petId) => {
        patch((prev) => patchPetCollection(prev, petId || prev.selectedPetId, (pet) => ({ ...pet, name })));
        notify('Nama virtual pet diperbarui.');
      },
      feedPet: (petId) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          const pet = prev.pets.find((item) => item.id === targetId);
          if (!pet) return {};
          const hunger = clamp(pet.hunger + 18, 0, 100);
          const health = clamp(pet.health + (hunger > 60 ? 4 : -3), 0, 100);
          const progress = progressPetFromCare(pet, { hunger, health });
          const timestamp = now();
          return {
            ...updatePet(prev, targetId, (item) => ({
              ...item,
              ...progress.updates,
              lastFed: timestamp,
              log: [{ id: uid('P'), at: timestamp, text: `${pet.species} diberi pakan pelet.`, delta: progress.xpGain ? `+${progress.xpGain} EXP` : 'EXP tidak bertambah' }, ...pet.log].slice(0, 20),
            })),
            ...logPoints(prev, `Pelihara ${pet.species} (pakan)`, 10),
          };
        });
        notify('EXP pakan mengikuti peningkatan kondisi ikan (+10 point farm).');
      },
      playPet: (petId) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          const pet = prev.pets.find((item) => item.id === targetId);
          if (!pet) return {};
          const happiness = clamp(pet.happiness + 16, 0, 100);
          const happinessGain = happiness - pet.happiness;
          const timestamp = now();
          return {
            ...updatePet(prev, targetId, (item) => ({
              ...item,
              happiness,
              lastPlayed: timestamp,
              log: [{ id: uid('P'), at: timestamp, text: `${pet.species} diajak main. EXP tidak bertambah.`, delta: `+${happinessGain} kebahagiaan, 0 EXP` }, ...pet.log].slice(0, 20),
            })),
            ...logPoints(prev, `Pelihara ${pet.species} (main)`, 10),
          };
        });
        notify('Ajak main hanya menambah kebahagiaan; EXP tidak bertambah (+10 point farm).');
      },
      cleanPet: (petId) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          const pet = prev.pets.find((item) => item.id === targetId);
          if (!pet) return {};
          const hygiene = clamp(pet.hygiene + 20, 0, 100);
          const health = clamp(pet.health + 6, 0, 100);
          const progress = progressPetFromCare(pet, { hygiene, health });
          const timestamp = now();
          return {
            ...updatePet(prev, targetId, (item) => ({
              ...item,
              ...progress.updates,
              log: [{ id: uid('P'), at: timestamp, text: `${pet.species} dibersihkan.`, delta: progress.xpGain ? `+${progress.xpGain} EXP` : 'EXP tidak bertambah' }, ...pet.log].slice(0, 20),
            })),
            ...logPoints(prev, `Pelihara ${pet.species} (bersih)`, 10),
          };
        });
        notify('EXP kebersihan mengikuti peningkatan kondisi ikan (+10 point farm).');
      },
      healPet: (petId) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          const pet = prev.pets.find((item) => item.id === targetId);
          if (!pet) return {};
          const progress = progressPetFromCare(pet, { health: 100 });
          const timestamp = now();
          return updatePet(prev, targetId, (item) => ({
            ...item,
            ...progress.updates,
            log: [{ id: uid('P'), at: timestamp, text: `${pet.species} dirawat.`, delta: progress.xpGain ? `+${progress.xpGain} EXP` : 'EXP tidak bertambah' }, ...pet.log].slice(0, 20),
          }));
        });
        notify('EXP rawat mengikuti peningkatan kesehatan ikan.');
      },
      resetPet: (petId) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          const current = prev.pets.find((item) => item.id === targetId);
          const seed = SEED_PETS.find((item) => item.id === targetId)
            || SEED_PETS.find((item) => item.species === current?.species)
            || SEED_PETS[0];
          if (!current || !seed) return {};
          return updatePet(prev, targetId, () => ({
            ...seed,
            id: current.id,
            name: current.name,
            species: current.species,
            appliedToAreaId: current.appliedToAreaId,
            ownerUserId: current.ownerUserId,
            log: [],
          }));
        });
        notify('Virtual pet direset ke kondisi awal.', 'warn');
      },
      applyPetToArea: (areaId, petId) => {
        patch((prev) => updatePet(prev, petId, (item) => ({ ...item, appliedToAreaId: areaId || null })));
        notify('Lokasi virtual pet diperbarui.');
      },
      decayPet: (petId) => {
        patch((prev) => {
          const targetId = petId || prev.selectedPetId;
          const pet = prev.pets.find((item) => item.id === targetId);
          if (!pet) return {};
          return updatePet(prev, targetId, (item) => ({
            ...item,
            hunger: clamp(item.hunger - 12, 0, 100),
            hygiene: clamp(item.hygiene - 8, 0, 100),
            happiness: clamp(item.happiness - 6, 0, 100),
            health: clamp(item.health - (item.hunger < 30 ? 6 : 2), 0, 100),
          }));
        });
        notify('Waktu berjalan: kondisi pet menurun, rawat kembali.', 'warn');
      },

      // ── Gamifikasi ──────────────────────────────────────────────────────────
      toggleMission: (id) => {
        patch((prev) => {
          const target = prev.missions.find((m) => m.id === id);
          if (!target) return {};
          const missions = prev.missions.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
          if (target.done) return { missions };
          notify(`Misi "${target.title}" selesai (+${target.points} point).`);
          return { missions, ...logPoints(prev, `Misi: ${target.title}`, target.points) };
        });
      },
      claimBadge: (badge) => {
        let ok = true;
        patch((prev) => {
          // Poin diambil dari AKUN yang login (satu-satunya sumber poin).
          const saldo = prev.users.find((u) => u.id === prev.sessionUserId)?.points || 0;
          if (saldo < badge.minPoints) {
            ok = false;
            return {};
          }
          return { badges: prev.badges.map((b) => (b.id === badge.id ? { ...b, claimed: true } : b)) };
        });
        notify(ok ? `Badge "${badge.name}" diklaim.` : 'Point belum cukup untuk badge ini.', ok ? 'ok' : 'warn');
      },
      savePointRule: (rule) =>
        patch((prev) => ({
          pointRules: rule.id && prev.pointRules.some((r) => r.id === rule.id)
            ? prev.pointRules.map((r) => (r.id === rule.id ? { ...r, ...rule } : r))
            : [...prev.pointRules, { ...rule, id: uid('R') }],
        })),
      removePointRule: (id) => patch((prev) => ({ pointRules: prev.pointRules.filter((r) => r.id !== id) })),
      saveBadge: (badge) =>
        patch((prev) => ({
          badges: badge.id && prev.badges.some((b) => b.id === badge.id)
            ? prev.badges.map((b) => (b.id === badge.id ? { ...b, ...badge } : b))
            : [...prev.badges, { ...badge, id: uid('B') }],
        })),
      removeBadge: (id) => patch((prev) => ({ badges: prev.badges.filter((b) => b.id !== id) })),
      adjustPoints: (userId, delta) => {
        patch((prev) => ({
          // Hanya `users` yang diperbarui; papan peringkat & saldo ikut dari sini.
          users: prev.users.map((u) => (u.id === userId ? { ...u, points: Math.max(0, (u.points || 0) + delta) } : u)),
        }));
        notify(`Point pengguna disesuaikan (${delta > 0 ? '+' : ''}${delta}).`);
      },

      // ── Chatbot ─────────────────────────────────────────────────────────────
      pushChat: (message) => patch((prev) => ({ chat: [...prev.chat, message].slice(-40) })),
      clearChat: () => {
        patch(() => ({ chat: [] }));
        notify('Riwayat percakapan dibersihkan.');
      },
      resetDemo: () => {
        setState({ ...DEFAULT_STATE, theme: state.theme, sessionUserId: state.sessionUserId });
        notify('Data demo dikembalikan ke kondisi awal.', 'warn');
      },
    }),
    [award, notify, patch, state.theme, state.users, state.sessionUserId, state.areas, state.kematian, updatePet],
  );

  // Pengguna yang sedang login (akun dari daftar users) — null bila belum masuk.
  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.sessionUserId) || null,
    [state.users, state.sessionUserId],
  );

  // Role mengikuti akun yang login. Kalau belum login, role ikut URL supaya
  // halaman login masih bisa menampilkan pemisahan pengguna/pengelola.
  const role = currentUser ? currentUser.role : pathname === '/admin' || pathname.startsWith('/admin/') ? 'pengelola' : 'pengguna';

  const derived = useMemo(() => {
    const hppTotal = (areaId) => {
      const area = state.areas.find((a) => a.id === areaId);
      if (!area) return { total: 0, perUnit: 0 };
      const total = area.hpp.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
      const divisor = Number(area.population) || 0;
      return { total, perUnit: divisor ? total / divisor : 0 };
    };
    return {
      hppTotal,
      // ── Hak akses area ───────────────────────────────────────────────────
      // Pengelola mengurus seluruh farm; pengguna hanya area yang ditugaskan
      // pengelola lewat Kelola User. Dulu aturan ini tidak ada di halaman
      // pengguna, sehingga operator bisa melihat & mencatat kolam milik
      // operator lain walau halaman Kelola User menyatakan sebaliknya.
      areasSaya: role === 'pengelola' ? state.areas : state.areas.filter((a) => (currentUser?.areaIds || []).includes(a.id)),
      bolehAksesArea: (areaId) =>
        role === 'pengelola' || (!!areaId && (currentUser?.areaIds || []).includes(areaId)),
      // Papan peringkat DITURUNKAN dari akun. Dulu daftarnya terpisah, sehingga
      // poin yang diperoleh pengguna dari aktivitas farm tidak muncul di sini
      // dan pengelola melihat angka basi. Akun nonaktif & pengelola tetap
      // ditampilkan (dengan penanda), pendaftar tunggal = `users`.
      leaderboard: [...state.users]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .map((u) => ({
          id: u.id,
          name: u.name,
          points: u.points || 0,
          status: u.status,
          role: u.role,
          area: (u.areaIds || []).map((id) => state.areas.find((a) => a.id === id)?.name || id).join(', '),
        })),
      devicesByArea: (areaId) => state.devices.filter((d) => d.areaId === areaId),
      categoryOf: (id) => state.categories.find((c) => c.id === id),
      areaOf: (id) => state.areas.find((a) => a.id === id),
      activeAlerts: state.devices.filter((d) => d.status !== 'online'),
      petProgress: Math.round((state.pet.xp / Math.max(1, state.pet.xpNext)) * 100),

      // ── Statistik harian kolam ─────────────────────────────────────────────
      // Angka mentah per area (min/rata-rata/maks hari ini) PLUS perbandingan
      // dengan ambang ideal area tersebut, supaya UI tidak perlu mengulang
      // logika "aman atau tidak" di banyak halaman.
      statistikArea: (areaId, tanggal = hariKey()) => {
        // Pembacaan sensor yang SEDANG tampil ikut dihitung sebagai titik data
        // terbaru, supaya statistik terus hidup sementara app terbuka (nilai
        // telemetri bergerak tiap 5 detik, sementara riwayat tersimpan tetap).
        const sekarang = new Date();
        const jamKini = `${String(sekarang.getHours()).padStart(2, '0')}:${String(sekarang.getMinutes()).padStart(2, '0')}`;
        const readings = state.devices
          .filter((d) => d.areaId === areaId && d.metric)
          .reduce((acc, d) => ({ ...acc, [d.metric.key]: d.metric.value }), {});
        const tambahan = Object.keys(readings).length
          ? [{ areaId, tanggal: hariKey(sekarang), jam: jamKini, readings }]
          : [];
        const stats = statistikHarian([...state.readings, ...tambahan], areaId, tanggal);
        const area = state.areas.find((a) => a.id === areaId);
        const banding = METRIC_KEYS.map((key) => {
          const s = stats[key];
          // Ambang diambil lewat helper yang sama dengan halaman lain, supaya
          // status di sini tidak pernah berbeda dari kartu telemetri/List IoT.
          const kategori = state.categories.find((c) =>
            state.devices.some((d) => d.areaId === areaId && d.metric?.key === key && d.categoryId === c.id),
          );
          const ambang = ambangUntuk(area, kategori, key);
          if (!s || !ambang) return { key, stats: s, ambang: ambang || null, status: 'tanpa-ambang' };
          // Dinilai dari rentang terburuk hari ini: bila nilai minimum DAN
          // maksimum masih di dalam ambang, seluruh hari aman.
          const aman = s.min >= ambang[0] && s.max <= ambang[1];
          const jauh = s.min < ambang[0] * 0.92 || s.max > ambang[1] * 1.08;
          return { key, stats: s, ambang, status: aman ? 'aman' : jauh ? 'bahaya' : 'waspada' };
        });
        return { ...stats, banding };
      },
      kematianArea: (areaId, tanggal = hariKey()) =>
        (state.kematian || []).filter((k) => k.areaId === areaId && k.tanggal === tanggal),
      // ── Histori harian kolam ───────────────────────────────────────────────
      // Satu baris per tanggal (paling baru di atas) berisi ringkasan seluruh
      // parameter + catatan ikan mati hari itu. Dipakai tabel histori di
      // dashboard supaya pengguna bisa menengok hari-hari sebelumnya, bukan
      // hanya "hari ini".
      historiArea: (areaId, jumlahHari = 7) => {
        const devArea = state.devices.filter((d) => d.areaId === areaId && d.metric);
        const punyaSensor = devArea.some((d) => METRIC_KEYS.includes(d.metric?.key));
        return tanggalMundur(jumlahHari).map((tanggal) => {
          const adaRekam = state.readings.some((r) => r.areaId === areaId && r.tanggal === tanggal);
          // Histori yang belum pernah tersimpan dibangkitkan SEKALI lalu disimpan
          // (lihat pastikanHistori), supaya tabel menampilkan angka konsisten.
          // Di sini hanya dibaca: baris yang benar-benar tidak ada ditandai kosong.
          const s = statistikHarian(state.readings, areaId, tanggal);
          const kematian = (state.kematian || []).filter((k) => k.areaId === areaId && k.tanggal === tanggal);
          return {
            tanggal,
            label: labelTanggal(tanggal),
            jumlah: s.jumlah,
            jam: s.jam,
            hariIni: tanggal === hariKey(),
            adaData: punyaSensor && adaRekam,
            metrik: METRIC_KEYS.map((key) => {
              const m = s[key];
              const ambang = ambangUntuk(
                state.areas.find((a) => a.id === areaId),
                state.categories.find((c) => devArea.some((d) => d.categoryId === c.id && d.metric?.key === key)),
                key,
              );
              let status = 'tanpa-data';
              if (m && ambang) {
                if (m.min >= ambang[0] && m.max <= ambang[1]) status = 'aman';
                else if (m.min < ambang[0] * 0.92 || m.max > ambang[1] * 1.08) status = 'bahaya';
                else status = 'waspada';
              }
              return { key, stats: m, ambang, status };
            }),
            matiEkor: kematian.reduce((sum, k) => sum + Number(k.jumlah || 0), 0),
          };
        });
      },
      totalKematianHariIni: (tanggal = hariKey()) =>
        (state.kematian || [])
          .filter((k) => k.tanggal === tanggal)
          .reduce((sum, k) => sum + Number(k.jumlah || 0), 0),
    };
    // `role` & `currentUser` ikut jadi dependensi: hak akses area bergantung
    // pada akun yang login, bukan hanya data.
  }, [state, role, currentUser]);

  const value = useMemo(
    () => ({
      ...state,
      ...actions,
      ...derived,
      role,
      currentUser,
      isLoggedIn: !!currentUser,
      // Saldo poin = poin akun yang login (satu-satunya sumber).
      points: currentUser ? currentUser.points || 0 : 0,
      // Kondisi penyimpanan browser. 'kosong' = jumlah data nol (mis. localStorage
      // dibersihkan manual), 'rusak' = data lama tidak bisa dibaca (lihat loadState).
      kondisi: state.kondisi || KONDISI.siap,
      jumlahData: (state.areas?.length || 0) + (state.devices?.length || 0) + (state.users?.length || 0),
      toast,
    }),
    [state, actions, derived, role, currentUser, toast],
  );
  return <SmartCtx.Provider value={value}>{children}</SmartCtx.Provider>;
}

export const metricLabel = (key, categories) => {
  for (const category of categories) {
    const found = category.metrics.find((m) => m.key === key);
    if (found) return found;
  }
  return { key, label: key, unit: '' };
};

export const formatRupiah = (value) =>
  'Rp' + Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
