// Sensor yang ditampilkan di tab "Per sensor" Monitoring. Pilihan pengguna dipakai
// bila masih ada di katalog; tanpa pilihan, halaman dibuka pada jenis sensor pertama
// yang benar-benar dimiliki alat, supaya yang pertama terlihat bukan halaman kosong.
export function pilihSensorAwal(sensorTypes = [], devices = [], pilihan = '') {
  if (sensorTypes.some(sensor => sensor.code === pilihan)) return pilihan;
  const dimiliki = new Set(devices.flatMap(device => (device?.type?.sensors || device?.sensors || []).map(sensor => sensor.code)));
  return (sensorTypes.find(sensor => dimiliki.has(sensor.code)) || sensorTypes[0])?.code || '';
}
