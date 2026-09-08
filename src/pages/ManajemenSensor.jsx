import React, { useState, useMemo } from 'react';
import CalibrationModal from '../components/CalibrationModal';
import AddSensorModal from '../components/AddSensorModal';

export default function ManajemenSensor({ sensors, onCalibrateSensor, onAddSensor }) {
  const [search, setSearch] = useState('');
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const filteredSensors = useMemo(() => {
    return sensors.filter((s) => {
      const matchSearch =
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.type.toLowerCase().includes(search.toLowerCase()) ||
        s.location.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || (filterType === 'needs_calib' ? s.status === 'needs_calibration' : true);
      return matchSearch && matchType;
    });
  }, [sensors, search, filterType]);

  const uncalibratedSensor = sensors.find((s) => s.status === 'needs_calibration');

  const handleStartCalibration = (sensor) => {
    setSelectedSensor(sensor);
    setShowCalibrationModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-primary">Manajemen Jaringan Sensor</h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1">
            Pantau kesehatan probe analitik, frekuensi kalibrasi, dan status transmisi LoRaWAN Sub-GHz rangkaian IoT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-label-md text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Tambah Sensor Baru</span>
          </button>
        </div>
      </div>

      {/* Bento Row: Summary & Alert Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Summary Card */}
        <div className="glass-card rounded-3xl p-6 md:col-span-2 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-label-md text-xs text-tertiary/70 uppercase tracking-wider font-bold">Ringkasan Sistem</h3>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-label-sm text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Optimal (14 Node Aktif)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-2 relative z-10">
              <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-2xl border border-white/80 dark:border-white/10 shadow-sm">
                <span className="material-symbols-outlined text-secondary text-3xl mb-1 block fill">water_drop</span>
                <p className="font-headline text-2xl font-black text-on-surface">{sensors.length}</p>
                <p className="font-label-sm text-xs text-outline mt-0.5">Node Terdaftar</p>
              </div>

              <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-2xl border border-white/80 dark:border-white/10 shadow-sm">
                <span className="material-symbols-outlined text-amber-600 text-3xl mb-1 block fill">warning</span>
                <p className="font-headline text-2xl font-black text-amber-700 dark:text-amber-300">
                  {sensors.filter(s => s.status === 'needs_calibration').length}
                </p>
                <p className="font-label-sm text-xs text-outline mt-0.5">Perlu Kalibrasi</p>
              </div>

              <div className="text-center p-4 bg-white/60 dark:bg-white/5 rounded-2xl border border-white/80 dark:border-white/10 shadow-sm">
                <span className="material-symbols-outlined text-tertiary text-3xl mb-1 block fill">battery_charging_full</span>
                <p className="font-headline text-2xl font-black text-on-surface">96%</p>
                <p className="font-label-sm text-xs text-outline mt-0.5">Kesehatan Rata-rata</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Calibration Action Card */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between border-l-4 border-error/80 md:col-span-1 relative overflow-hidden">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="p-2.5 bg-error/10 text-error rounded-2xl shrink-0">
              <span className="material-symbols-outlined text-2xl fill">science</span>
            </div>
            <div>
              <h3 className="font-label-md text-sm font-bold text-on-surface">Peringatan Kalibrasi</h3>
              <p className="text-xs text-outline mt-1 leading-relaxed">
                Sensor <span className="font-bold text-error">{uncalibratedSensor ? uncalibratedSensor.id : 'Semua sensor'}</span> membaca nilai tidak menentu. Kalibrasi ulang disarankan agar dosis nutrisi presisi.
              </p>
            </div>
          </div>

          <div className="mt-auto pt-2">
            <button
              onClick={() => handleStartCalibration(uncalibratedSensor || sensors[0])}
              className="w-full py-2.5 bg-white dark:bg-white/10 border-2 border-error text-error hover:bg-error hover:text-white rounded-xl font-label-md text-xs font-bold transition-all shadow-sm"
            >
              Mulai Kalibrasi Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Inventory Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-sm">
        {/* Table Filter & Search Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/30 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">device_hub</span>
            <h3 className="font-headline-md text-base font-bold text-on-surface">Detail Jaringan Rangkaian Sensor</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline/70 text-base">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID, tipe, atau lokasi..."
                className="pl-9 pr-4 py-1.5 bg-white/60 dark:bg-white/10 border border-outline-variant/40 rounded-full text-xs text-on-surface w-48 sm:w-64 focus:outline-none focus:border-primary transition-all placeholder:text-outline/70"
              />
            </div>

            <button
              onClick={() => setFilterType(filterType === 'all' ? 'needs_calib' : 'all')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                filterType === 'needs_calib'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white/60 dark:bg-white/10 text-outline border-outline-variant/40'
              }`}
            >
              {filterType === 'needs_calib' ? 'Filter: Perlu Kalibrasi' : 'Tampilkan Semua'}
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/40 dark:bg-white/5 text-tertiary/70 uppercase tracking-wider font-bold">
                <th className="p-4">ID Sensor</th>
                <th className="p-4">Tipe Sensor</th>
                <th className="p-4">Lokasi / Zona</th>
                <th className="p-4">Nilai Terakhir</th>
                <th className="p-4">Baterai & Sinyal</th>
                <th className="p-4">Kalibrasi Terakhir</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredSensors.map((sensor) => (
                <tr key={sensor.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono font-bold text-primary">{sensor.id}</td>
                  <td className="p-4 font-semibold text-on-surface">{sensor.type}</td>
                  <td className="p-4 text-outline font-medium">{sensor.location}</td>
                  <td className="p-4 font-mono font-bold text-on-surface">{sensor.lastValue}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-outline">battery_charging_full</span>
                      <span className={`font-semibold ${sensor.battery < 30 ? 'text-error' : 'text-on-surface'}`}>
                        {sensor.battery}%
                      </span>
                      <span className="text-[10px] text-outline">({sensor.signal})</span>
                    </div>
                  </td>
                  <td className="p-4 text-outline font-medium">{sensor.lastCalib}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sensor.status === 'needs_calibration'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          : sensor.status === 'warning'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          sensor.status === 'needs_calibration'
                            ? 'bg-amber-600'
                            : sensor.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      ></span>
                      {sensor.status === 'needs_calibration' ? 'Perlu Kalibrasi' : sensor.status === 'warning' ? 'Waspada' : 'Optimal'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleStartCalibration(sensor)}
                      className="px-3 py-1 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-primary hover:text-white border border-outline-variant/40 text-[11px] font-bold text-primary transition-all shadow-sm"
                    >
                      Kalibrasi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        sensor={selectedSensor}
        onCalibrate={onCalibrateSensor}
      />

      <AddSensorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddSensor}
      />
    </div>
  );
}
