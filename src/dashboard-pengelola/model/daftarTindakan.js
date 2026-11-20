import { METRIC_META } from '../../shared/store/SmartStore.jsx';
import { STATUS_LABEL } from '../../shared/components/ui/tones.js';
import { formatSensorNumber } from '../../utils/iotPresentation.js';

// Masalah alat menurut status: selalu teks + ikon, tidak pernah hanya warna.
const MASALAH_ALAT = {
  offline: { tone: 'bad', icon: 'wifi-off', saran: 'Cek daya, kabel, dan jangkauan sinyal.' },
  warning: { tone: 'warn', icon: 'triangle-alert', saran: 'Periksa pembacaan dan kondisi alat.' },
  maintenance: { tone: 'info', icon: 'wrench', saran: 'Selesaikan perawatan lalu aktifkan kembali.' },
};
// Status lain yang bukan `online` (mis. `stale` atau status baru dari server)
// tetap dianggap masalah alat, sama dengan activeAlerts di store.
const MASALAH_LAIN = { tone: 'warn', icon: 'triangle-alert', saran: 'Periksa koneksi dan kondisi alat.' };
const URUTAN_STATUS = ['offline', 'warning', 'maintenance'];

const urutanStatus = (status) => {
  const indeks = URUTAN_STATUS.indexOf(status);
  return indeks === -1 ? URUTAN_STATUS.length : indeks;
};

/**
 * Daftar "Perlu ditangani": satu baris per masalah, urut dari yang paling
 * mendesak. Fungsi murni supaya urutan dan isinya bisa diuji tanpa store.
 * `luarBatas`: [{ device, area, key, value, ambang, posisi }] dari bacaan sensor.
 */
export function daftarTindakan({ devices = [], areas = [], users = [], kematianHariIni = [], luarBatas = [] }) {
  const namaArea = (id) => areas.find((a) => a.id === id)?.name;
  const hasil = [];

  // Sort stabil: status yang sama tetap dalam urutan data aslinya.
  const bermasalah = devices
    .filter((d) => d.status !== 'online')
    .sort((a, b) => urutanStatus(a.status) - urutanStatus(b.status));
  for (const device of bermasalah) {
    const info = MASALAH_ALAT[device.status] || MASALAH_LAIN;
    const baterai = typeof device.battery === 'number' ? ` Baterai ${device.battery}%.` : '';
    hasil.push({
      id: `alat-${device.id}`,
      masalah: STATUS_LABEL[device.status] || String(device.status || 'Status tidak diketahui'),
      tone: info.tone,
      icon: info.icon,
      kode: device.code,
      judul: device.name,
      rincian: `${namaArea(device.areaId) || 'Belum ditempatkan'}.${baterai} ${info.saran}`,
      to: '/admin/iot',
      aksi: 'Periksa alat',
    });
  }

  for (const b of luarBatas) {
    const meta = METRIC_META[b.key];
    const f = (n) => formatSensorNumber(n, meta.precision);
    hasil.push({
      id: `batas-${b.device.id}`,
      masalah: 'Di luar batas',
      tone: 'warn',
      icon: 'triangle-alert',
      judul: `${meta.label} ${b.area?.name || b.device.code} ${f(b.value)} ${meta.unit}`,
      rincian: `Batas area ${f(b.ambang[0])}–${f(b.ambang[1])} ${meta.unit}, nilai ${b.posisi === 'atas' ? 'di atas' : 'di bawah'} batas.`,
      to: '/monitoring',
      aksi: 'Lihat monitoring',
    });
  }

  for (const row of kematianHariIni) {
    hasil.push({
      id: `mati-${row.id}`,
      masalah: 'Ikan mati',
      tone: 'warn',
      icon: 'fish',
      judul: `${namaArea(row.areaId) || row.areaId}, ${row.jumlah} ekor hari ini`,
      rincian: row.catatan ? `Catatan pengguna: ${row.catatan}` : 'Dicatat manual oleh pengguna atau pengelola.',
      to: '/admin/area',
      aksi: 'Buka area',
    });
  }

  for (const device of devices.filter((d) => !d.areaId)) {
    hasil.push({
      id: `tanpa-area-${device.id}`,
      masalah: 'Belum ditempatkan',
      tone: 'info',
      icon: 'inbox',
      kode: device.code,
      judul: device.name,
      rincian: 'Alat sudah terdaftar tetapi belum dipasang ke area mana pun.',
      to: '/admin/area',
      aksi: 'Tempatkan ke area',
    });
  }

  for (const user of users.filter((u) => u.status === 'menunggu')) {
    hasil.push({
      id: `akun-${user.id}`,
      masalah: 'Menunggu persetujuan',
      tone: 'info',
      icon: 'clock',
      judul: `${user.name}, akun Pengelola`,
      rincian: `Mengajukan akun pada ${user.joinedAt}. Belum bisa masuk sebelum disetujui.`,
      to: '/admin/pengguna',
      aksi: 'Tinjau pengajuan',
    });
  }

  return hasil;
}
