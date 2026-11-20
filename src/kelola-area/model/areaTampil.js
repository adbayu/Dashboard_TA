// Label, ikon, dan ringkasan tampilan area yang dipakai bersama halaman
// pengguna dan pengelola.

import { formatSensorNumber } from '../../utils/iotPresentation.js';

export const LABEL_JENIS_AREA = { kolam: 'Kolam ikan', growbed: 'Growbed sayur', tandon: 'Tandon nutrisi' };
const IKON_JENIS_AREA = { kolam: 'fish', growbed: 'sprout', tandon: 'droplet' };

export const labelJenisArea = (jenis) => LABEL_JENIS_AREA[jenis] || jenis || 'Area';
export const ikonJenisArea = (jenis) => IKON_JENIS_AREA[jenis] || 'waves';

/**
 * Nilai pembacaan atau ambang sensor dengan jumlah desimal tetap milik sensornya
 * (METRIC_META.precision: pH 6,80, suhu 25,0, TDS 780), sama dengan SensorReading.
 * Kosong (null, undefined, '') menjadi titik tengah, bukan 0.
 */
export function formatNilaiSensor(nilai, desimal) {
  if (nilai === null || nilai === undefined || nilai === '') return '·';
  return formatSensorNumber(nilai, desimal);
}

/** Angka gaya Indonesia tanpa nol berlebih (6,5 bukan 6,50); kosong menjadi titik tengah. */
export function formatAngka(nilai, maksDesimal = 3) {
  if (nilai === null || nilai === undefined || nilai === '' || !Number.isFinite(Number(nilai))) return '·';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: maksDesimal }).format(Number(nilai));
}

/**
 * Ringkasan status alat satu area sebagai keping teks + ikon (tidak pernah
 * hanya warna). Tanpa alat: satu keping netral. Semua online: satu keping ok.
 */
export function ringkasStatusAlat(devices = []) {
  if (devices.length === 0) return [{ tone: 'muted', icon: 'circle-minus', text: 'Belum ada alat' }];
  const jumlah = (status) => devices.filter((d) => d.status === status).length;
  const hasil = [];
  if (jumlah('offline')) hasil.push({ tone: 'bad', icon: 'wifi-off', text: `${jumlah('offline')} alat tidak terhubung` });
  if (jumlah('warning')) hasil.push({ tone: 'warn', icon: 'triangle-alert', text: `${jumlah('warning')} alat perlu perhatian` });
  if (jumlah('maintenance')) hasil.push({ tone: 'info', icon: 'wrench', text: `${jumlah('maintenance')} alat dalam perawatan` });
  if (hasil.length === 0) hasil.push({ tone: 'ok', icon: 'wifi', text: 'Semua alat terhubung' });
  return hasil;
}
