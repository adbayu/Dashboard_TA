// Pemindai literal nama ikon yang dipakai bersama tes halaman (frontendReview
// dan adminPages). Satu tempat supaya aturan pemindaian tidak menyimpang.

const NAMA = '[a-z0-9_-]+';

/**
 * Nama ikon literal di sumber JSX: `icon="x"`, `icon: 'x'`, `name="x"` (kecuali
 * pada <input>, yang nama fieldnya bukan ikon), literal di dalam `icon={...}`,
 * dan daftar konstanta `const IKON_... = ['a', 'b']`.
 */
export function namaIkonDalamSumber(source) {
  const literal = new RegExp(String.raw`\b(?:icon|name)(?:=\{?|:\s*)["'](${NAMA})["']`, 'g');
  const dalamKurung = [...source.matchAll(/\bicon=\{([^}]*)\}/g)]
    .flatMap((cocok) => [...cocok[1].matchAll(new RegExp(String.raw`["'](${NAMA})["']`, 'g'))].map((dalam) => dalam[1]));
  const daftarIkon = [...source.matchAll(/\bconst\s+[A-Z_]*IKON[A-Z_]*\s*=\s*\[([^\]]*)\]/g)]
    .flatMap((cocok) => [...cocok[1].matchAll(new RegExp(String.raw`["'](${NAMA})["']`, 'g'))].map((dalam) => dalam[1]));
  // `name` pada <input> adalah nama field formulir (mis. grup radio), bukan nama ikon.
  const bukanInput = (cocok) => !source.slice(source.lastIndexOf('<', cocok.index), cocok.index).startsWith('<input');
  const langsung = [...source.matchAll(literal)].filter(bukanInput).map((cocok) => cocok[1]);
  return [...langsung, ...dalamKurung, ...daftarIkon];
}

/**
 * Nama ikon di sumber yang tidak ada di ICON_MAP. Nama Material lama
 * (snake_case) maupun salah ketik (mis. 'wifi-of') sama-sama tidak ada di peta.
 */
export function namaIkonTidakDikenal(source, iconMap) {
  return namaIkonDalamSumber(source).filter((nama) => !Object.hasOwn(iconMap, nama));
}
