const AREA_FEATURES = [
  { id: 'sensor', label: 'Sensor', icon: 'monitoring' },
  { id: 'kematian', label: 'Kematian ikan', icon: 'heart_broken', pondOnly: true },
  { id: 'pembersihan', label: 'Pembersihan', icon: 'cleaning_services', pondOnly: true },
  { id: 'hpp', label: 'HPP', icon: 'payments' },
  { id: 'pemantauan', label: 'Pemantauan', icon: 'edit_note' },
  { id: 'riwayat', label: 'Riwayat', icon: 'history' },
  { id: 'panen', label: 'Panen', icon: 'agriculture' },
  { id: 'perangkat', label: 'Perangkat', icon: 'sensors' },
];

export function getAreaFeatures(isPond) {
  return AREA_FEATURES.filter((feature) => !feature.pondOnly || isPond);
}
