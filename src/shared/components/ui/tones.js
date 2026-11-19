// Peta nada (tone) dan kelas bersama untuk komponen di folder ini.
// Semua warna lewat kelas token Tailwind (lihat tailwind.config.js); tidak ada
// hex atau kelas palet mentah di sini.

/** Lima nada status resmi design system. */
export const TONES = ['ok', 'warn', 'bad', 'info', 'muted'];

// Nama nada lama yang masih dikirim halaman yang belum dimigrasi (Fase B).
const ALIAS_TONE = {
  brand: 'info',
  success: 'ok',
  error: 'bad',
  danger: 'bad',
  netral: 'muted',
  neutral: 'muted',
};

/** Ubah nama nada apa pun (lama atau baru) ke salah satu dari TONES. */
export function normalizeTone(tone, fallback = 'muted') {
  if (TONES.includes(tone)) return tone;
  return ALIAS_TONE[tone] || fallback;
}

/** Warna teks status di atas `surface` atau `*-bg`. */
export const TONE_TEXT = {
  ok: 'text-ok-fg',
  warn: 'text-warn-fg',
  bad: 'text-bad-fg',
  info: 'text-info-fg',
  muted: 'text-text-2',
};

/** Latar keping status versi `solid`. */
export const TONE_BG = {
  ok: 'bg-ok-bg',
  warn: 'bg-warn-bg',
  bad: 'bg-bad-bg',
  info: 'bg-info-bg',
  muted: 'bg-surface-2',
};

/** Ikon bawaan per nada, dipakai Alert bila `icon` tidak diisi. */
export const TONE_ICON = {
  ok: 'circle-check',
  warn: 'triangle-alert',
  bad: 'circle-alert',
  info: 'info',
  muted: 'info',
};

export const STATUS_TONE = { online: 'ok', warning: 'warn', maintenance: 'info', offline: 'bad' };
export const STATUS_LABEL = { online: 'Terhubung', warning: 'Perlu perhatian', maintenance: 'Perawatan', offline: 'Tidak terhubung' };

/** Cincin fokus keyboard: garis 2 px `focus`, jarak 2 px, di setiap kontrol. */
export const FOKUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface';
