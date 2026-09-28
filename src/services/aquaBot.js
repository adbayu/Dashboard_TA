import { KNOWLEDGE } from '../data/seed';

// ── Tokenisasi ────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'apa','itu','yang','dan','atau','untuk','dengan','bagaimana','cara','berapa','apakah','di','ke','dari','pada','saya','aku',
  'adalah','bisa','boleh','harus','kah','nya','ini','kok','kenapa','mengapa','gimana','kalau','jika','bila','tolong','mohon',
  'the','a','an','is','are','how','what','of','to','in','on','my',
]);

// Token pendek yang justru penting secara teknis — jangan dibuang.
// 'do', 'ec', 'uv', 'rh' tetap di sini walau SENSOR-nya belum terpasang: pertanyaan
// pengetahuan soal istilah itu tetap harus terjawab (jawabannya sudah menyebut
// bahwa alatnya belum ada di farm ini). Menghapusnya membuat "berapa EC ideal?"
// tidak dikenali sama sekali — regresi yang harus dihindari.
const SHORT_TERMS = new Set(['ph', 'do', 'ec', 'tds', 'uv', 'hpp', 'iot', 'xp', 'nh3', 'no2', 'no3', 'rh', 'v']);

const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');

const tokenize = (text) =>
  normalize(text)
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter((word) => word && !STOPWORDS.has(word) && (word.length > 2 || SHORT_TERMS.has(word)));

// ── Kata kunci inti per topik ─────────────────────────────────────────────────
// Tag inti = penentu topik; tag pendukung = sinyal tambahan berbobot kecil.
const CORE = [
  { core: ['ph', 'keasaman'], support: ['asam', 'basa', 'derajat'] },
  { core: ['amonia', 'nh3', 'nitrit', 'nitrat', 'nitrifikasi'], support: ['siklus nitrogen', 'kotoran', 'biofilter'] },
  { core: ['oksigen', 'do', 'aerasi', 'aerator'], support: ['nafas', 'subuh', 'venturi'] },
  { core: ['suhu', 'temperatur'], support: ['panas', 'dingin', 'hujan'] },
  { core: ['pakan', 'feed', 'overfeeding'], support: ['pelet', 'nafsu makan'] },
  { core: ['kangkung', 'pakcoy', 'selada', 'sawi', 'sayur', 'tanaman'], support: ['daun', 'panen', 'growbed'] },
  { core: ['ec', 'tds', 'nutrisi', 'ppm'], support: ['konduktivitas', 'kepekatan'] },
  { core: ['hpp', 'biaya', 'laba', 'untung', 'margin'], support: ['harga pokok', 'keuntungan', 'modal'] },
  { core: ['iot', 'sensor', 'perangkat', 'kalibrasi', 'alat'], support: ['probe', 'baterai', 'firmware'] },
  { core: ['aquaponik', 'definisi'], support: ['simbiosis', 'cara kerja', 'hemat air'] },
  { core: ['hama', 'penyakit', 'jamur'], support: ['kutu', 'daun kuning', 'akar busuk'] },
  { core: ['v-pet', 'virtual pet', 'gamifikasi', 'point', 'level', 'badge'], support: ['misi', 'pelihara', 'peringkat'] },
];

// Dokumen definisi "apa itu aquaponik" diberi bobot lebih rendah supaya tidak menyerobot
// pertanyaan teknis yang kebetulan menyebut kata "aquaponik".
const DOC_WEIGHT = { 9: 0.5 };

const MIN_SCORE = 2;

const overlaps = (tagWords, askWords) =>
  tagWords.some((tagWord) => askWords.some((askWord) => askWord === tagWord || askWord.startsWith(tagWord) || tagWord.startsWith(askWord)));

/**
 * Jawab pertanyaan seputar aquaponik dari basis pengetahuan lokal.
 * Mengembalikan { answer, sources, confidence, matched }.
 */
export function askAquaponik(question, context = {}) {
  const askWords = tokenize(question);
  if (!askWords.length) {
    return {
      answer: 'Tulis pertanyaan yang lebih spesifik ya, misalnya "berapa pH ideal air kolam?" atau "takaran pakan ikan nila".',
      sources: [],
      confidence: 0,
    };
  }

  const scored = KNOWLEDGE.map((doc, index) => {
    const topic = CORE[index] || { core: [], support: [] };
    const weight = DOC_WEIGHT[index] ?? 1;
    let score = 0;
    const matched = [];

    for (const phrase of topic.core) {
      if (overlaps(tokenize(phrase).length ? tokenize(phrase) : [phrase], askWords)) {
        // Istilah teknis singkat (ph, ec, tds, hpp) lebih spesifik daripada nama sayur,
        // sehingga diberi bobot lebih agar tidak kalah oleh dokumen topik umum.
        score += SHORT_TERMS.has(phrase) ? 9 : 6;
        matched.push(phrase);
      }
    }
    for (const phrase of topic.support) {
      if (overlaps(tokenize(phrase).length ? tokenize(phrase) : [phrase], askWords)) {
        score += 2;
        matched.push(phrase);
      }
    }
    // Sinyal lemah dari isi jawaban, hanya sebagai pemecah seri.
    for (const word of askWords) {
      if (doc.answer.toLowerCase().includes(word)) score += 0.3;
    }

    return { doc, index, score: score * weight, matched, coreHit: score > 0 && matched.some((m) => topic.core.includes(m)) };
  })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  // Bila tidak ada kata kunci inti yang cocok, jujur menyatakan tidak tahu.
  if (!best || best.score < MIN_SCORE || !best.coreHit) {
    return {
      answer:
        'Pertanyaan ini belum ada di basis pengetahuan demo saya. Coba tanyakan soal pH, amonia/nitrat, suhu air, pakan, jenis sayur, TDS, HPP, sensor IoT, hama, atau cara kerja aquaponik.',
      sources: [],
      confidence: 0,
    };
  }

  let answer = best.doc.answer;
  const note = buildContextNote(question, context);
  if (note) answer += `\n\n${note}`;

  const confidence = Math.min(0.95, 0.55 + best.score / 30);
  return { answer, sources: [...new Set(best.matched)].slice(0, 4), confidence };
}

function buildContextNote(question, context) {
  const { area, devices = [] } = context;
  if (!area) return '';
  const q = normalize(question);
  const wantsAir = ['ph', 'amonia', 'oksigen', 'suhu', 'air', 'kolam', 'tds', 'kualitas', 'pakan'].some((key) => q.includes(key));
  if (!wantsAir) return '';

  const read = (key) => devices.find((device) => device.metric?.key === key)?.metric.value ?? null;
  const ph = read('ph');
  const temp = read('temp');
  const tds = read('tds');

  const notes = [];
  if (ph != null) {
    const state = ph >= 6.5 && ph <= 7.5 ? 'ideal' : ph < 6.2 || ph > 7.8 ? 'di luar ambang aman' : 'mulai menyimpang';
    notes.push(`pH terbaca ${ph} (${state})`);
  }
  if (temp != null) notes.push(`suhu air ${temp} °C`);
  if (tds != null) notes.push(`TDS ${tds} ppm`);
  if (!notes.length) return '';

  return `Sesuai pembacaan sensor ${area.name} saat ini: ${notes.join(', ')}. Bandingkan dengan angka ideal di atas sebelum mengambil tindakan.`;
}

export const CHAT_GREETING = {
  role: 'bot',
  text:
    'Halo! Saya asisten aquaponik JagoFarm. Tanyakan apa saja soal kualitas air, pakan ikan, jenis sayur, sensor IoT, sampai cara menghitung HPP kolam. Jawaban saya berbasis basis pengetahuan lokal, bukan hasil mengarang.',
  sources: [],
};
