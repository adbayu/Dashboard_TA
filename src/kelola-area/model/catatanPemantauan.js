// Catatan pemantauan manual memberi poin, jadi minimal satu parameter terukur
// (pH, suhu, atau TDS) wajib diisi. Teks catatan saja tidak cukup.
export const GALAT_TANPA_PARAMETER = 'Isi minimal satu parameter: pH, suhu air, atau TDS.';

const PARAMETER = ['ph', 'temp', 'tds'];

export function buatEntriPemantauan(form, { areaId, areaName, by }) {
  const entry = { areaId, areaName, by };
  for (const key of PARAMETER) {
    const mentah = String(form?.[key] ?? '').trim();
    if (mentah === '') continue;
    const nilai = Number(mentah);
    if (Number.isFinite(nilai)) entry[key] = nilai;
  }
  if (!PARAMETER.some((key) => key in entry)) return { galat: GALAT_TANPA_PARAMETER };
  entry.note = form?.note ?? '';
  return { entry };
}
