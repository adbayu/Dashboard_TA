// Teks misi dan badge yang tampil ke pengguna. Data seed menyimpan sasaran misi
// sebagai id aksi berbahasa Inggris ('feed', 'clean-or-heal'); di layar harus
// bahasa Indonesia.
const KATA_SASARAN = {
  feed: 'beri pakan',
  clean: 'bersihkan',
  heal: 'rawat',
  care: 'rawat',
  or: 'atau',
};

/**
 * Sasaran misi dari id aksi, mis. 'clean-or-heal' menjadi 'bersihkan atau rawat'.
 * Kata yang tidak dikenal (sasaran yang sudah berbahasa Indonesia, seperti
 * 'catat-minimal-2-parameter') hanya diganti tanda hubungnya dengan spasi.
 */
export function labelSasaranMisi(target) {
  return String(target ?? '')
    .split('-')
    .filter(Boolean)
    .map((kata) => KATA_SASARAN[kata] ?? kata)
    .join(' ');
}

/** Ejaan "poin" untuk teks lama yang tersimpan dengan kata "point". */
export function ejaanPoin(teks) {
  return typeof teks === 'string' ? teks.replace(/\bpoints?\b/gi, (kata) => (kata[0] === 'P' ? 'Poin' : 'poin')) : teks;
}
