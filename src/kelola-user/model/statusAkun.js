import { STATUS_AKUN } from '../data/seed.js';

// Keping status akun (teks + ikon, tidak pernah hanya warna), dipakai Kelola
// pengguna dan Dashboard pengelola.
const NADA_STATUS_AKUN = {
  aktif: { tone: 'ok', icon: 'circle-check' },
  menunggu: { tone: 'warn', icon: 'clock' },
  nonaktif: { tone: 'muted', icon: 'circle-minus' },
};

export function pillStatusAkun(status) {
  const nada = NADA_STATUS_AKUN[status] || { tone: 'muted', icon: 'circle-minus' };
  return { ...nada, text: STATUS_AKUN[status] || status || 'Terdaftar' };
}
