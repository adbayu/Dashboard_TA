// ── Sistem Point & Gamifikasi ─────────────────────────────────────────────────
export const SEED_POINT_RULES = [
  { id: 'R-1', activity: 'Isi data HPP area', points: 25, daily: 2, active: true },
  { id: 'R-2', activity: 'Catat pemantauan kolam', points: 15, daily: 4, active: true },
  { id: 'R-3', activity: 'Tuntaskan misi harian', points: 40, daily: 1, active: true },
  { id: 'R-4', activity: 'Pelihara virtual pet', points: 10, daily: 3, active: true },
  { id: 'R-5', activity: 'Laporkan anomali sensor', points: 30, daily: 5, active: true },
  { id: 'R-6', activity: 'Panen tercatat', points: 100, daily: 1, active: true },
  { id: 'R-7', activity: 'Catat kematian ikan', points: 5, daily: 1, active: true },
];

export const SEED_BADGES = [
  { id: 'B-1', name: 'Peternak Tekun', icon: 'potted_plant', minPoints: 200, desc: 'Kumpulkan 200 point' },
  { id: 'B-2', name: 'Ahli Kualitas Air', icon: 'water_drop', minPoints: 750, desc: 'Kumpulkan 750 point' },
  { id: 'B-3', name: 'Sensor Whisperer', icon: 'sensors', minPoints: 1500, desc: 'Kumpulkan 1.500 point' },
  { id: 'B-4', name: 'Master Akuaponik', icon: 'emoji_events', minPoints: 3000, desc: 'Kumpulkan 3.000 point' },
];

export const SEED_MISSIONS = [
  { id: 'M-1', title: 'Cek kualitas air pagi', target: 'catat-minimal-2-parameter', activityCode: 'water-check', done: false },
  { id: 'M-2', title: 'Beri pakan virtual pet', target: 'feed', activityCode: 'feed', done: false },
  { id: 'M-3', title: 'Bersihkan atau rawat pet', target: 'clean-or-heal', activityCode: 'care', done: false },
];

// Catatan: TIDAK ADA const SEED_LEADERBOARD di sini. Papan peringkat diturunkan
// dari SEED_USERS (lihat derived.leaderboard di SmartStore). Daftar terpisah dulu
// membuat poin hasil aktivitas pengguna tidak muncul di papan peringkat pengelola,
// dan memuat akun hantu 'Rina Kartika' yang tidak terdaftar sebagai pengguna.
