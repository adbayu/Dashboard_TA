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
  { id: 'hijau', warna: '#0f5238', warnaTeks: '#eafff4' },
  { id: 'teal', warna: '#0f766e', warnaTeks: '#eafff4' },
  { id: 'biru', warna: '#1e40af', warnaTeks: '#eafff4' },
  { id: 'ungu', warna: '#6d28d9', warnaTeks: '#f6f0ff' },
  { id: 'oranye', warna: '#b45309', warnaTeks: '#fff8ec' },
  { id: 'merah', warna: '#9f1239', warnaTeks: '#fff1f4' },
];

// Isi seed versi lama: foto orang dari Unsplash. Dipakai hanya untuk mengenali
// data localStorage yang sudah telanjur menyimpan nilai itu, lalu diganti avatar
// divalidasi oleh migrateState (R-23/R-38: jangan pakai foto orang sebagai
// identitas akun demo).
export const AVATAR_LAMA = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&q=80&w=250',
];

// Identitas akun demo = avatar divalidasi (inisial nama + warna), bukan foto orang.
// Bentuknya objek {id, warna, warnaTeks}; komponen memakai <Avatar> dari ui.jsx.
export const avatarKe = (seed, nama, email, warna) => ({
  id: `${seed}-${(email || nama || 'akun').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}`,
  warna,
  warnaTeks: '#eafff4',
});

export const AVATAR_AKUN = AVATAR_PILIHAN; // nama lama dipakai di beberapa halaman

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
    avatar: { id: 'U-001', warna: '#0f5238', warnaTeks: '#eafff4' },
  },
  {
    id: 'U-002', name: 'Siti Rahmawati', email: 'siti@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-02'], status: 'aktif', joinedAt: '2026-01-20', points: 980,
    phone: '0813-2233-4455', jabatan: 'Operator Growbed', bio: 'Fokus pada sayuran daun dan kualitas air.',
    avatar: { id: 'U-002', warna: '#0f766e', warnaTeks: '#eafff4' },
  },
  {
    id: 'U-003', name: 'Agus Priyanto', email: 'agus@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengguna', areaIds: ['AR-03'], status: 'nonaktif', joinedAt: '2026-02-02', points: 410,
    phone: '0857-9988-7766', jabatan: 'Operator Tandon', bio: 'Menangani tandon dan pompa.',
    avatar: { id: 'U-003', warna: '#b45309', warnaTeks: '#fff8ec' },
  },
  {
    id: 'U-004', name: 'Hendra Wicaksono', email: 'hendra@jagofarm.id', password: DEMO_PASSWORD,
    role: 'pengelola', areaIds: [], status: 'aktif', joinedAt: '2026-01-01', points: 0,
    phone: '0811-1122-3344', jabatan: 'Pengelola Farm', bio: 'Mengelola perangkat IoT dan data seluruh area.',
    avatar: { id: 'U-004', warna: '#1e40af', warnaTeks: '#eafff4' },
  },
];
