import React, { useState } from 'react';

export default function AddSensorModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    id: `SN-${Math.floor(100 + Math.random() * 900)}`,
    type: 'Sensor pH Air',
    location: 'Kolam Bioflok Nila 04',
    protocol: 'LoRaWAN Sub-GHz',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      id: formData.id,
      type: formData.type,
      location: formData.location,
      lastValue: formData.type.includes('pH') ? '6.8 pH' : formData.type.includes('EC') ? '1.8 mS/cm' : '26.0 °C',
      battery: 100,
      signal: '98%',
      lastCalib: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'optimal',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/80 dark:border-white/10">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl fill">sensors</span>
            <h3 className="font-headline-md text-lg font-bold text-on-surface">Tambah Node Sensor Baru</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-variant/50 flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">ID Sensor Telemetri</label>
            <input
              type="text"
              required
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 focus:outline-none focus:border-primary font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">Tipe Sensor</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-[#252b28] border border-outline-variant/40 focus:outline-none focus:border-primary text-on-surface"
            >
              <option value="Sensor pH Air">Sensor pH Air</option>
              <option value="Konduktivitas EC/TDS">Konduktivitas EC/TDS</option>
              <option value="Oksigen Terlarut (DO)">Oksigen Terlarut (DO)</option>
              <option value="Kelembaban Substrat">Kelembaban Substrat</option>
              <option value="Suhu Air Celup">Suhu Air Celup</option>
              <option value="Stasiun Meteorologi">Stasiun Meteorologi</option>
            </select>
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">Lokasi Pemasangan</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-white/10 border border-outline-variant/40 focus:outline-none focus:border-primary text-on-surface"
              placeholder="Contoh: Kolam Bioflok Nila 04"
            />
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">Protokol Transmisi</label>
            <select
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
              className="w-full py-2 px-3 rounded-xl bg-white/60 dark:bg-[#252b28] border border-outline-variant/40 focus:outline-none focus:border-primary text-on-surface"
            >
              <option value="LoRaWAN Sub-GHz">LoRaWAN Sub-GHz (Jarak Jauh)</option>
              <option value="MQTT via WiFi 2.4GHz">MQTT via WiFi 2.4GHz</option>
              <option value="ESP-NOW Mesh">ESP-NOW Mesh</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-outline hover:text-on-surface font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow-md transition-all"
            >
              Daftarkan Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
